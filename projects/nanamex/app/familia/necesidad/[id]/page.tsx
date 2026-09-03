import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const db = createServiceRoleClient();
  const { data: necesidad } = await db.from("necesidades").select("id, zona_id, modalidad, estado, pipeline(id, ninera_id, match_score_snapshot, match_checklist_snapshot)").eq("id", id).eq("familia_id", user.id).maybeSingle();
  if (!necesidad || necesidad.estado !== "activa") redirect("/familia/necesidad");
  const matches = (necesidad.pipeline ?? []) as { id: string; ninera_id: string; match_score_snapshot: number; match_checklist_snapshot: Record<string, boolean> }[];
  // Note: editing an already-published (`activa`) necesidad from this empty state is a
  // real, architecture-permitted capability (engineering/architecture.md's necesidad-
  // editing section) but is not yet built anywhere in the app -- it's E2-04's scope. Do
  // not link to `/familia/necesidad?draft=${id}`: that route only loads `estado =
  // 'borrador'` rows (app/familia/necesidad/page.tsx), so it would silently render a
  // blank/new wizard instead of editing this necesidad. Point back to the real "Mis
  // necesidades" dashboard instead until E2-04 delivers the actual edit flow.
  return <main className="mx-auto min-h-screen w-full max-w-[1040px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12"><p className="text-body-sm text-ink-600">Listado de candidatas</p><h1 className="mt-2 text-h1">Candidatas para tu necesidad</h1>{matches.length === 0 ? <section className="mt-12 max-w-[560px] rounded-sm border border-border bg-bg-raised p-8"><h2 className="text-h2">Aún no encontramos candidatas para esta necesidad</h2><p className="mt-3 text-body text-ink-600">Intenta ampliar tu zona o rango de pago para encontrar más opciones.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-primary-600 px-4 py-3 text-button text-white" href="/familia">Volver a mis necesidades</Link></section> : <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matches.map((match) => <article key={match.id} className="rounded-sm border border-border bg-bg-raised p-5"><p className="text-body-sm text-ink-600">Candidata</p><p className="mt-2 text-4xl font-semibold text-primary-600">{match.match_score_snapshot}%</p><ul className="mt-3 space-y-1 text-body-sm text-ink-600">{Object.entries(match.match_checklist_snapshot).filter(([, passed]) => passed).slice(0, 3).map(([factor]) => <li key={factor}>✓ {factor}</li>)}</ul><p className="mt-4 text-body-sm text-ink-600">Perfil disponible próximamente.</p></article>)}</div>}</main>;
}
