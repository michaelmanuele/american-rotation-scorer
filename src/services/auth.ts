/**
 * Challonge OAuth 2.0 (Authorization Code + PKCE) via the arscorer-oauth
 * Cloudflare Worker broker.
 *
 * Flow
 * ----
 * 1. App generates a PKCE code_verifier/code_challenge pair.
 * 2. App opens Challonge /oauth/authorize in an in-app browser (ASWebAuthenticationSession
 *    on iOS, Custom Tabs on Android) with:
 *       - client_id
 *       - redirect_uri = Worker /callback
 *       - response_type=code
 *       - scope = full read+write set
 *       - state, code_challenge, code_challenge_method=S256
 * 3. User logs in on challonge.com and approves.
 * 4. Challonge 302s to Worker /callback?code=...&state=...
 * 5. Worker 302s to arscorer://auth-callback?code=...&state=... which reopens the app.
 * 6. App POSTs { code, code_verifier } to Worker /token.
 * 7. Worker exchanges with Challonge (using its client_secret) and returns
 *    { access_token, refresh_token, expires_in, ... }.
 * 8. App stores tokens in expo-secure-store.
 *
 * Refresh
 * -------
 * Access tokens live 1 week (604800s). refreshAccessToken() posts the refresh
 * token to Worker /refresh to get a new access token. Called automatically on
 * 401 by the Challonge v2.1 client.
 */
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

// Required on Android so the browser tab dismisses cleanly after the redirect.
// No-op on iOS. Safe to call at module scope.
WebBrowser.maybeCompleteAuthSession();

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CHALLONGE_AUTHORIZE_URL = 'https://api.challonge.com/oauth/authorize';

/** Full scope set. Everything Challonge offers — read+write on everything. */
export const CHALLONGE_SCOPES = [
  'me',
  'tournaments:read',
  'tournaments:write',
  'matches:read',
  'matches:write',
  'participants:read',
  'participants:write',
].join(' ');

// Client ID is public (safe to ship in the app); client_secret stays on the Worker.
const CHALLONGE_CLIENT_ID =
  'fdd3478c08aff808560419c9227a4520215fc9adea07511e6b55b09e176901dc';

/** OAuth broker Worker base URL, from app.json `extra.oauthBaseUrl`. */
function getOauthBaseUrl(): string {
  const fromConfig = (Constants.expoConfig?.extra as any)?.oauthBaseUrl;
  if (typeof fromConfig === 'string' && fromConfig.length > 0) return fromConfig;
  throw new Error(
    'oauthBaseUrl missing from app.json extra. Add extra.oauthBaseUrl.'
  );
}

/**
 * The redirect URI the app tells Challonge to use. This must exactly match
 * the OAuth URL configured in the Challonge Connect Developer Portal.
 */
function getCallbackUrl(): string {
  return `${getOauthBaseUrl()}/callback`;
}

// -----------------------------------------------------------------------------
// Token storage
// -----------------------------------------------------------------------------

const KEY_ACCESS = 'challonge_access_token';
const KEY_REFRESH = 'challonge_refresh_token';
/** Unix ms when the access token expires. */
const KEY_EXPIRES_AT = 'challonge_expires_at';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const [access, refresh, expiresAtStr] = await Promise.all([
      SecureStore.getItemAsync(KEY_ACCESS),
      SecureStore.getItemAsync(KEY_REFRESH),
      SecureStore.getItemAsync(KEY_EXPIRES_AT),
    ]);
    if (!access || !refresh || !expiresAtStr) return null;
    return {
      accessToken: access,
      refreshToken: refresh,
      expiresAt: Number.parseInt(expiresAtStr, 10),
    };
  } catch {
    return null;
  }
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
    SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
    SecureStore.setItemAsync(KEY_EXPIRES_AT, String(tokens.expiresAt)),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS).catch(() => {}),
    SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => {}),
    SecureStore.deleteItemAsync(KEY_EXPIRES_AT).catch(() => {}),
  ]);
}

export async function isSignedIn(): Promise<boolean> {
  const t = await loadTokens();
  return t !== null;
}

// -----------------------------------------------------------------------------
// Authorization Code + PKCE flow
// -----------------------------------------------------------------------------

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function normalizeTokenResponse(raw: RawTokenResponse): StoredTokens {
  if (raw.error) {
    throw new Error(
      `Challonge OAuth error: ${raw.error} ${raw.error_description ?? ''}`.trim()
    );
  }
  if (!raw.access_token || !raw.refresh_token || !raw.expires_in) {
    throw new Error('Challonge OAuth response missing required fields');
  }
  // expires_in is seconds; subtract 60s slack so we refresh before the server thinks we're expired.
  const expiresAt = Date.now() + (raw.expires_in - 60) * 1000;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt,
  };
}

export type SignInResult =
  | { ok: true; tokens: StoredTokens }
  | { ok: false; error: string };

/**
 * Exchange the auth code for tokens via the Worker, then persist them.
 * Called by the sign-in hook after promptAsync succeeds.
 */
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<SignInResult> {
  try {
    const res = await fetch(`${getOauthBaseUrl()}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    });

    const raw = (await res.json().catch(() => ({}))) as RawTokenResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: raw.error ?? `token_exchange_failed_${res.status}`,
      };
    }

    const tokens = normalizeTokenResponse(raw);
    await saveTokens(tokens);
    return { ok: true, tokens };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * React hook — must be called at the top level of a component.
 *
 * Returns a `signIn()` function that opens Challonge login, waits for the
 * callback, exchanges the code for tokens, and persists them.
 *
 * Uses expo-auth-session's `useAuthRequest` hook because it correctly awaits
 * the async PKCE code_challenge generation before opening the browser.
 * Calling `new AuthRequest(...)` synchronously and then `promptAsync()`
 * silently no-ops on v7 because the request isn't ready.
 */
export function useChallongeSignIn(): {
  ready: boolean;
  signIn: () => Promise<SignInResult>;
} {
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CHALLONGE_CLIENT_ID,
      redirectUri: getCallbackUrl(),
      scopes: CHALLONGE_SCOPES.split(' '),
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    {
      authorizationEndpoint: CHALLONGE_AUTHORIZE_URL,
      tokenEndpoint: `${getOauthBaseUrl()}/token`,
    }
  );

  const signIn = useCallback(async (): Promise<SignInResult> => {
    if (!request) {
      return { ok: false, error: 'auth_request_not_ready' };
    }
    try {
      // DEBUG v0.2.2: log the URL we're about to open
      console.log('[auth] redirectUri:', getCallbackUrl());
      console.log('[auth] authorizeUrl:', CHALLONGE_AUTHORIZE_URL);
      console.log('[auth] scopes:', CHALLONGE_SCOPES);
      const result = await promptAsync();
      console.log('[auth] promptAsync result:', JSON.stringify(result));

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { ok: false, error: `${result.type} (redirectUri=${getCallbackUrl()})` };
      }
      if (result.type === 'error') {
        return {
          ok: false,
          error:
            result.error?.message ?? result.params?.error ?? 'unknown_error',
        };
      }
      if (result.type !== 'success') {
        return { ok: false, error: `unexpected_result_type:${result.type}` };
      }

      const code = result.params.code;
      if (!code) {
        return { ok: false, error: 'no_authorization_code_returned' };
      }
      if (!request.codeVerifier) {
        return { ok: false, error: 'pkce_verifier_missing' };
      }

      return exchangeCodeForTokens(code, request.codeVerifier);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }, [request, promptAsync]);

  return { ready: request !== null, signIn };
}

/**
 * Uses the stored refresh_token to get a fresh access_token from the Worker.
 * Called automatically by the Challonge v2.1 client on 401 or when the token
 * is close to expiry.
 */
export async function refreshAccessToken(): Promise<StoredTokens | null> {
  const current = await loadTokens();
  if (!current) return null;

  try {
    const res = await fetch(`${getOauthBaseUrl()}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });

    const raw = (await res.json().catch(() => ({}))) as RawTokenResponse;
    if (!res.ok || raw.error) {
      // Refresh token likely expired/revoked. Wipe local state so the app
      // knows to prompt for a new sign-in.
      await clearTokens();
      return null;
    }
    const tokens = normalizeTokenResponse(raw);
    await saveTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token, refreshing proactively if we're within the
 * expiry window. Returns null if the user isn't signed in or the refresh failed.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const current = await loadTokens();
  if (!current) return null;

  // Refresh proactively if within 30 min of expiry.
  const REFRESH_SLACK_MS = 30 * 60 * 1000;
  if (Date.now() < current.expiresAt - REFRESH_SLACK_MS) {
    return current.accessToken;
  }

  const refreshed = await refreshAccessToken();
  return refreshed?.accessToken ?? null;
}

export async function signOut(): Promise<void> {
  await clearTokens();
}
