import { NineraNavigation } from "@/components/ninera/ninera-navigation";

export default function OpportunitiesLoading() {
  return <><NineraNavigation /><main aria-busy="true" aria-label="Cargando oportunidades" className="mx-auto min-h-screen w-full max-w-[1120px] px-4 py-8 lg:ml-[248px] lg:px-10 lg:py-12"><div className="h-10 w-64 animate-pulse rounded-sm bg-border" /><div className="mt-8 h-24 animate-pulse rounded-md bg-border" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="h-56 animate-pulse rounded-md bg-border" /><div className="h-56 animate-pulse rounded-md bg-border" /><div className="h-56 animate-pulse rounded-md bg-border" /></div></main></>;
}
