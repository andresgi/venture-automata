import Image from "next/image";
import { RoleSelectButtons } from "@/components/marketing/role-select-buttons";
import { TrustSummary } from "@/components/marketing/trust-summary";

// AUTH-01 landing (design/UI-SPEC.md AUTH-01, design/UI-SYSTEM.md). Replaces the
// Epic 0 placeholder scaffold page (see git history) now that the real design tokens
// (app/globals.css) and the AUTH-02 registration screen (E0-04) both exist.
//
// Layout mirrors UI-SPEC AUTH-01 exactly:
//   - Photo + headline are grouped together (mobile: headline overlaid on the photo's
//     scrim; desktop: headline sits beside the photo instead) -- see the two variants
//     below, each rendered only at its own breakpoint via `lg:hidden`/`hidden lg:flex`,
//     never both at once.
//   - Role-selection buttons are "the only two actions on the page" (UI-SPEC), grouped
//     with the headline in both variants.
//   - Below the fold: a 3-line trust summary, then a footer with legal links.
const HEADLINE = "Niñeras de confianza para tu familia.";
const SUBHEAD =
  "Regístrate como familia o como niñera y conecta con confianza: perfiles verificados, referencias y match por zona, horario y disponibilidad.";

// Hero photo -- see public/images/README-auth-01-hero.md for full sourcing/license
// details. PLACEHOLDER pending real human/brand photography review before launch.
const HERO_ALT =
  "Una mujer sonríe mientras prepara comida en una cocina cálida e iluminada con luz natural.";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-bg">
      <section className="relative flex flex-col lg:flex-row lg:items-stretch">
        {/* Photo -- mobile: 4:5 crop with a bottom scrim + overlaid headline/CTAs.
            Desktop: plain photo, right column, no overlay (headline moves to the left
            copy column instead). */}
        <div className="relative order-1 aspect-[4/5] w-full overflow-hidden lg:order-2 lg:aspect-auto lg:w-auto lg:flex-1 lg:min-h-[640px] lg:rounded-l-lg">
          <Image
            src="/images/auth-01-hero.jpg"
            alt={HERO_ALT}
            fill
            priority
            sizes="(min-width: 1024px) calc(100vw - 480px), 100vw"
            className="object-cover object-[55%_15%]"
          />

          {/* Mobile-only scrim + overlaid headline/CTAs */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-[rgba(36,31,25,0.85)] via-[rgba(36,31,25,0.45)] to-transparent lg:hidden"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-6 pb-8 lg:hidden">
            <h1 className="text-display text-white">{HEADLINE}</h1>
            <p className="text-body text-white/90">{SUBHEAD}</p>
          </div>
        </div>

        {/* Desktop-only copy + CTA column (max 480px, per UI-SPEC) */}
        <div className="hidden flex-col justify-center gap-6 px-12 py-16 lg:order-1 lg:flex lg:w-[480px] lg:shrink-0">
          <h1 className="text-display text-ink-900">{HEADLINE}</h1>
          <p className="text-body text-ink-600">{SUBHEAD}</p>
          <RoleSelectButtons className="max-w-sm" />
        </div>
      </section>

      {/* Mobile-only role buttons, stacked below the hero image (not overlaid on the
          photo) -- per UI-SPEC AUTH-01: "two role-selection buttons stacked below the
          fold." */}
      <div className="px-6 pt-6 lg:hidden">
        <RoleSelectButtons />
      </div>

      {/* Below-fold trust summary */}
      <section className="mx-auto w-full max-w-[480px] px-6 py-12 lg:max-w-2xl lg:py-16">
        <TrustSummary />
      </section>

      <footer className="mt-auto flex flex-col items-center gap-3 border-t border-border px-6 py-8 text-center">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href="/legal/terminos"
            className="text-body-sm text-ink-600 underline-offset-2 hover:underline"
          >
            Términos y condiciones
          </a>
          <a
            href="/legal/privacidad"
            className="text-body-sm text-ink-600 underline-offset-2 hover:underline"
          >
            Aviso de privacidad
          </a>
          <a
            href="/login"
            className="text-body-sm text-ink-600 underline-offset-2 hover:underline"
          >
            Ya tengo cuenta
          </a>
        </nav>
        {/* CC BY 2.0 attribution requirement for the placeholder hero photo -- see
            public/images/README-auth-01-hero.md. Remove once a commissioned/licensed
            photo replaces this placeholder. */}
        <p className="text-body-sm text-ink-400">
          Foto de portada: Shixart1985 vía Wikimedia Commons (CC BY 2.0) — imagen temporal.
        </p>
      </footer>
    </main>
  );
}
