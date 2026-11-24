import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { Fitment, Product } from "@/features/catalog/types";
import { formatUZS } from "@/lib/format";
import { PartIcon } from "@/components/home/PartIcons";
import { AddToCart } from "./AddToCart";
import { AvailabilityBadge, DemoBadge, FitmentBadge } from "./Badges";

/** Product photo (4:3, its own background fills the card); without a photo, the category icon on the brand gradient. */
export function ProductVisual({ product, className = "", priority = false }: { product: Product; className?: string; priority?: boolean }) {
  if (product.imageUrl) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#f3f6f7] ${className}`}>
        <Image
          src={product.imageUrl}
          alt={product.title.ru}
          fill
          priority={priority}
          quality={90}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
        />
      </div>
    );
  }
  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-[18px] ${className}`}
      style={{ background: "linear-gradient(140deg, oklch(46% 0.07 214), oklch(24% 0.045 222))" }}
    >
      <PartIcon
        slug={product.categorySlug}
        className="absolute inset-0 m-auto size-[46%] text-cream/85 transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.05] group-hover:-rotate-3"
      />
    </div>
  );
}

export function ProductCard({
  product,
  fitment,
  locale,
  t,
}: {
  product: Product;
  fitment?: Fitment;
  locale: Locale;
  t: Dictionary["catalog"];
}) {
  const href = `/${locale}/products/${product.slug}`;
  const canBuy = product.availability !== "out_of_stock";
  return (
    <article className="group relative flex flex-col rounded-[22px] bg-paper p-3 ring-1 ring-line transition-[transform,box-shadow] duration-500 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_oklch(20%_0.03_222/0.45)]">
      <Link href={href} className="block rounded-[18px]" tabIndex={-1} aria-hidden="true">
        <ProductVisual product={product} />
      </Link>
      <div className="absolute top-5 left-5 flex gap-1.5">
        {product.isDemo && <DemoBadge label={t.demo} />}
        <span className="rounded-md bg-cream/90 px-2 py-0.5 text-[0.7rem] font-medium text-petrol-900">
          {t.types[product.partType]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-2 pt-4 pb-2">
        <h3 className="text-lg leading-snug font-medium tracking-[-0.02em] text-petrol-900">
          <Link href={href} className="link-draw">
            {product.title[locale]}
          </Link>
        </h3>
        <dl className="mono-num grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted">
          <dt>{t.sku}</dt>
          <dd className="truncate text-ink-2">{product.sku}</dd>
          <dt>{t.oem}</dt>
          <dd className="truncate text-ink-2">{product.oemNumber ?? t.unknown}</dd>
        </dl>
        {fitment?.status === "verified" && <FitmentBadge status="verified" label={t.fitment.verified} />}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-xl font-medium tracking-[-0.02em] text-petrol-900">{formatUZS(product.priceMinor, locale)}</p>
            <AvailabilityBadge value={product.availability} label={t.availability[product.availability]} />
          </div>
          <AddToCart productId={product.id} disabled={!canBuy} labels={{ add: t.addToCart, added: t.added }} />
        </div>
      </div>
    </article>
  );
}
