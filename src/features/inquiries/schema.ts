import { z } from "zod";

export const INQUIRY_TOPICS = ["general", "fitment", "order", "other"] as const;
export const INQUIRY_STATUSES = ["new", "in_progress", "closed"] as const;

const phone = z
  .string()
  .trim()
  .max(24)
  .regex(/^\+?[0-9\s\-()]{7,24}$/, "phone");
const opt = (max: number, code: string) => z.string().trim().max(max, code).optional().or(z.literal(""));

/** Validated at the API boundary; error codes are mapped to localized messages in the UI. */
export const inquirySchema = z
  .object({
    name: z.string().trim().min(2, "name").max(80, "name"),
    phone: phone.optional().or(z.literal("")),
    email: z.string().trim().email("email").max(120).optional().or(z.literal("")),
    topic: z.enum(INQUIRY_TOPICS),
    message: z.string().trim().min(5, "message").max(2000, "message"),
    sku: opt(40, "sku"),
    // "Help me find a part": the vehicle, all optional — the manager asks for what is missing.
    make: z.enum(["hyundai", "kia"]).optional().or(z.literal("")),
    model: opt(40, "model"),
    year: z
      .string()
      .trim()
      .regex(/^(19[9][0-9]|20[0-9]{2})$/, "year")
      .optional()
      .or(z.literal("")),
    engine: opt(40, "engine"),
    vin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "vin")
      .optional()
      .or(z.literal("")),
    consent: z.literal(true, { message: "consent" }),
    locale: z.enum(["ru", "uz"]),
    // Honeypot: real people never fill this hidden field
    website: z.string().max(0, "spam").optional().or(z.literal("")),
  })
  .refine((v) => Boolean(v.phone) || Boolean(v.email), { message: "contact", path: ["phone"] });

export type InquiryInput = z.infer<typeof inquirySchema>;

/** One line for the manager, e.g. "Kia Cerato 2019, 2.0 MPI, VIN XWE…". Null when nothing was given. */
export function vehicleLine(v: Pick<InquiryInput, "make" | "model" | "year" | "engine" | "vin">): string | null {
  const car = [v.make ? (v.make === "kia" ? "Kia" : "Hyundai") : "", v.model, v.year].filter(Boolean).join(" ");
  const line = [car, v.engine, v.vin ? `VIN ${v.vin}` : ""].filter(Boolean).join(", ");
  return line || null;
}

export type Inquiry = {
  id: string;
  createdAt: string;
  status: (typeof INQUIRY_STATUSES)[number];
  source: "contact_form" | "fitment_request" | "ai_handoff";
  name: string;
  phone: string | null;
  email: string | null;
  topic: (typeof INQUIRY_TOPICS)[number];
  message: string;
  sku: string | null;
  vehicle?: string | null;
  userId?: string | null;
  locale: "ru" | "uz";
  emailStatus: "pending" | "sent" | "logged" | "failed" | "not_configured";
};
