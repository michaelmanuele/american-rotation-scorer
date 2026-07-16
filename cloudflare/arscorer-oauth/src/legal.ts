/**
 * Static legal pages served from the Worker.
 *
 * Kept as raw HTML strings (rather than a template engine) so this Worker
 * stays a single small file with zero build dependencies.
 *
 * Any material change: bump EFFECTIVE_DATE.
 */

const EFFECTIVE_DATE = 'July 16, 2026';
const DEVELOPER = 'Michael Manuele';
const CONTACT_EMAIL = 'manuelem@mac.com';
const APP_NAME = 'AMRO Scorer';

const SHARED_CSS = `
  :root {
    --bg: #0B0F14;
    --surface: #131922;
    --text: #E8EAED;
    --muted: #9AA0A6;
    --accent: #E91E63;
    --border: #1F2733;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
  }
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px 96px;
  }
  header { margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
  header .eyebrow {
    font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--accent); font-weight: 700; margin-bottom: 8px;
  }
  header h1 { font-size: 28px; margin: 0 0 6px; font-weight: 800; }
  header .effective { color: var(--muted); font-size: 14px; }
  h2 { font-size: 18px; margin: 32px 0 10px; font-weight: 700; }
  p, li { color: var(--text); font-size: 15px; }
  ul { padding-left: 22px; }
  li { margin-bottom: 6px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .muted { color: var(--muted); }
  footer {
    margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--border);
    color: var(--muted); font-size: 13px;
  }
  footer a { color: var(--muted); }
`.trim();

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · ${APP_NAME}</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <main>
    ${bodyHtml}
    <footer>
      <p>${APP_NAME} is developed by ${DEVELOPER}. Questions? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
      <p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>
    </footer>
  </main>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Privacy Policy
// ---------------------------------------------------------------------------

const PRIVACY_BODY = `
<header>
  <div class="eyebrow">${APP_NAME}</div>
  <h1>Privacy Policy</h1>
  <div class="effective">Effective ${EFFECTIVE_DATE}</div>
</header>

<p>
  ${APP_NAME} (&ldquo;the app&rdquo;) is a personal tool for tracking American Rotation
  pool matches. This policy describes what information the app handles, where
  it goes, and what it does not do.
</p>

<h2>Who runs the app</h2>
<p>
  ${APP_NAME} is developed and maintained by ${DEVELOPER}, an individual
  developer. There is no company behind it. Contact:
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
</p>

<h2>What data the app stores on your device</h2>
<p>
  All match data you create — players, matches, frames, scores, and settings —
  is stored locally on your device in a SQLite database maintained by the app.
  It never leaves your device unless you explicitly post a match score to
  Challonge (see below).
</p>
<p>
  If you sign in with Challonge, the app stores your Challonge access token
  and refresh token in your device&rsquo;s secure keystore
  (Apple Keychain on iOS, Android Keystore on Android). These tokens are used
  to authenticate your requests to Challonge on your behalf.
</p>

<h2>What data leaves your device</h2>
<p>
  The app connects to two services, only when you actively use them:
</p>
<ul>
  <li>
    <strong>Challonge</strong> (<a href="https://challonge.com" rel="noopener">challonge.com</a>).
    When you sign in with Challonge, you authenticate directly with Challonge
    through their standard OAuth login page. When you post a match score, the
    score and winner are sent to Challonge to update the tournament bracket.
    Your use of Challonge is governed by
    <a href="https://challonge.com/privacy" rel="noopener">Challonge&rsquo;s privacy policy</a>.
  </li>
  <li>
    <strong>The ${APP_NAME} OAuth broker</strong>
    (<code>arscorer-oauth.mikeonthefelt.workers.dev</code>).
    This is a small server run by the developer that helps the app complete
    the Challonge sign-in flow. It receives the temporary authorization code
    Challonge sends after you log in, exchanges it for your tokens, and returns
    those tokens to your device. The broker does not store your tokens, your
    match data, your Challonge account details, or any usage logs beyond
    routine short-term server logs kept for infrastructure reliability
    (typically containing only IP address and timestamp).
  </li>
</ul>

<h2>What the app does not do</h2>
<ul>
  <li>The app does not include any analytics, tracking pixels, or advertising.</li>
  <li>The app does not include any third-party crash reporting.</li>
  <li>The app does not sell, rent, or share your data with anyone.</li>
  <li>The app does not maintain a server-side database of your matches, your
      Challonge account, or your usage.</li>
  <li>The app does not access your contacts, camera, microphone, photos, or
      location.</li>
</ul>

<h2>Children</h2>
<p>
  ${APP_NAME} is intended for adult use in the context of pool leagues and
  tournaments. It is not directed at children under 13, and it does not
  knowingly collect any information from children.
</p>

<h2>Your control over your data</h2>
<ul>
  <li>You can sign out of Challonge at any time from the Settings screen.
      Signing out immediately deletes the stored tokens from your device.</li>
  <li>You can delete all local app data by deleting the app from your device.</li>
  <li>To delete your Challonge account or the data Challonge holds about you,
      visit <a href="https://challonge.com" rel="noopener">challonge.com</a>.</li>
</ul>

<h2>Changes to this policy</h2>
<p>
  If this policy changes, the effective date at the top of this page will be
  updated. Because the app does not have your contact information, changes will
  not be individually notified; check this page from Settings inside the app.
</p>

<h2>Contact</h2>
<p>
  Questions about this policy? Email
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
</p>
`.trim();

// ---------------------------------------------------------------------------
// Terms of Service
// ---------------------------------------------------------------------------

const TERMS_BODY = `
<header>
  <div class="eyebrow">${APP_NAME}</div>
  <h1>Terms of Service</h1>
  <div class="effective">Effective ${EFFECTIVE_DATE}</div>
</header>

<p>
  These terms govern your use of ${APP_NAME} (&ldquo;the app&rdquo;). By
  installing or using the app, you agree to these terms. If you do not agree,
  do not install or use the app.
</p>

<h2>What the app is</h2>
<p>
  ${APP_NAME} is a personal tool that helps players score American Rotation
  pool matches and optionally post the resulting scores to their Challonge
  tournament bracket. It is developed by ${DEVELOPER}, an individual, and is
  provided free of charge.
</p>

<h2>Your account and credentials</h2>
<ul>
  <li>You are responsible for your own Challonge account, including keeping
      your credentials secure.</li>
  <li>You are responsible for using the app only in ways permitted by
      Challonge&rsquo;s own
      <a href="https://challonge.com/tou" rel="noopener">Terms of Use</a> and
      <a href="https://challonge.com/privacy" rel="noopener">Privacy Policy</a>.</li>
  <li>You may only sign in as yourself. Do not use the app to sign in on
      behalf of another player, or to report scores you are not authorized to
      report on Challonge.</li>
</ul>

<h2>Acceptable use</h2>
<p>You agree not to:</p>
<ul>
  <li>Attempt to interfere with, reverse-engineer, or attack the app or its
      OAuth broker service beyond ordinary use.</li>
  <li>Use the app to submit fraudulent or manipulated tournament results.</li>
  <li>Use the app in a way that violates any applicable law.</li>
</ul>

<h2>Availability and changes</h2>
<p>
  The app and its OAuth broker are provided on an as-available basis. The
  developer may modify, suspend, or discontinue any part of the app or the
  broker at any time, without notice. Features may change between versions.
</p>

<h2>Third-party services</h2>
<p>
  The app relies on Challonge to store tournament data, participants, and
  match results. The developer does not control Challonge and is not
  responsible for Challonge&rsquo;s uptime, features, data handling, or
  actions. Your relationship with Challonge is governed by Challonge&rsquo;s
  own terms and privacy policy.
</p>

<h2>Disclaimer of warranties</h2>
<p>
  THE APP IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo;
  WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
  LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
  ACCURACY, OR NON-INFRINGEMENT. THE DEVELOPER DOES NOT WARRANT THAT THE APP
  WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT SCORES WILL POST SUCCESSFULLY TO
  CHALLONGE ON ANY GIVEN ATTEMPT.
</p>

<h2>Limitation of liability</h2>
<p>
  TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPER SHALL NOT BE LIABLE
  FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
  OR ANY LOSS OF DATA, PROFITS, OR TOURNAMENT PROGRESS, ARISING FROM YOUR USE
  OF, OR INABILITY TO USE, THE APP. THE DEVELOPER&rsquo;S TOTAL LIABILITY FOR
  ANY CLAIM ARISING FROM OR RELATING TO THE APP IS LIMITED TO USD $0, WHICH
  REFLECTS THAT THE APP IS PROVIDED FREE OF CHARGE.
</p>

<h2>Termination</h2>
<p>
  You may stop using the app at any time by uninstalling it. The developer may
  revoke your access to the OAuth broker at any time, for any reason,
  including but not limited to violation of these terms.
</p>

<h2>Governing law</h2>
<p>
  These terms are governed by the laws of the State of Florida, United States,
  without regard to conflict-of-law principles.
</p>

<h2>Changes to these terms</h2>
<p>
  If these terms change, the effective date at the top of this page will be
  updated. Continued use of the app after a change constitutes acceptance of
  the updated terms.
</p>

<h2>Contact</h2>
<p>
  Questions about these terms? Email
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
</p>
`.trim();

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function handlePrivacy(): Response {
  return htmlResponse(shell('Privacy Policy', PRIVACY_BODY));
}

export function handleTerms(): Response {
  return htmlResponse(shell('Terms of Service', TERMS_BODY));
}
