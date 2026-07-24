# Store Listing Copy — American Rotation Scorer

Canonical source of truth for app store submissions (Play Store first, App Store next). Copy from this file into the console; edit here first, not in the console.

**App name:** American Rotation Scorer
**Tagline:** The best American Rotation scorer on the market.
**Category:** Sports
**Content rating:** Everyone (IARC 3+)
**Target audience:** 18+

---

## Short description (80 char max)

Play Store limit: 80 characters. Shows in search results and small-format listings.

```
The best American Rotation scorer on the market. Race format, ball-by-ball.
```

**Length:** 73 characters ✅

---

## Full description (4000 char max)

Play Store limit: 4000 characters. Shows on the app's main store page.

```
The best American Rotation scorer on the market.

American Rotation Scorer is built for one job: scoring American Rotation matches, fast and accurately. No bloat, no distractions, no data you don't need.

HOW IT WORKS

Set up your match in seconds — two players, race-to length, and you're live.

The match screen shows exactly what you need and nothing you don't:
• Both players side by side with current score
• All 15 balls visible with point values
• Current frame
• Running match timer

Tap balls as they drop. Points update instantly. When a rack ends, you move to the next frame. When someone hits the race target, the match is over.

That's it. No handicaps to configure. No mental state prompts. No replay overlays. Just clean, honest scoring for a clean, honest game.

BUILT FOR ROTATION

American Rotation is a sequential game. Balls have to fall in numerical order. Points come from balls made, not games won. Every ball matters and every point counts.

A general-purpose pool scoring app can't handle this cleanly — American Rotation Scorer was built from the ground up for the format. Point totals update the moment a ball drops. Ball values are visible at a glance. The interface understands the game.

PRIVATE BY DEFAULT

Match data stays on your phone. No account required. No cloud sync. No analytics. No ads. Nothing collected, nothing shared. When American Rotation Scorer connects to Challonge for tournament brackets, the only thing pushed to Challonge is the final match score — nothing else leaves your device.

WHO IT'S FOR

Anyone playing American Rotation, anywhere. AMRO league players. Tournament competitors. Regional groups. Casual players who want a real scorer instead of a whiteboard or a napkin.

If you play American Rotation and you're tired of scoring it wrong, you found the right app.
```

**Length:** ~1,700 characters ✅ (room to grow up to 4000)

---

## Assets checklist

Files live in `/home/user/workspace/play_store_assets/` (workspace) — download from the Files panel.

| Asset | Spec | Status | File |
|---|---|---|---|
| App icon | 512×512 PNG, RGB (no alpha) | ✅ Ready | `ar_play_icon_512.png` |
| Feature graphic | 1024×500 PNG, RGB | ✅ Ready | `ar_feature_graphic_1024x500.png` |
| Phone screenshots | 2-8 required, 320-3840px shortest side, 16:9 or 9:16 | ⏳ Blocked on Pixel install | — |
| 7-inch tablet screenshots | Optional, 320-3840px | ⏳ Optional, defer | — |
| 10-inch tablet screenshots | Optional, 320-3840px | ⏳ Optional, defer | — |

**Screenshot targets** (once Pixel has the preview build):

1. Match in progress — side-by-side player cards, all 15 balls visible, current score
2. Match setup screen — two players + race-to length
3. Match end / summary screen
4. All-matches list / history view
5. Optional: settings, onboarding, or any polished secondary screen

---

## Metadata already saved in Play Console

For reference — don't need to re-enter these:

- **Privacy policy URL:** `https://michaelmanuele.github.io/american-rotation-scorer/privacy-policy`
- **Sign in details:** No restrictions
- **Ads:** No
- **Government / Financial / Health:** No
- **Content rating:** Everyone (IARC 3+)
- **Target audience:** 18+
- **Data safety:** No data collected, no data shared
- **App category:** Sports
- **Tags:** Activity tracker, Sports, Sports coaching
- **Contact email:** `mikeonthefelt@gmail.com`

---

## What still needs adding pre-submission

1. **Phone screenshots** — blocked on EAS Android build → Pixel install → capture
2. **Store listing final review** — proofread once everything's in the console
3. **Upload production AAB** to Closed Testing track (separate build after this preview build)
4. **Recruit 12 testers** — 14-day active testing minimum before production release

---

## Editing rules

- Never edit copy directly in Play Console without updating this file first
- Same short/full descriptions work for App Store Connect (iOS) with these adjustments:
  - App Store subtitle field = short description
  - App Store description field = full description
  - App Store promotional text field = the tagline "The best American Rotation scorer on the market."
- Bump the version banner at the top when the copy changes materially
