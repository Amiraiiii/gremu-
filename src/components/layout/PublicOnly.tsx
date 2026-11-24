"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Public site chrome (header, footer) is not shown inside the admin area. */
export function isAdminPath(pathname: string | null) {
  return /^\/[a-z]{2}\/admin(\/|$)/.test(pathname ?? "");
}

export function PublicOnly({ children }: { children: ReactNode }) {
  return isAdminPath(usePathname()) ? null : <>{children}</>;
}
