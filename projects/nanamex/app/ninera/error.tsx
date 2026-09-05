"use client";

import { NineraNavigation } from "@/components/ninera/ninera-navigation";

export default function NineraError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <><NineraNavigation /><main className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col items-center justify-center bg-bg px-6 py-12 text-center text-ink-900 lg:ml-[248px]"><h1 className="text-h1">No pudimos cargar tu panel</h1><p className="mt-3 text-body text-ink-600">Hubo un problema temporal al consultar tu información. Intenta de nuevo.</p><button type="button" onClick={reset} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white">Intentar de nuevo</button></main></>;
}
