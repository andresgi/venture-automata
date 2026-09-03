import { scoreMatch, type MatchNecesidad, type MatchNinera, type MatchScoreResult } from "@/lib/matching/match-score";

/**
 * The persistence adapter deliberately exposes only the data needed by the
 * matching rules and ordering.  Keeping this boundary small makes the service
 * usable from server actions and straightforward to exercise with an in-memory
 * repository.
 */
export type MatchCandidate = {
  id: string;
  profileCompleteness: number;
  createdAt: string;
  ninera: MatchNinera;
};

export type MatchResult = MatchScoreResult & {
  candidate: MatchCandidate;
};

export type MatchRepository = {
  listPublishedCandidates: (necesidad: MatchNecesidad) =>
    | readonly MatchCandidate[]
    | Promise<readonly MatchCandidate[]>;
};

function compareAscendingText(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function compareMatches(first: MatchResult, second: MatchResult): number {
  return (
    second.score - first.score ||
    second.candidate.profileCompleteness - first.candidate.profileCompleteness ||
    compareAscendingText(first.candidate.createdAt, second.candidate.createdAt) ||
    compareAscendingText(first.candidate.id, second.candidate.id)
  );
}

/**
 * Applies the hard filter, scores every eligible candidate, and returns the
 * complete ranked result. Low scores remain visible; the compatibility
 * threshold is an annotation used by downstream analytics/copy, not a filter.
 */
export async function computeMatches(
  necesidad: MatchNecesidad,
  repository: MatchRepository,
): Promise<MatchResult[]> {
  const candidates = await repository.listPublishedCandidates(necesidad);
  const matches: MatchResult[] = [];

  for (const candidate of candidates) {
    const score = scoreMatch(necesidad, candidate.ninera);
    if (score !== null) {
      matches.push({ candidate, ...score });
    }
  }

  return matches.sort(compareMatches);
}

export const rankMatches = (matches: readonly MatchResult[]): MatchResult[] =>
  [...matches].sort(compareMatches);
