import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { listVehicles, MAX_VEHICLES } from "@/features/account/service";
import { VehicleForm } from "@/components/account/AccountForms";
import { removeVehicleAction } from "../../actions";

export default async function AccountVehicles({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account/vehicles`);
  const t = getDictionary(locale).account.vehicles;
  const cars = await listVehicles(user.id);
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  return (
    <div className="grid gap-6">
      <div className={card}>
        <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{t.title}</h2>
        <p className="mt-3 max-w-[60ch] text-sm text-ink-2">{t.lead}</p>
        {cars.length ? (
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {cars.map((c) => {
              const extra = [c.generation, c.engine, c.trim].filter(Boolean).join(" · ");
              return (
                <li key={c.id} className="flex flex-col justify-between gap-4 rounded-2xl p-5 ring-1 ring-line">
                  <div>
                    <p className="text-lg font-medium text-ink">
                      {c.make === "kia" ? "Kia" : "Hyundai"} {c.model} <span className="mono-num text-ink-2">{c.year}</span>
                    </p>
                    {extra && <p className="mt-1 text-sm text-muted">{extra}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/${locale}/catalog?${new URLSearchParams({ make: c.make, model: c.model, year: String(c.year) })}`}
                      className="btn btn-primary"
                    >
                      {t.findParts}
                    </Link>
                    <form action={removeVehicleAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center px-2 text-sm text-bad hover:underline">
                        {t.remove}
                        <span className="sr-only">: {c.model} {c.year}</span>
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-ink-2">{t.empty}</p>
        )}
      </div>

      {cars.length < MAX_VEHICLES ? (
        <div className={card}>
          <h2 className="mb-6 text-xl font-medium tracking-[-0.02em] text-petrol-900">{t.add}</h2>
          <VehicleForm locale={locale} t={t} />
        </div>
      ) : (
        <p className="text-sm text-ink-2">{t.limit}</p>
      )}
    </div>
  );
}
