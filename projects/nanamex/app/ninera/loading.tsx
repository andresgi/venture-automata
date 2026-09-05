import { NineraNavigation } from "@/components/ninera/ninera-navigation";

export default function NineraHomeLoading() {
  return <><NineraNavigation /><main aria-busy="true" aria-label="Cargando tu panel" className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 pb-24 text-ink-900 sm:px-6 lg:ml-[248px] lg:w-[calc(100%-248px)] lg:px-10 lg:py-12"><div className="h-9 w-36 animate-pulse rounded-sm bg-border" /><div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-sm bg-border" /><div className="mt-8 h-24 animate-pulse rounded-md bg-border" /><div className="mt-8 h-36 animate-pulse rounded-md bg-border" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="h-56 animate-pulse rounded-md bg-border" /><div className="h-56 animate-pulse rounded-md bg-border" /></div></main></>;
}
