import { Heart } from "@phosphor-icons/react/ssr";
import { TrustBadge, type VerificationStatus } from "@/components/shared/trust-badge";
import { MatchScoreCompact } from "@/components/shared/match-score";
import Link from "next/link";

export type CandidateCardData = {
  necesidadId?: string;
  ninera_id: string;
  nombre: string;
  fotoUrl: string | null;
  verificationStatus: VerificationStatus;
  score: number;
  checklist: string[];
  profileCompleteness?: number;
  createdAt?: string;
};

/**
 * 56px mobile / 64px desktop circle photo, per UI-SPEC FAM-04. `foto_url` is nullable
 * (niñera photo upload isn't built yet -- Epic 7 -- every real candidate's photo is null
 * today) so this always renders the initials placeholder in practice right now; the photo
 * branch is still implemented for when Epic 7 ships. Plain `<img>` (not `next/image`)
 * deliberately: `foto_url` is an arbitrary Supabase Storage public URL, and configuring
 * `next.config.ts`'s `images.remotePatterns` for a domain no story has produced a real URL
 * for yet is out of this story's scope -- revisit once Epic 7 lands real photos.
 */
function CandidateAvatar({ nombre, fotoUrl }: { nombre: string; fotoUrl: string | null }) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see comment above.
      <img
        src={fotoUrl}
        alt=""
        data-testid="candidate-avatar-photo"
        className="h-14 w-14 shrink-0 rounded-full object-cover lg:h-16 lg:w-16"
      />
    );
  }
  const initial = nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-border text-h2 text-ink-600 lg:h-16 lg:w-16"
    >
      {initial}
    </span>
  );
}

/**
 * FAM-04 candidate card (design/UI-SYSTEM.md §5.3, design/UI-SPEC.md FAM-04). Reused as-is
 * by FAM-07 favoritas per its own spec ("Same card component as FAM-04").
 *
 * Scope note -- three footer/identity affordances are rendered per the visual spec but are
 * deliberately non-functional in this story, each belonging to a later epic:
 * - "Guardar favorita" (heart toggle): E4-04's scope, no favorites mechanism exists yet.
 * - "Ver perfil": links to FAM-06 when the parent list supplies its necesidad id.
 * - "Filtrar" is NOT part of this card (it's a page-level entry point) -- see the page file.
 * All three render in their spec-described visual position (disabled/40% opacity, per
 * UI-SYSTEM §5.1's disabled-button convention) so Visual QA can confirm layout/spacing
 * against UI-SPEC without a functional destination existing yet.
 */
export function CandidateCard({ candidate }: { candidate: CandidateCardData }) {
  return (
    <article className="min-h-[180px] rounded-md border border-border bg-bg-raised p-4">
      <div className="flex items-center gap-3">
        <CandidateAvatar nombre={candidate.nombre} fotoUrl={candidate.fotoUrl} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-body font-medium text-ink-900">{candidate.nombre}</p>
          <TrustBadge status={candidate.verificationStatus} />
        </div>
      </div>
      <div className="mt-4">
        <MatchScoreCompact score={candidate.score} checklist={candidate.checklist} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <button
          type="button"
          disabled
          title="Guardar favorita (próximamente)"
          className="pointer-events-none flex h-11 w-11 items-center justify-center rounded-sm text-ink-600 opacity-40"
        >
          <Heart size={20} weight="regular" aria-hidden="true" />
          <span className="sr-only">Guardar favorita (próximamente)</span>
        </button>
        {candidate.necesidadId ? (
          <Link href={`/familia/necesidad/${candidate.necesidadId}/candidatas/${candidate.ninera_id}`} className="min-h-11 inline-flex items-center text-button text-primary-600">
            Ver perfil
          </Link>
        ) : (
          <button type="button" disabled title="Ver perfil (próximamente)" className="pointer-events-none text-button text-primary-600 opacity-40">
            Ver perfil
          </button>
        )}
      </div>
    </article>
  );
}
