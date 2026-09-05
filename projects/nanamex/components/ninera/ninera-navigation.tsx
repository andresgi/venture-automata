"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ClipboardText, House, IdentificationCard, UserCircle, UserGear } from "@phosphor-icons/react";

const items = [
  { href: "/ninera", label: "Inicio", Icon: House },
  { href: "/ninera/oportunidades", label: "Oportunidades", Icon: Briefcase },
  { href: "/ninera/perfil", label: "Mi perfil", Icon: UserCircle },
  { href: "/ninera/perfil/identificacion", label: "Identificación", Icon: IdentificationCard },
  { href: "/ninera/solicitudes", label: "Mis solicitudes", Icon: ClipboardText },
  { href: "/ninera/cuenta", label: "Cuenta", Icon: UserGear },
] as const;

const mobileItems = [items[0], items[1], items[4], items[5]];
const desktopItems = [items[0], items[1], items[2], items[4], items[5]];

export function NineraNavigation() {
  const pathname = usePathname();
  return <><aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-border bg-bg-raised px-6 py-7 lg:block"><Link href="/ninera" className="font-[var(--font-fraunces)] text-3xl text-ink-900" aria-label="Clin, inicio">Clin</Link><nav aria-label="Navegación de niñera" className="mt-10 flex flex-col gap-2">{desktopItems.map((item) => <Item key={item.href} {...item} pathname={pathname} />)}</nav></aside><nav aria-label="Navegación de niñera" className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-bg-raised pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden">{mobileItems.map((item) => <Item key={item.href} {...item} pathname={pathname} />)}</nav></>;
}

function Item({ href, label, Icon, pathname }: (typeof items)[number] & { pathname: string }) { const active = href === "/ninera" ? pathname === href : pathname.startsWith(href); return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded-sm px-1 py-1 text-[10px] leading-tight transition-colors lg:flex-none lg:flex-row lg:justify-start lg:gap-2 lg:px-2 lg:py-2 lg:text-button ${active ? "text-primary-600 lg:bg-primary-50" : "text-ink-400 hover:text-ink-600"}`}><Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" /><span className="max-w-full truncate">{label}</span></Link>; }
