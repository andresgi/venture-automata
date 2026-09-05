"use client";

import { useId, useState } from "react";
import { Circle, Clock, ShieldCheck } from "@phosphor-icons/react/ssr";

/**
 * `TrustBadge` (design/UI-SYSTEM.md §4.1) -- the one place identity-verification state is
 * ever rendered. Three mutually-exclusive states, invariant color/icon/label semantics
 * everywhere it appears. The default is the "compact inline pill" geometry (24px height,
 * pill shape, `radius-full`) used by FAM-04 cards and other secondary placements. Detail
 * screens opt into the documented 28px variant; NIN-03's banner-scale and NIN-08's
 * large-standalone variant is used by NIN-08.
 *
 * Fixed geometry across all three states (no layout shift, per this component's own
 * acceptance criterion): height, border width, padding, and type scale never change
 * state-to-state -- only border/background/text color, icon, and label text do. Pill width
 * naturally varies with label length (e.g. "No verificada" vs "Verificación en proceso"),
 * which is expected text-content variance, not a geometry regression.
 *
 * Tap (mobile) / hover (desktop) reveals a one-line plain-language tooltip explaining the
 * state, per UI-SYSTEM §4.1's explicit requirement that the badge never be an unexplained
 * pill.
 */
export type VerificationStatus = "no_verificada" | "en_proceso" | "verificada";

type BadgeConfig = {
  Icon: typeof Circle;
  weight: "regular" | "fill";
  label: string;
  explanation: string;
  colorClasses: string;
};

const BADGE_CONFIG: Record<VerificationStatus, BadgeConfig> = {
  no_verificada: {
    Icon: Circle,
    weight: "regular",
    label: "No verificada",
    explanation: "Esta niñera aún no ha subido su identificación.",
    colorClasses: "border-border-strong bg-bg-raised text-ink-600",
  },
  en_proceso: {
    Icon: Clock,
    weight: "regular",
    label: "Verificación en proceso",
    explanation: "Estamos revisando su identificación, normalmente toma 24–48 horas.",
    colorClasses: "border-trust-pending-600/40 bg-trust-pending-50 text-trust-pending-800",
  },
  verificada: {
    Icon: ShieldCheck,
    weight: "fill",
    label: "Identidad verificada",
    explanation: "Identidad verificada por el equipo de Clin.",
    colorClasses: "border-trust-verified-600/40 bg-trust-verified-50 text-trust-verified-800",
  },
};

export function TrustBadge({ status, size = "compact" }: { status: VerificationStatus; size?: "compact" | "detail" | "large" }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const { Icon, weight, label, explanation, colorClasses } = BADGE_CONFIG[status];

  return (
    <span className="relative z-20 inline-block overflow-visible">
      <button
        type="button"
         className={`inline-flex ${size === "large" ? "min-h-20 flex-col gap-2 border-0 px-0 text-h2" : size === "detail" ? "h-7" : "h-6"} items-center gap-1 whitespace-nowrap ${size === "large" ? "" : "rounded-full border px-2"} ${size === "large" ? "text-h2" : "text-caption"} ${colorClasses}`}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
      >
         <Icon size={size === "large" ? 48 : 14} weight={weight} aria-hidden="true" />
        {label}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!open}
        className="absolute left-0 top-full z-30 mt-2 w-56 rounded-sm border border-border bg-bg-raised p-2 text-body-sm text-ink-900 shadow-md"
      >
        {explanation}
      </span>
    </span>
  );
}
