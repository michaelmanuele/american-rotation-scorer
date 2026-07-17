/**
 * AMRO Scorer OAuth backend
 * ============================
 *
 * A tiny Cloudflare Worker that lets the AMRO Scorer mobile app authenticate
 * users against Challonge via OAuth 2.0 (Authorization Code + PKCE).
 *
 * Why this exists
 * ---------------
 * Challonge OAuth requires a client_secret. That secret cannot ship in a
 * mobile app (anyone could extract it). This Worker holds the secret and
 * acts as a broker: the app talks to this Worker, the Worker talks to
 * Challonge.
 *
 * Endpoints
 * ---------
 * GET  /callback  - Challonge redirects users here after they log in.
 *                    We forward the ?code + ?state to the app's custom
 *                    URL scheme (arscorer://auth-callback), which reopens
 *                    the app.
 *
 * POST /token     - App posts { code, code_verifier } here after receiving
 *                    the code. We call Challonge /oauth/token to exchange
 *                    the code for access + refresh tokens, then return
 *                    them to the app.
 *
 * POST /refresh   - App posts { refresh_token } here when its access token
 *                    expires. We call Challonge /oauth/token with
 *                    grant_type=refresh_token and return the new tokens.
 *
 * GET  /health    - Sanity check.
 *
 * Secrets required (set via `wrangler secret put`)
 * -----------------------------------------------
 *   CHALLONGE_CLIENT_ID      Challonge Connect app client id
 *   CHALLONGE_CLIENT_SECRET  Challonge Connect app client secret
 *   APP_REDIRECT_SCHEME      e.g. "arscorer://auth-callback"
 *                              (the URL the app registered for deep links)
 */

import { handlePrivacy, handleTerms } from './legal';

export interface Env {
  CHALLONGE_CLIENT_ID: string;
  CHALLONGE_CLIENT_SECRET: string;
  /**
   * The custom URL scheme the mobile app registers. Challonge sends users
   * to /callback (this Worker), and /callback redirects them here to reopen
   * the app.
   */
  APP_REDIRECT_SCHEME: string;
}

const CHALLONGE_TOKEN_URL = 'https://api.challonge.com/oauth/token';

/** CORS headers we return on every response so the mobile app can call us. */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

/** Return the URL this Worker is currently deployed at (origin only). */
function selfOrigin(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * GET /callback
 *
 * Challonge sends the user here after they authenticate. We take whatever
 * query params Challonge attached (?code=..., ?state=..., or ?error=...)
 * and redirect the browser to the app's custom URL scheme so the mobile
 * OS reopens the app with those params.
 */
async function handleCallback(req: Request, env: Env): Promise<Response> {
  const inUrl = new URL(req.url);
  const params = inUrl.searchParams;

  const target = new URL(env.APP_REDIRECT_SCHEME);
  // Forward every query param Challonge gave us (code, state, error, etc.).
  for (const [k, v] of params.entries()) {
    target.searchParams.set(k, v);
  }

  // 302 to the custom scheme so iOS/Android reopens the app.
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      // Small human-readable body in case a browser doesn't follow the redirect
      // (e.g. testing on desktop where the app isn't installed).
      'Content-Type': 'text/html; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

interface TokenBody {
  code?: string;
  code_verifier?: string;
}

/**
 * POST /token
 * Body: { code, code_verifier }
 *
 * Exchanges the auth code for access + refresh tokens.
 */
async function handleTokenExchange(
  req: Request,
  env: Env
): Promise<Response> {
  let body: TokenBody;
  try {
    body = (await req.json()) as TokenBody;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const code = body.code?.trim();
  const codeVerifier = body.code_verifier?.trim();
  if (!code || !codeVerifier) {
    return json({ error: 'missing_code_or_verifier' }, 400);
  }

  // Challonge's docs (apidog) show params in the query string, not the body.
  // Also try Basic auth for client credentials.
  const qs = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.CHALLONGE_CLIENT_ID,
    client_secret: env.CHALLONGE_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    redirect_uri: `${selfOrigin(req)}/callback`,
  });

  const upstream = await fetch(`${CHALLONGE_TOKEN_URL}?${qs.toString()}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  const upstreamText = await upstream.text();

  // Diagnostic logging (visible via `wrangler tail`). Never log the client_secret.
  console.log('[token] challonge status:', upstream.status);
  console.log('[token] challonge body:', upstreamText);
  console.log('[token] code (first 8):', code.slice(0, 8), '(last 4):', code.slice(-4));
  console.log('[token] full URL:', `${CHALLONGE_TOKEN_URL}?${qs.toString()}`.replace(env.CHALLONGE_CLIENT_SECRET, '[SECRET]'));
  console.log('[token] sent params:', JSON.stringify({
    grant_type: 'authorization_code',
    client_auth: 'query string params',
    client_id_len: env.CHALLONGE_CLIENT_ID.length,
    code_len: code.length,
    code_verifier_len: codeVerifier.length,
    redirect_uri: `${selfOrigin(req)}/callback`,
  }));

  // Pass Challonge's response straight through so the app can log errors.
  return new Response(upstreamText, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

interface RefreshBody {
  refresh_token?: string;
}

/**
 * POST /refresh
 * Body: { refresh_token }
 */
async function handleTokenRefresh(
  req: Request,
  env: Env
): Promise<Response> {
  let body: RefreshBody;
  try {
    body = (await req.json()) as RefreshBody;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const refreshToken = body.refresh_token?.trim();
  if (!refreshToken) {
    return json({ error: 'missing_refresh_token' }, 400);
  }

  const qs = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.CHALLONGE_CLIENT_ID,
    client_secret: env.CHALLONGE_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const upstream = await fetch(`${CHALLONGE_TOKEN_URL}?${qs.toString()}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  const upstreamText = await upstream.text();
  return new Response(upstreamText, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function handleHealth(): Response {
  return json({
    ok: true,
    service: 'arscorer-oauth',
    time: new Date().toISOString(),
  });
}

/** Basic router. */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      return handleHealth();
    }
    if (req.method === 'GET' && (url.pathname === '/privacy' || url.pathname === '/privacy.html')) {
      return handlePrivacy();
    }
    if (req.method === 'GET' && (url.pathname === '/terms' || url.pathname === '/terms.html')) {
      return handleTerms();
    }
    if (req.method === 'GET' && url.pathname === '/callback') {
      return handleCallback(req, env);
    }
    if (req.method === 'POST' && url.pathname === '/token') {
      return handleTokenExchange(req, env);
    }
    if (req.method === 'POST' && url.pathname === '/refresh') {
      return handleTokenRefresh(req, env);
    }

    return text('Not found', 404);
  },
};
