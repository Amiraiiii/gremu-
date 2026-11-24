import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { REGIONS } from "@/config/shop";
import { DEMO_MODELS } from "@/components/home/vehicle-data";
import { getDb, schema } from "@/lib/db";

/**
 * Account data access. Every query takes the signed-in user's id from the server session and
 * filters on it — a customer can only ever read or change their own rows.
 */
export const MAX_VEHICLES = 10;
export const MAX_ADDRESSES = 10;

const phone = z.string().trim().regex(/^\+?[0-9\s\-()]{7,24}$/, "phone");
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "name").max(80, "name"),
  phone: phone.optional().or(z.literal("")).transform((v) => v || null),
  preferredLocale: z.enum(["ru", "uz"]),
  notifyOrderEmail: z.boolean(),
  marketingOptIn: z.boolean(),
});

export const vehicleSchema = z
  .object({
    make: z.enum(["hyundai", "kia"]),
    model: z.string().trim().min(1).max(40),
    year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
    generation: optText(40),
    engine: optText(40),
    trim: optText(40),
  })
  .refine((v) => (DEMO_MODELS[v.make] as readonly string[]).includes(v.model), { message: "model", path: ["model"] });

const regionCodes = REGIONS.map((r) => r.code) as [string, ...string[]];
export const addressSchema = z.object({
  label: optText(40),
  recipientName: z.string().trim().min(2).max(80),
  phone,
  region: z.enum(regionCodes),
  city: z.string().trim().min(2).max(80),
  addressLine: z.string().trim().min(3).max(200),
  postalCode: optText(12),
  isDefault: z.boolean(),
});

export async function updateProfile(userId: string, data: z.infer<typeof profileSchema>) {
  const db = await getDb();
  await db.update(schema.users).set({ ...data, updatedAt: new Date() }).where(eq(schema.users.id, userId));
}

// ---------- vehicles
export async function listVehicles(userId: string) {
  const db = await getDb();
  return db.select().from(schema.userVehicles).where(eq(schema.userVehicles.userId, userId)).orderBy(desc(schema.userVehicles.createdAt));
}

export async function addVehicle(userId: string, data: z.infer<typeof vehicleSchema>): Promise<"ok" | "limit"> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.userVehicles).where(eq(schema.userVehicles.userId, userId));
  if (n >= MAX_VEHICLES) return "limit";
  await db.insert(schema.userVehicles).values({ userId, ...data });
  return "ok";
}

export async function removeVehicle(userId: string, id: string) {
  const db = await getDb();
  await db.delete(schema.userVehicles).where(and(eq(schema.userVehicles.id, id), eq(schema.userVehicles.userId, userId)));
}

// ---------- addresses
export async function listAddresses(userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.userAddresses)
    .where(eq(schema.userAddresses.userId, userId))
    .orderBy(desc(schema.userAddresses.isDefault), asc(schema.userAddresses.createdAt));
}

export async function addAddress(userId: string, data: z.infer<typeof addressSchema>): Promise<"ok" | "limit"> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(schema.userAddresses).where(eq(schema.userAddresses.userId, userId));
    if (n >= MAX_ADDRESSES) return "limit" as const;
    const isDefault = data.isDefault || n === 0; // the first address is the default one
    if (isDefault) await tx.update(schema.userAddresses).set({ isDefault: false }).where(eq(schema.userAddresses.userId, userId));
    await tx.insert(schema.userAddresses).values({ userId, ...data, isDefault });
    return "ok" as const;
  });
}

export async function setDefaultAddress(userId: string, id: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const own = await tx.query.userAddresses.findFirst({
      where: and(eq(schema.userAddresses.id, id), eq(schema.userAddresses.userId, userId)),
    });
    if (!own) return;
    await tx.update(schema.userAddresses).set({ isDefault: false }).where(eq(schema.userAddresses.userId, userId));
    await tx.update(schema.userAddresses).set({ isDefault: true, updatedAt: new Date() }).where(eq(schema.userAddresses.id, id));
  });
}

export async function removeAddress(userId: string, id: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [gone] = await tx
      .delete(schema.userAddresses)
      .where(and(eq(schema.userAddresses.id, id), eq(schema.userAddresses.userId, userId)))
      .returning();
    if (!gone?.isDefault) return;
    // Promote the oldest remaining address so there is always a default.
    const next = await tx.query.userAddresses.findFirst({
      where: eq(schema.userAddresses.userId, userId),
      orderBy: asc(schema.userAddresses.createdAt),
    });
    if (next) await tx.update(schema.userAddresses).set({ isDefault: true }).where(eq(schema.userAddresses.id, next.id));
  });
}

// ---------- orders
export async function listUserOrders(userId: string, limit = 50) {
  const db = await getDb();
  return db
    .select({
      orderNumber: schema.orders.orderNumber,
      createdAt: schema.orders.createdAt,
      totalMinor: schema.orders.totalMinor,
      status: schema.orders.status,
      paymentStatus: schema.orders.paymentStatus,
      paymentMethod: schema.orders.paymentMethod,
    })
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(limit);
}

/** Owner check: an order number belonging to someone else returns null, same as a missing one. */
export async function getUserOrder(userId: string, number: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.orderNumber, number), eq(schema.orders.userId, userId)),
  });
  if (!order) return null;
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const history = await db
    .select()
    .from(schema.orderStatusHistory)
    .where(eq(schema.orderStatusHistory.orderId, order.id))
    .orderBy(asc(schema.orderStatusHistory.createdAt));
  return { order, items, history };
}
