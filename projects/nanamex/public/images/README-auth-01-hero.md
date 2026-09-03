# AUTH-01 hero photo — sourcing note

**File:** `auth-01-hero.jpg`

**Status: PLACEHOLDER.** This is a real, freely-licensed stock photo selected to satisfy
AUTH-01's layout and content requirements for BUILD (design/UI-SPEC.md AUTH-01,
design/UI-SYSTEM.md §0.10) — it is **not** a final brand/photography decision. Replace it
with commissioned or brand-approved photography before RELEASE_GATE.

## Source

- Title: "Woman cuts fruit in a cozy kitchen at home"
- Author: Shixart1985 (Wikimedia Commons username)
- Source page: https://commons.wikimedia.org/wiki/File:Woman_cuts_fruit_in_a_cozy_kitchen_at_home.jpg
- License: CC BY 2.0 (https://creativecommons.org/licenses/by/2.0) — attribution required.
  Attribution is rendered in `app/page.tsx`'s footer ("Foto de portada: Shixart1985 vía
  Wikimedia Commons (CC BY 2.0) — imagen temporal.") for as long as this placeholder is in
  use. Remove that line when this photo is replaced.

## Why this image

UI-SYSTEM §0.10 requires the AUTH-01 hero to be "warm and natural — home settings, soft
natural light — never corporate stock-photo gloss," and — as a hard privacy/safety rule,
not a style preference — **adults only, no child in frame, not full-frame, not partial, not
anonymized/out-of-focus/from-behind.**

This photo was manually reviewed before selection: it shows exactly one adult woman, alone,
in a warm wooden kitchen with natural window light, smiling while preparing food. No child,
implied child, or any other person is present in the frame. It does not literally depict a
"niñera/family" interaction (it's a generic warm-home moment, not a caregiving scene) — this
is a known gap in an otherwise safe, on-brand placeholder, not a full match to the "real
caregiver/family moment" brief. Flagged explicitly for human/brand review, not presented as
a final asset decision.

Any ambiguous candidate (a child possibly in frame, partially in frame, or out of focus in
the background) was rejected outright per the hard no-child-imagery rule, rather than used
and cropped.

## Follow-up search (post Visual QA / Code Review, "caregiving moment" re-ask)

Both Code Review and Visual QA independently flagged that this photo, while safe, doesn't
read as a "real caregiver/family moment" — it's a generic warm-home scene. The human asked
for a second search specifically for an adults-only photo that plausibly shows a niñera/
parent caregiving moment (e.g. two adults talking in a home setting), rather than accepting
this photo as a permanent decision.

**Result: no better-matching free/CC-licensed candidate was found within this sandbox's
reachable sources**, so the photo above was kept as-is. What was tried:

- **Wikimedia Commons full-text search** (`action=query&list=search`), ~15 query variations
  across two rounds (e.g. "nanny", "babysitter", "two women talking home", "woman explains
  schedule", "handshake", "welcoming guest", "woman folds children's clothes", "woman warms
  baby bottle kitchen", "packing diaper bag"). Results were either irrelevant (rivers named
  "Nanny", botanical specimens), historical/archival (1940s photos, including a WWII-era
  Japanese-American relocation-center photo — rejected outright as wildly off-brand
  regardless of licensing, not just off-topic), or already screened out for containing a
  child.
- **Wikimedia Commons category browse**: `Category:Nannies`, `Category:Babysitting`,
  `Category:Babysitters`, `Category:Au_pairs`, `Category:Childminders` — almost every file
  either includes a child (disqualifying) or is a decades-old archival photo unsuitable for
  a modern warm-editorial brand.
- **Full catalog scan of Shixart1985** (the same CC BY 2.0 modern-stock-photo contributor as
  the current photo, chosen because their catalog is large and current) — pulled all 3,375
  of their uploaded file titles via `list=usercontribs` and grepped for every caregiving-
  adjacent, two-person, or home-meeting pattern I could think of ("caretaker"/"caregiver"/
  "sitter" — all 12 hits include a child; "two women", "handshake", "welcoming", "friends",
  "sisters", "nursery", "crib", "diaper", "formula", "apron" — no adults-only caregiving-
  moment match found).
- **Openverse API** (`api.openverse.org/v1/images/`) — the root API responds, but every
  search query against `/v1/images/` timed out (25s+, TLS handshake completes then no HTTP
  response) across multiple attempts; unusable from this sandbox.
- **Unsplash and Pexels** — both blocked in this sandbox even for anonymous page loads
  (`Authorization required` / HTTP 403 respectively); no API key available either.

**Root cause, not just bad luck**: genuine "caregiver/family moment" stock photography
overwhelmingly depicts the child being cared for (that's the point of the shot), which is
exactly what's disallowed here. The adults-only alternative (e.g. a parent-niñera meeting
with no child in frame) is a narrow, uncommon staged scenario that doesn't appear to exist
in the free-licensed catalogs reachable from this environment.

**Recommendation, not decided unilaterally**: either (a) accept this photo as the placeholder
for longer than originally hoped, since it's already confirmed safe and on-brand in tone,
or (b) source a photo directly (e.g. a human with Unsplash/Pexels/Adobe Stock access, or a
paid stock license) rather than continuing to search free-tier sources this sandbox can
reach. Flagging back to the human/orchestrator per their own instruction rather than forcing
a mismatched or inappropriate substitute (e.g. the archival photo above).
