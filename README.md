# American Rotation Scorer

A scoring app for the game of American Rotation pool, targeting iOS and Android as native apps.

## Status
🚧 MVP planning — early development

## Stack (proposed)
- **Frontend**: Vite + vanilla JS/TS PWA
- **Native wrapper**: Capacitor (iOS + Android from one codebase)
- **Backend**: PocketBase (self-hosted) with local-first sync
- **Storage**: SQLite locally, syncs to PocketBase when online

## MVP Scope
Match scoring for two players, rack-by-rack, following American Rotation rules:
- 15 balls per rack, point values = ball number (1–15), 120 points per rack
- Race-to-X format (configurable)
- Track points per inning, balls pocketed, fouls, safeties
- Match history and export

## Roadmap
- [ ] MVP: 2-player match scoring + local storage
- [ ] Match history view
- [ ] PocketBase sync
- [ ] iOS TestFlight build
- [ ] Android internal-track build
- [ ] Solo practice mode + stats

## Author
Michael Manuele
