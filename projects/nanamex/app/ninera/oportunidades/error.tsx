"use client";

import { NineraNavigation } from "@/components/ninera/ninera-navigation";

export default function OpportunitiesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <><NineraNavigation /><main role="alert" className="mx-auto min-h-screen w-full max-w-[680px] px-4 py-16 text-center lg:ml-[248px]"><h1 className="text-headline">No pudimos cargar las oportunidades</h1><p className="mt-2 text-body text-ink-600">Intenta de nuevo. Tus datos siguen protegidos.</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-sm bg-primary-600 px-4 text-button text-white">Intentar de nuevo</button></main></>;
}
