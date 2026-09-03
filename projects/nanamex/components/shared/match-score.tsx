import { Check } from "@phosphor-icons/react/ssr";

/**
 * `MatchScore` compact density (design/UI-SYSTEM.md §4.3) -- used on FAM-04 candidate
 * cards. The numeral is deliberately the largest, most saturated element (`numeral-lg`,
 * `primary-600`) per UI-SPEC FAM-04's explicit visual-emphasis note. Checklist items are
 * plain typographic rows (a small outline `Check` icon + text), not chips/pills -- avoids
 * stacking a third badge style onto an already-badged card (`TrustBadge` + Match Score are
 * the only two visual "signals"). The full-detail density (FAM-06) is out of this story's
 * scope.
 */
export function MatchScoreCompact({ score, checklist }: { score: number; checklist: string[] }) {
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="text-numeral-lg text-primary-600">{score}%</span>
        <span className="text-body-sm text-ink-600">compatible</span>
      </p>
      {checklist.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-2 text-body-sm text-ink-600">
              <Check size={16} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
