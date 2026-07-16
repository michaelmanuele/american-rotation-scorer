/**
 * Challonge API v2.1 client (OAuth 2.0 / Bearer token).
 *
 * Auth: OAuth 2.0 access token obtained via services/auth.ts.
 *
 * v2.1 uses JSON:API format — every response wraps content in
 * `{ data: { id, type, attributes: {...} } }` (or `{ data: [ ... ] }`).
 *
 * Required request headers per Challonge docs
 * (https://challonge.apidog.io/getting-started-1726706m0):
 *   Content-Type: application/vnd.api+json
 *   Accept: application/json
 *   Authorization-Type: v2
 *   Authorization: Bearer <access_token>
 */
import { getValidAccessToken, refreshAccessToken } from '@/services/auth';

const BASE = 'https://api.challonge.com/v2.1';

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
  state: 'pending' | 'open' | 'complete' | string;
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
  tournament_type: string;
  state: string;
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
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isUnprocessable() { return this.status === 422; }
  get isRateLimit() { return this.status === 429; }
}

export class NotSignedInError extends Error {
  constructor() { super('Not signed in to Challonge'); }
}

// -----------------------------------------------------------------------------
// HTTP helpers with automatic token refresh on 401
// -----------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
}

/**
 * Make an authenticated Challonge v2.1 request. On 401, refresh the access
 * token once and retry. Returns parsed JSON, or throws ChallongeError.
 */
async function api<T = any>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const method = opts.method ?? 'GET';
  const url = `${BASE}${path}`;

  const doFetch = async (token: string) => {
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/json',
        'Authorization-Type': 'v2',
        Authorization: `Bearer ${token}`,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  };

  let token = await getValidAccessToken();
  if (!token) throw new NotSignedInError();

  let res = await doFetch(token);

  if (res.status === 401) {
    // Access token might be revoked or invalidated server-side.
    // Try a refresh once, then retry.
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(refreshed.accessToken);
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ChallongeError(res.status, body);
  }

  // JSON:API bodies are always JSON; empty 204 shouldn't happen for these endpoints.
  return (await res.json()) as T;
}

// -----------------------------------------------------------------------------
// JSON:API shape helpers
// -----------------------------------------------------------------------------

interface JsonApiObject<TAttrs> {
  id: string;
  type: string;
  attributes: TAttrs;
  relationships?: Record<string, unknown>;
}
interface JsonApiSingle<TAttrs> { data: JsonApiObject<TAttrs>; }
interface JsonApiList<TAttrs> { data: JsonApiObject<TAttrs>[]; }

interface TournamentAttrs {
  name: string;
  url: string;
  tournament_type: string;
  state: string;
}

interface ParticipantAttrs {
  name?: string;
  display_name?: string;
  seed: number;
}

interface MatchAttrs {
  round: number;
  state: string;
  player1_id: number | null;
  player2_id: number | null;
  scores_csv?: string;
  scores?: Array<{ scores: number[] } | number[]>;
  score_in_sets?: unknown;
  winner_id: number | null;
  identifier: string;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Fetch a tournament by slug or ID, along with its participants and matches.
 *
 * v2.1 doesn't support `include_participants=1` / `include_matches=1` query
 * expansions — we make three parallel calls and merge.
 */
export async function getTournament(
  tournamentIdOrSlug: string
): Promise<ChallongeTournament> {
  const t = encodeURIComponent(tournamentIdOrSlug);

  const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
    api<JsonApiSingle<TournamentAttrs>>(`/tournaments/${t}.json`),
    api<JsonApiList<ParticipantAttrs>>(`/tournaments/${t}/participants.json`),
    api<JsonApiList<MatchAttrs>>(`/tournaments/${t}/matches.json`),
  ]);

  const t0 = tournamentRes.data;

  return {
    id: Number.parseInt(t0.id, 10),
    name: t0.attributes.name,
    url: t0.attributes.url,
    tournament_type: t0.attributes.tournament_type,
    state: t0.attributes.state,
    participants: participantsRes.data.map((p) => ({
      id: Number.parseInt(p.id, 10),
      name: p.attributes.display_name ?? p.attributes.name ?? '',
      seed: p.attributes.seed,
    })),
    matches: matchesRes.data.map((m) => normalizeMatch(m)),
  };
}

function normalizeMatch(
  m: JsonApiObject<MatchAttrs>
): ChallongeMatch {
  const a = m.attributes;
  // v2.1 has richer score representations. For our UI we only need the CSV.
  // If Challonge already gave us scores_csv, use it; otherwise best-effort
  // reconstruction is deferred (we mainly care about `state` and `winner_id`).
  return {
    id: Number.parseInt(m.id, 10),
    round: a.round,
    state: a.state,
    player1_id: a.player1_id,
    player2_id: a.player2_id,
    scores_csv: a.scores_csv ?? '',
    winner_id: a.winner_id,
    identifier: a.identifier,
  };
}

/**
 * Report a final score for a match.
 *
 * v2.1 shape (from Challonge docs, "Update Match" and "Running a Two-Stage
 * Tournament"): a `data.attributes.match` array where each entry is a
 * participant's score line. The winning entry gets `advancing: true`.
 *
 * We collapse race-to-N to a single set: `score_set: "<N>"`.
 */
export async function postMatchScore(
  tournamentIdOrSlug: string,
  challongeMatchId: number,
  args: {
    p1Score: number;
    p2Score: number;
    p1ParticipantId: number;
    p2ParticipantId: number;
    winnerParticipantId: number;
  }
): Promise<ChallongeMatch> {
  const path =
    `/tournaments/${encodeURIComponent(tournamentIdOrSlug)}` +
    `/matches/${challongeMatchId}.json`;

  const body = {
    data: {
      type: 'Match',
      attributes: {
        match: [
          {
            participant_id: String(args.p1ParticipantId),
            score_set: String(args.p1Score),
            advancing: args.winnerParticipantId === args.p1ParticipantId,
          },
          {
            participant_id: String(args.p2ParticipantId),
            score_set: String(args.p2Score),
            advancing: args.winnerParticipantId === args.p2ParticipantId,
          },
        ],
      },
    },
  };

  const res = await api<JsonApiSingle<MatchAttrs>>(path, {
    method: 'PUT',
    body,
  });

  return normalizeMatch(res.data);
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
  const noProto = s.replace(/^https?:\/\//, '');
  const parts = noProto.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  const slug = parts.length === 1 ? parts[0] : parts[parts.length - 1];
  return slug;
}
