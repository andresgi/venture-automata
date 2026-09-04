"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, House, UserCircle } from "@phosphor-icons/react";

const items = [
  { href: "/familia", label: "Mis necesidades", Icon: House },
  { href: "/familia/favoritas", label: "Favoritas", Icon: Heart },
  { href: "/familia/cuenta", label: "Cuenta", Icon: UserCircle },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/familia" ? pathname === href : pathname.startsWith(href);
}

function NavigationItem({ href, label, Icon, pathname }: (typeof items)[number] & { pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-sm px-3 py-2 text-button transition-colors lg:justify-start ${
        active ? "text-primary-600 lg:bg-primary-50" : "text-ink-400 hover:text-ink-600"
      }`}
    >
      <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function FamiliaNavigation({ showDestinations = true }: { showDestinations?: boolean }) {
  const pathname = usePathname();
  if (!showDestinations) return null;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-border bg-bg-raised px-6 py-7 lg:block">
        <Link href="/familia" className="font-[var(--font-fraunces)] text-3xl text-ink-900" aria-label="Clin, inicio">
          Clin
        </Link>
        <nav aria-label="Navegación de familia" className="mt-10 flex flex-col gap-2">
          {items.map((item) => <NavigationItem key={item.href} {...item} pathname={pathname} />)}
        </nav>
      </aside>
      <nav
        aria-label="Navegación de familia"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-bg-raised pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {items.map((item) => <NavigationItem key={item.href} {...item} pathname={pathname} />)}
      </nav>
    </>
  );
}
