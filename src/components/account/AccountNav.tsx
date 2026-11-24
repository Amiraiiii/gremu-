"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

/** Tabs of the account area; the current section is marked with aria-current. Scrolls sideways on phones. */
export function AccountNav({ items, label }: { items: Item[]; label: string }) {
  const pathname = usePathname() ?? "";
  const base = items[0]?.href;
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {items.map((item) => {
          const active = item.href === base ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-5 font-display text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-cream text-petrol-900" : "border border-white/20 text-cream/85 hover:bg-white/10 hover:text-cream"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
