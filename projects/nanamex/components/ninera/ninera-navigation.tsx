"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, IdentificationCard, UserCircle } from "@phosphor-icons/react";

const items = [
  { href: "/ninera", label: "Inicio", Icon: House },
  { href: "/ninera/perfil", label: "Mi perfil", Icon: UserCircle },
  { href: "/ninera/perfil/identificacion", label: "Identificación", Icon: IdentificationCard },
] as const;

export function NineraNavigation() {
  const pathname = usePathname();
  return <><aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-border bg-bg-raised px-6 py-7 lg:block"><Link href="/ninera" className="font-[var(--font-fraunces)] text-3xl text-ink-900" aria-label="Clin, inicio">Clin</Link><nav aria-label="Navegación de niñera" className="mt-10 flex flex-col gap-2">{items.map((item) => <Item key={item.href} {...item} pathname={pathname} />)}</nav></aside><nav aria-label="Navegación de niñera" className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-bg-raised pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden">{items.map((item) => <Item key={item.href} {...item} pathname={pathname} />)}</nav></>;
}

function Item({ href, label, Icon, pathname }: (typeof items)[number] & { pathname: string }) { const active = href === "/ninera" ? pathname === href : pathname.startsWith(href); return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-sm px-2 py-2 text-caption transition-colors lg:justify-start lg:text-button ${active ? "text-primary-600 lg:bg-primary-50" : "text-ink-400 hover:text-ink-600"}`}><Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" /><span>{label}</span></Link>; }
