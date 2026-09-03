import { ShieldCheck, ChatCircleText, Flag } from "@phosphor-icons/react/ssr";

/**
 * AUTH-01's below-the-fold "3-line trust summary" (design/UI-SPEC.md AUTH-01):
 * verification / references / reporting, rendered as "plain text + small outline
 * icons, not badges" -- deliberately not the `TrustBadge` component (UI-SYSTEM §4.1),
 * which is reserved for a specific niñera's own identity-verification state elsewhere
 * in the product, not a generic marketing claim on the landing page. Content mirrors
 * product/prd.md §"Confianza y seguridad" (verificación de identidad, referencias,
 * reportar comportamiento inapropiado).
 */
const ITEMS = [
  {
    icon: ShieldCheck,
    text: "Verificamos el correo, teléfono e identidad de cada niñera antes de mostrar su perfil como verificado.",
  },
  {
    icon: ChatCircleText,
    text: "Consulta las referencias laborales y personales que cada niñera comparte.",
  },
  {
    icon: Flag,
    text: "Puedes reportar cualquier comportamiento inapropiado en cualquier momento.",
  },
] as const;

export function TrustSummary() {
  return (
    <ul className="flex flex-col gap-4">
      {ITEMS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-3">
          <Icon size={20} weight="regular" className="mt-0.5 shrink-0 text-ink-400" />
          <span className="text-body text-ink-600">{text}</span>
        </li>
      ))}
    </ul>
  );
}
