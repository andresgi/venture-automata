import Link from "next/link";

/**
 * AUTH-01's role-selection CTAs (design/UI-SPEC.md AUTH-01): "the two role buttons are
 * the single decision this page asks for" -- "Soy familia" (primary), "Soy niñera"
 * (secondary-outline), stacked, same width. Routes into AUTH-02 (`/registro`) with the
 * role pre-filled via the `role` query param, which `app/registro/page.tsx` (E0-04) and
 * `RegisterForm` (E0-04) already read via `isSelfRegisterableRole` -- no changes needed
 * there, this component only needs to link to the URL shape they already expect.
 */
export function RoleSelectButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full flex-col gap-3 ${className}`}>
      <Link
        href="/registro?role=familia"
        className="text-button flex h-11 w-full items-center justify-center rounded-sm bg-primary-600 font-medium text-white transition-colors hover:bg-primary-700"
      >
        Soy familia
      </Link>
      <Link
        href="/registro?role=ninera"
        className="text-button flex h-11 w-full items-center justify-center rounded-sm border border-border-strong font-medium text-ink-900 transition-colors hover:bg-bg-raised"
      >
        Soy niñera
      </Link>
    </div>
  );
}
