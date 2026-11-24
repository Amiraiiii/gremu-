"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endAllUserSessions, getCurrentUser } from "@/lib/auth/user";
import {
  addAddress,
  addVehicle,
  addressSchema,
  profileSchema,
  removeAddress,
  removeVehicle,
  setDefaultAddress,
  updateProfile,
  vehicleSchema,
} from "@/features/account/service";

/**
 * Account server actions. Each one re-reads the session on the server; the user id never
 * comes from the form, so a customer cannot act on someone else's data.
 */
export type FormState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const loc = (form: FormData) => (form.get("locale") === "uz" ? "uz" : "ru");
const str = (form: FormData, k: string) => String(form.get(k) ?? "");
const id = z.string().uuid();

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

async function userOrLogin(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/account/login`);
  return user;
}

export async function saveProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await userOrLogin(loc(form));
  const parsed = profileSchema.safeParse({
    fullName: str(form, "fullName"),
    phone: str(form, "phone"),
    preferredLocale: str(form, "preferredLocale"),
    notifyOrderEmail: form.get("notifyOrderEmail") === "on",
    marketingOptIn: form.get("marketingOptIn") === "on",
  });
  if (!parsed.success) return { error: "invalid", fields: fieldErrors(parsed.error) };
  await updateProfile(user.id, parsed.data);
  revalidatePath(`/${loc(form)}/account`, "layout");
  return { ok: true };
}

export async function logoutEverywhereAction(form: FormData) {
  const locale = loc(form);
  const user = await getCurrentUser();
  if (user) await endAllUserSessions(user.id);
  redirect(`/${locale}`);
}

export async function addVehicleAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = loc(form);
  const user = await userOrLogin(locale);
  const parsed = vehicleSchema.safeParse({
    make: str(form, "make"),
    model: str(form, "model"),
    year: str(form, "year"),
    generation: str(form, "generation"),
    engine: str(form, "engine"),
    trim: str(form, "trim"),
  });
  if (!parsed.success) return { error: "invalid", fields: fieldErrors(parsed.error) };
  const res = await addVehicle(user.id, parsed.data);
  if (res === "limit") return { error: "limit" };
  revalidatePath(`/${locale}/account`, "layout");
  return { ok: true };
}

export async function removeVehicleAction(form: FormData) {
  const locale = loc(form);
  const user = await userOrLogin(locale);
  const v = id.safeParse(str(form, "id"));
  if (v.success) await removeVehicle(user.id, v.data);
  revalidatePath(`/${locale}/account`, "layout");
}

export async function addAddressAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = loc(form);
  const user = await userOrLogin(locale);
  const parsed = addressSchema.safeParse({
    label: str(form, "label"),
    recipientName: str(form, "recipientName"),
    phone: str(form, "phone"),
    region: str(form, "region"),
    city: str(form, "city"),
    addressLine: str(form, "addressLine"),
    postalCode: str(form, "postalCode"),
    isDefault: form.get("isDefault") === "on",
  });
  if (!parsed.success) return { error: "invalid", fields: fieldErrors(parsed.error) };
  const res = await addAddress(user.id, parsed.data);
  if (res === "limit") return { error: "limit" };
  revalidatePath(`/${locale}/account`, "layout");
  return { ok: true };
}

export async function defaultAddressAction(form: FormData) {
  const locale = loc(form);
  const user = await userOrLogin(locale);
  const v = id.safeParse(str(form, "id"));
  if (v.success) await setDefaultAddress(user.id, v.data);
  revalidatePath(`/${locale}/account`, "layout");
}

export async function removeAddressAction(form: FormData) {
  const locale = loc(form);
  const user = await userOrLogin(locale);
  const v = id.safeParse(str(form, "id"));
  if (v.success) await removeAddress(user.id, v.data);
  revalidatePath(`/${locale}/account`, "layout");
}
