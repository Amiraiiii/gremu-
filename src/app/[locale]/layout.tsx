import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Montserrat, Onest, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCatalogDictionary } from "@/features/catalog/categories";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { PublicOnly } from "@/components/layout/PublicOnly";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { geminiConfigured } from "@/features/assistant/gemini";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});
const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: { ru: "/ru", uz: "/uz" } },
    openGraph: { title: t.meta.title, description: t.meta.description, type: "website", locale },
  };
}

export const viewport: Viewport = {
  themeColor: "#13252c",
  width: "device-width",
  initialScale: 1,
};

// Hides [data-reveal] elements only when JS runs and motion is allowed; a 2.5s fallback un-hides them.
const motionBoot = `(function(){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var d=document.documentElement;d.classList.add('js-motion');setTimeout(function(){d.classList.remove('js-motion')},2500)}}catch(e){}})();`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getCatalogDictionary(locale as Locale);

  return (
    <html lang={locale} suppressHydrationWarning className={`${montserrat.variable} ${onest.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBoot }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-cream px-4 py-3 font-semibold text-petrol-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t.skip}
        </a>
        <SmoothScroll />
        <PublicOnly>
          <Header locale={locale as Locale} t={t.nav} categories={t.categories.items} />
        </PublicOnly>
        <main id="main">{children}</main>
        <PublicOnly>
          <Footer locale={locale as Locale} t={t} />
          <AssistantWidget locale={locale as Locale} t={t.assistant} enabled={geminiConfigured()} />
        </PublicOnly>
      </body>
    </html>
  );
}
