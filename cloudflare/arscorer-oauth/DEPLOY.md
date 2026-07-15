# AMRO Scorer OAuth Backend — Deploy Guide

A tiny Cloudflare Worker that lets the mobile app authenticate users
against Challonge OAuth without shipping the client secret in the app.

**You only run these steps once.** After first deploy, subsequent updates
are `wrangler deploy` from this directory.

---

## 1. Install dependencies

From the repo root:

```
cd cloudflare/arscorer-oauth
npm install
```

That grabs `wrangler` locally and TypeScript types. You already have
wrangler installed globally (from the earlier `npm install -g wrangler`),
so this is mostly just types.

## 2. Set the three secrets

These live on Cloudflare's side, encrypted. They are NEVER checked into git.

Run each command in your terminal — each will prompt you to paste the value
(the value won't be echoed to your screen):

```
wrangler secret put CHALLONGE_CLIENT_ID
```
Paste:  `fdd3478c08aff808560419c9227a4520215fc9adea07511e6b55b09e176901dc`

```
wrangler secret put CHALLONGE_CLIENT_SECRET
```
Paste your Challonge client secret (the one starting with `74c9e0...`).

```
wrangler secret put APP_REDIRECT_SCHEME
```
Paste:  `arscorer://auth-callback`

## 3. Deploy

```
wrangler deploy
```

You should see something like:

```
Total Upload: XX KiB / gzip: X KiB
Uploaded arscorer-oauth (X.XX sec)
Deployed arscorer-oauth triggers (X.XX sec)
  https://arscorer-oauth.<your-subdomain>.workers.dev
```

**Copy that URL — you need it in the next step.**

## 4. Test it works

```
curl https://arscorer-oauth.<your-subdomain>.workers.dev/health
```

You should get back:
```
{"ok":true,"service":"arscorer-oauth","time":"2026-07-15T..."}
```

If yes → the Worker is live and reachable. Continue.

## 5. Update Challonge OAuth URL

1. Go to https://connect.challonge.com and open your AMRO Scorer app
2. Replace the placeholder OAuth URL with:
   ```
   https://arscorer-oauth.<your-subdomain>.workers.dev/callback
   ```
   (Same URL as step 4, but with `/callback` appended.)
3. Hit **SAVE**
4. Confirm you see "Your changes have been saved"

## 6. Update the mobile app's environment

Open the repo root's `.env` (or `app.json` `extra` block — will be created
next) and paste the Worker URL as the value of `EXPO_PUBLIC_OAUTH_BASE_URL`:

```
EXPO_PUBLIC_OAUTH_BASE_URL=https://arscorer-oauth.<your-subdomain>.workers.dev
```

(The mobile-app changes come in a follow-up commit — Michael will tell you
when the app knows to look for this variable.)

## 7. Later — updating the Worker

Whenever the Worker code changes:

```
cd cloudflare/arscorer-oauth
wrangler deploy
```

Done. No secret changes needed. No app rebuild needed. The Worker URL
stays the same across deploys.

## Debugging

- Watch live logs: `wrangler tail`
- Check current secrets: `wrangler secret list`
- Check current deploys: https://dash.cloudflare.com → Workers & Pages

## Cost

At AMRO league scale (~80-200 requests/month), you'll use less than 0.01%
of the Cloudflare Workers free tier (100,000 requests/day). Should cost
$0/month indefinitely.
