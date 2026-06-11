# American Rotation Scorer

A scoring app for the game of American Rotation pool, targeting iOS and Android as native apps.

## Status
🚧 MVP planning — early development

## Stack
- **Framework**: React Native + Expo (managed workflow)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State**: Zustand (lightweight, persisted)
- **Local storage**: expo-sqlite (or AsyncStorage for MVP)
- **Backend (later)**: PocketBase with local-first sync
- **Build/Distribute**: EAS Build → TestFlight + Play Internal Testing

## MVP Scope (Match Scoring)
Two-player rack-by-rack scoring following American Rotation rules:
- 15 balls per rack, ball number = point value (1–15), 120 pts per rack
- Race-to-X format (configurable)
- Inning-by-inning ball pocketing
- Foul tracking (-1 per foul, 3-foul rule)
- Safety tracking
- Undo last action
- Match summary & history (local)

## Roadmap
- [ ] M0: Expo scaffold + navigation shell
- [ ] M1: New match flow (player names, race-to)
- [ ] M2: Scoring screen — ball grid, inning tracking, fouls/safeties
- [ ] M3: Match complete screen + local history
- [ ] M4: Settings (rule variants, haptics)
- [ ] M5: EAS Build → TestFlight + Play Internal
- [ ] M6: PocketBase sync
- [ ] M7: Solo practice mode + stats

## Game Rules Reference
American Rotation (BCA/Dr. Cue variant):
- Rack 15 balls, break required to drive 3+ balls to rails or pocket a ball
- Lowest-numbered ball must be contacted first
- Any ball legally pocketed scores its number in points
- Game to a target score (commonly 200 or race-to-N racks)
- Fouls: ball-in-hand for opponent, -1 point penalty (varies by ruleset)

## Author
Michael Manuele
