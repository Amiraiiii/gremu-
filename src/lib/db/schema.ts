import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Money columns hold integer tiyin (1/100 UZS) as bigint — never floats. */
const money = (name: string) => bigint(name, { mode: "number" });

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),
    userId: uuid("user_id"), // null for guest orders
    guestTokenHash: text("guest_token_hash"), // sha256 of the one-time view token
    idempotencyKey: text("idempotency_key").unique(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    region: text("region"),
    city: text("city"),
    addressLine: text("address_line"),
    deliveryMethod: text("delivery_method").notNull(),
    paymentMethod: text("payment_method").notNull(),
    customerNote: text("customer_note"),
    subtotalMinor: money("subtotal_minor").notNull(),
    deliveryFeeMinor: money("delivery_fee_minor").notNull().default(0),
    totalMinor: money("total_minor").notNull(),
    currency: text("currency").notNull().default("UZS"),
    status: text("status").notNull().default("new"), // new|confirmed|processing|ready|shipped|completed|cancelled
    paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid|pending|paid|failed|cancelled|refunded — changed only by a verified provider callback
    locale: text("locale").notNull().default("ru"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_created_idx").on(t.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id"), // nullable: catalog rows may be deleted later
    productTitleSnapshot: text("product_title_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    oemSnapshot: text("oem_snapshot"),
    unitPriceMinor: money("unit_price_minor").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalMinor: money("line_total_minor").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    actor: text("actor").notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_history_order_idx").on(t.orderId)],
);

/** Important staff actions (status changes, logins). No secrets or full personal data in metadata. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: text("metadata"), // JSON string, redacted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

/**
 * Customer accounts (stage 6). One auth path: Google OpenID Connect, sessions in our own table.
 * `role` is set only on the server; the client can never change it.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authProviderId: text("auth_provider_id").notNull().unique(), // "google:<sub>" (or "dev:<email>" in local dev mode)
  email: text("email").unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  preferredLocale: text("preferred_locale").notNull().default("ru"),
  role: text("role").notNull().default("customer"), // customer|staff|admin
  notifyOrderEmail: boolean("notify_order_email").notNull().default(true),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Server-side sessions. The cookie holds a random token; only its sha256 is stored. */
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_sessions_user_idx").on(t.userId)],
);

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    region: text("region").notNull(),
    city: text("city").notNull(),
    addressLine: text("address_line").notNull(),
    postalCode: text("postal_code"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_addresses_user_idx").on(t.userId)],
);

export const userVehicles = pgTable(
  "user_vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    make: text("make").notNull(), // hyundai|kia
    model: text("model").notNull(),
    generation: text("generation"),
    year: integer("year").notNull(),
    engine: text("engine"),
    trim: text("trim"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_vehicles_user_idx").on(t.userId)],
);

/**
 * Payment provider transactions (stage 7). One row per provider transaction id.
 * States follow Payme: 1 created, 2 performed, -1 cancelled, -2 cancelled after perform (refund).
 * Times are provider-protocol milliseconds; 0 means "not happened".
 */
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(), // payme|click
    providerTxId: text("provider_tx_id").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    amountMinor: money("amount_minor").notNull(),
    state: integer("state").notNull(),
    reason: integer("reason"),
    providerTime: bigint("provider_time", { mode: "number" }).notNull(),
    createTime: bigint("create_time", { mode: "number" }).notNull(),
    performTime: bigint("perform_time", { mode: "number" }).notNull().default(0),
    cancelTime: bigint("cancel_time", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_tx_provider_id_uq").on(t.provider, t.providerTxId),
    index("payment_tx_order_idx").on(t.orderId),
    index("payment_tx_create_idx").on(t.createTime),
  ],
);

/**
 * Customer inquiries (stage 9): contact form, "help me find a part", AI handoff.
 * Saved before any email is attempted, so a mail outage never loses a request.
 */
export const inquiries = pgTable(
  "inquiries",
  {
    id: text("id").primaryKey(), // INQ-XXXXXXXX-XXXX, shown to the customer
    status: text("status").notNull().default("new"), // new|in_progress|closed
    source: text("source").notNull(), // contact_form|fitment_request|ai_handoff
    topic: text("topic").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    message: text("message").notNull(),
    sku: text("sku"),
    vehicle: text("vehicle"),
    locale: text("locale").notNull().default("ru"),
    userId: uuid("user_id"),
    emailStatus: text("email_status").notNull().default("pending"), // pending|sent|logged|failed|not_configured
    emailAttempts: integer("email_attempts").notNull().default(0),
    emailError: text("email_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inquiries_status_idx").on(t.status, t.createdAt), index("inquiries_email_idx").on(t.emailStatus)],
);

/* ---------------- Catalog (stage 10): managed in the admin area, read by the storefront ---------------- */

export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(), // used in URLs and part icons
  nameRu: text("name_ru").notNull(),
  nameUz: text("name_uz").notNull(),
  partsRu: text("parts_ru").notNull().default(""), // short "what's inside" line
  partsUz: text("parts_uz").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Part manufacturers (brands of the parts, not the car makes). */
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(), // stable id used by carts and order items
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().unique(),
    oemNumber: text("oem_number"),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onUpdate: "cascade", onDelete: "restrict" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "restrict" }),
    vehicleMake: text("vehicle_make").notNull(), // hyundai|kia
    partType: text("part_type").notNull(), // original|aftermarket|used
    titleRu: text("title_ru").notNull(),
    titleUz: text("title_uz").notNull(),
    descriptionRu: text("description_ru").notNull().default(""),
    descriptionUz: text("description_uz").notNull().default(""),
    priceMinor: money("price_minor").notNull(),
    stockQuantity: integer("stock_quantity"), // null = not tracked
    availability: text("availability").notNull(), // in_stock|low_stock|out_of_stock|on_request
    specs: jsonb("specs").$type<{ ru: string; uz: string; value: string }[]>().notNull().default([]),
    imageUrl: text("image_url"), // "/products/<file>.webp" (served from public/) or an https URL
    isPublished: boolean("is_published").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.categorySlug), index("products_oem_idx").on(t.oemNumber), index("products_published_idx").on(t.isPublished)],
);

/** Fitment rows. Only `verified` rows may be shown as "fits"; the rest ask the customer to check with a manager. */
export const productFitments = pgTable(
  "product_fitments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    generation: text("generation"),
    yearFrom: integer("year_from").notNull(),
    yearTo: integer("year_to").notNull(),
    engine: text("engine"),
    status: text("status").notNull(), // verified|unverified|not_compatible
    verifiedBy: text("verified_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fitments_product_idx").on(t.productId), index("fitments_vehicle_idx").on(t.make, t.model)],
);
