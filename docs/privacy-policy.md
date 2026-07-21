# Privacy Policy — American Rotation Scorer

**Last updated:** July 21, 2026
**Contact:** manuelem@mac.com

This Privacy Policy describes how American Rotation Scorer ("the App", "we", "us") handles information when you use the App. American Rotation Scorer is a personal-use pool match scoring app built and operated by Michael Manuele as an independent developer.

We designed the App to be **local-first**: your matches, players, and settings live on your device. We do not run our own analytics servers, ad networks, or user accounts.

## Summary — What we do and do not collect

**We do not collect:**

- Your name, email address, phone number, or postal address
- Any personally identifiable information tied to you as an individual
- Location data
- Contacts, photos, calendar, or health data
- Advertising identifiers
- Analytics or crash telemetry (currently — see "Future changes" below)

**We do store, on your device only:**

- Player names you enter into the roster
- Match scores, frames, and timing you record during play
- App settings and preferences
- If you sign in to Challonge (optional): a Challonge OAuth access token and refresh token, stored in the platform secure store (iOS Keychain / Android Keystore), used only to communicate with Challonge on your behalf

## Data storage

All data is stored locally on your device using the operating system's standard app-storage APIs. Uninstalling the App deletes all associated data.

The App does not synchronize your data to any cloud service operated by us. There is no backup service, no shared database, and no cross-device sync.

## Optional Challonge integration

The App offers an optional integration with [Challonge](https://challonge.com/), a third-party tournament management service. This integration is off by default and only activates if you tap "Sign in with Challonge" and complete their OAuth sign-in flow.

If you enable the integration:

- The App sends you to Challonge's website to sign in. We never see your Challonge password.
- Challonge returns an access token that the App stores in the device's secure store.
- The App uses that token to read tournament, match, and participant data from Challonge on your behalf, and (if you choose) to write match scores back.
- The exchange of your OAuth authorization code for tokens happens on a Cloudflare Worker we operate at `arscorer-oauth.mikeonthefelt.workers.dev`. This worker sees your authorization code and returns access + refresh tokens back to your device. It does not persistently store the code or tokens.

Challonge is a separate company with its own privacy policy: [https://challonge.com/privacy_policy](https://challonge.com/privacy_policy).

## Network traffic

The App makes network requests in the following cases:

- **Challonge integration** (optional, only if signed in): requests to `api.challonge.com` and our OAuth Worker
- **Expo Application Services**: over-the-air JavaScript updates from Expo. This is standard for Expo-based apps.

We do not send any custom telemetry, analytics events, crash reports, or usage data to any server operated by us.

## Children

American Rotation Scorer is not directed to children under 13. We do not knowingly collect information from children under 13.

## Your rights and choices

Because we do not hold any of your data on our servers, there is no account to close, no data to export, and no data to delete on our side. You control all data through the App itself and your device's standard app-management controls.

To delete all data collected by the App, uninstall it. On iOS this removes all local storage and Keychain entries; on Android it removes all local storage and Keystore entries.

## Third parties

- **Challonge** (optional, when you sign in): see their privacy policy
- **Cloudflare Workers** (our OAuth broker, only when signing in to Challonge): standard Cloudflare edge logs; see [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/)
- **Expo Application Services** (for over-the-air app updates): see [Expo's privacy policy](https://expo.dev/privacy)

We do not sell, rent, or share your data with any other third parties.

## Future changes

If we ever add crash reporting, analytics, cloud sync, or any other feature that would change what data leaves your device, we will update this Privacy Policy before that feature is enabled and reflect the change in the App's version notes.

## Contact

Questions about this Privacy Policy or the App's data practices:

**Michael Manuele**
Email: manuelem@mac.com
