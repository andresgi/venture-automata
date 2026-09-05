import Link from "next/link";

export function NineraPlaceholder({ title, description }: { title: string; description: string }) {
  return <section className="mt-8 border-t border-border pt-8"><h2 className="text-headline">{title}</h2><p className="mt-2 max-w-xl text-body text-ink-600">{description}</p><Link href="/ninera" className="mt-4 inline-flex min-h-11 items-center text-button text-primary-700 underline">Volver a Inicio</Link></section>;
}
