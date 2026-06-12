# American Rotation Scorer

A native iOS + Android scoring app for **American Rotation** pool.

## Status
🚧 MVP spec finalized — scaffold pending

## Stack
- **Framework**: React Native + Expo (managed workflow)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State**: Zustand (persisted)
- **Local storage**: expo-sqlite (roster + match history)
- **Backend (post-MVP)**: PocketBase with local-first sync
- **Distribution**: EAS Build → TestFlight + Play Internal Testing

## Game Rules (MVP)

**Frame = 1 rack of 15 balls**
- Balls 1–10: 1 point each
- Balls 11–15: 2 points each
- Frame max: 20 points
- Frame ends when all 15 balls are pocketed

**Match**
- Race to N total cumulative points (configurable: e.g. 60, 100, 120)
- First player to reach the race target wins
- Coin toss determines breaker; manual override available
- No fouls, safeties, or 3-foul rule in MVP (deferred to v2)

## MVP Features

### In scope
- [ ] Player roster (add/edit: first, last, optional phone)
- [ ] New match setup (pick 2 players, set race target, coin toss)
- [ ] Scoring screen:
  - [ ] Two player cards (MATCH + FRAME totals, initials avatar)
  - [ ] **Tap a player's initials avatar to make them the active shooter** (avatar shows colored when active, neutral when inactive)
  - [ ] Ball grid 1–15 with realistic numbered pool balls (solids + stripes)
  - [ ] Tap ball → credits active player; ball colors to player (orange/green)
  - [ ] Tap pocketed ball → un-pocket (per-ball undo)
  - [ ] Back button → undo last action
  - [ ] Next Frame (enabled when all 15 pocketed)
  - [ ] Frame timer + match timer
  - [ ] Auto-detect race target reached → End Match / Continue Shooting
- [ ] Match summary: final score, match duration, per-player balls pocketed, avg pts/frame, best frame, frame count
- [ ] Match history list (local, SQLite)

### Out of scope (deferred)
- Charts in summary
- Fouls / safeties / 3-foul rule
- Solo practice mode
- Rules viewer
- Settings (haptics, themes)
- PocketBase cloud sync

## Color & Visual Language
- Player 1 = **orange** (`#F58634` ish)
- Player 2 = **green** (`#34C759` ish)
- Unpocketed = neutral gray
- Realistic ball rendering: solids 1–8, stripes 9–15, numbered

## Roadmap
- [ ] **M0**: Expo + TypeScript scaffold, navigation shell
- [ ] **M1**: Player roster CRUD + SQLite schema
- [ ] **M2**: New match flow (player picker, race target, coin toss)
- [ ] **M3**: Scoring screen — ball grid, active-player toggle, scoring logic
- [ ] **M4**: Frame/match timers + auto-detect end-of-match
- [ ] **M5**: Match summary + history list
- [ ] **M6**: Pool ball visual polish (solids/stripes art)
- [ ] **M7**: EAS Build → TestFlight + Play Internal
- [ ] **M8 (v2)**: Fouls/safeties, charts, solo practice
- [ ] **M9 (v2)**: PocketBase cloud sync

## Reference
Inspired by TotalPool (iPadOS) — improving on:
- Native iOS + Android from one codebase
- Realistic ball graphics vs flat tiles
- Clearer active-player state
- Correct American Rotation scoring (1 pt for 1–10, 2 pts for 11–15)

## Getting Started

```bash
# On your Mac Mini
git clone https://github.com/michaelmanuele/american-rotation-scorer.git
cd american-rotation-scorer
npm install
npx expo start
```

Then press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR with Expo Go on your iPhone/iPad.

### Project structure
```
app/                  # Expo Router screens
  _layout.tsx         # root stack
  index.tsx           # home menu
  match/
    new.tsx           # match setup
    scoring.tsx       # core scoring screen
    summary.tsx       # post-match summary
  history.tsx         # match history list
  roster.tsx          # player roster
src/
  components/         # PoolBall, PlayerCard, BallGrid
  domain/             # rules.ts, types.ts (pure logic)
  store/              # matchStore.ts (Zustand)
  theme/              # colors.ts
assets/               # icon, splash (placeholders)
```

## Author
Michael Manuele
