/**
 * México phone number normalization/validation for AUTH-02's "teléfono format (México,
 * +52)" requirement (design/UX-spec.md AUTH-02).
 *
 * Assumption (not fully specified by UX-spec.md, flagged for reviewer attention): accepts
 * a 10-digit national number, with or without a `+52`/`52` country-code prefix and with
 * optional spaces/dashes, and normalizes it to a single canonical `+52XXXXXXXXXX` form for
 * storage — so `profiles.phone` always holds one consistent shape regardless of how the
 * user typed it, and duplicate-phone detection (E0-04 acceptance criterion) can't be
 * bypassed by formatting variance alone.
 */
export function normalizeMexicanPhone(rawInput: string): string | null {
  const digitsOnly = rawInput.replace(/[^\d]/g, "");

  let nationalNumber: string | null = null;

  if (digitsOnly.length === 10) {
    nationalNumber = digitsOnly;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith("52")) {
    nationalNumber = digitsOnly.slice(2);
  } else if (digitsOnly.length === 13 && digitsOnly.startsWith("521")) {
    // Some legacy/mobile-prefixed formats include a "1" after the country code.
    nationalNumber = digitsOnly.slice(3);
  }

  if (!nationalNumber || nationalNumber.length !== 10) {
    return null;
  }

  return `+52${nationalNumber}`;
}
