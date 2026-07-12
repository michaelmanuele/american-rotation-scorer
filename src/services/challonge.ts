/**
 * Challonge v1 API client.
 *
 * Auth: HTTP Basic, any username, password = your API v1 key (challonge.com/settings/developer).
 *
 * For v0.2 Phase 1 we only need read access. Phase 3 will add postMatchScore.
 */
import { decode as atob, encode as btoa } from 'base-64';

const BASE = 'https://api.challonge.com/v1';

// Use the package's btoa/atob shim so this works in React Native (which lacks btoa).
// We only need btoa here.
function _btoa(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  return typeof g.btoa === 'function' ? g.btoa(s) : btoa(s);
}
// Silence unused-import lint
void atob;

function authHeader(apiKey: string): string {
  return 'Basic ' + _btoa(`x:${apiKey}`);
}

/** Shape of a Challonge participant we care about. */
export interface ChallongeParticipant {
  id: number;
  name: string;
  seed: number;
}

/** Shape of a Challonge match we care about. */
export interface ChallongeMatch {
  id: number;
  round: number;
  state: 'pending' | 'open' | 'complete';
  player1_id: number | null;
  player2_id: number | null;
  scores_csv: string;
  winner_id: number | null;
  identifier: string;
}

/** Shape of tournament + nested data. */
export interface ChallongeTournament {
  id: number;
  name: string;
  url: string;
  tournament_type: string; // 'round robin' | 'single elimination' | ...
  state: string;           // 'pending' | 'underway' | 'complete'
  participants: ChallongeParticipant[];
  matches: ChallongeMatch[];
}

export class ChallongeError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Challonge API ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
  get isAuth() { return this.status === 401; }
  get isNotFound() { return this.status === 404; }
  get isUnprocessable() { return this.status === 422; } // e.g. tournament not underway
  get isRateLimit() { return this.status === 429; }
}

/**
 * GET /v1/tournaments/{slug}.json with participants + matches included.
 *
 * Returns a flattened, narrowly-typed shape (raw response wraps each object
 * in a redundant top-level key — we strip it).
 */
export async function getTournament(
  apiKey: string,
  slug: string
): Promise<ChallongeTournament> {
  const url = `${BASE}/tournaments/${encodeURIComponent(slug)}.json` +
    `?include_participants=1&include_matches=1`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(apiKey) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ChallongeError(res.status, body);
  }
  const raw = await res.json();
  const t = raw.tournament;
  return {
    id: t.id,
    name: t.name,
    url: t.url,
    tournament_type: t.tournament_type,
    state: t.state,
    participants: (t.participants ?? []).map((p: any) => ({
      id: p.participant.id,
      name: p.participant.display_name ?? p.participant.name,
      seed: p.participant.seed,
    })),
    matches: (t.matches ?? []).map((m: any) => ({
      id: m.match.id,
      round: m.match.round,
      state: m.match.state,
      player1_id: m.match.player1_id,
      player2_id: m.match.player2_id,
      scores_csv: m.match.scores_csv ?? '',
      winner_id: m.match.winner_id,
      identifier: m.match.identifier,
    })),
  };
}

/**
 * PUT /v1/tournaments/{slug}/matches/{matchId}.json
 *
 * Posts a completed match's score + winner to Challonge. Challonge only
 * accepts writes to matches in state 'open' (i.e. both players determined,
 * and the match is currently live).
 *
 * scoresCsv format: '"P1-P2"' e.g. '"120-88"'. For a race-to match Michael
 * only plays one set, so a single CSV entry is what we send.
 */
export async function postMatchScore(
  apiKey: string,
  slug: string,
  challongeMatchId: number,
  args: {
    p1Score: number;
    p2Score: number;
    winnerParticipantId: number;
  }
): Promise<ChallongeMatch> {
  const url =
    `${BASE}/tournaments/${encodeURIComponent(slug)}` +
    `/matches/${challongeMatchId}.json`;
  const body = {
    match: {
      scores_csv: `${args.p1Score}-${args.p2Score}`,
      winner_id: args.winnerParticipantId,
    },
  };
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ChallongeError(res.status, text);
  }
  const raw = await res.json();
  const m = raw.match ?? raw;
  return {
    id: m.id,
    round: m.round,
    state: m.state,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    scores_csv: m.scores_csv ?? '',
    winner_id: m.winner_id,
    identifier: m.identifier,
  };
}

/**
 * Extract a Challonge tournament slug from anything the user might paste:
 *   - "amrolegends_2026_3"
 *   - "https://challonge.com/amrolegends_2026_3"
 *   - "challonge.com/amrolegends_2026_3"
 *   - subdomain form "myorg-amrolegends_2026_3" (passed through as-is)
 */
export function parseTournamentSlug(input: string): string {
  const s = input.trim();
  if (!s) return '';
  // Strip protocol
  const noProto = s.replace(/^https?:\/\//, '');
  // After the host, take the last path segment
  const parts = noProto.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  // If host like challonge.com is first, slug is parts[1]; else parts[0]
  const slug = parts.length === 1 ? parts[0] : parts[parts.length - 1];
  return slug;
}
