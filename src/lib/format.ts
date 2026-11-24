import type { Locale } from "@/i18n/config";

/** Format an integer amount in tiyin as UZS for display. */
export function formatUZS(minor: number, locale: Locale): string {
  const sums = Math.round(minor / 100);
  const n = new Intl.NumberFormat(locale === "uz" ? "uz-Latn-UZ" : "ru-RU", { maximumFractionDigits: 0 }).format(sums);
  return `${n.replace(/,/g, " ")} ${locale === "uz" ? "soʻm" : "сум"}`;
}

/** Show a UTC timestamp in Tashkent time. */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn-UZ" : "ru-RU", {
    dateStyle: "medium",
    timeZone: "Asia/Tashkent",
  }).format(new Date(iso));
}
