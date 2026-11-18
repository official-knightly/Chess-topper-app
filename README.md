# Chessist Local

Chessist Local is a local-first chess application. Stage 1 establishes the Electron main-process shell, a UCI Stockfish process manager, and a mandatory engine fairness lock.

## Stage 1 status

- Electron window with context isolation and a restricted preload bridge.
- Stockfish native process manager with UCI info parsing and lifecycle cleanup.
- Main-process fairness gate: analysis is rejected while the signed-in user is a participant in an active online game.
- Stockfish binary path resolver for Windows, macOS and Linux.
- Node test suite for UCI parsing, engine path resolution, updater URL validation and fairness locking.

## Requirements

- Node.js 20+
- npm
- A Stockfish native binary matching your operating system and CPU architecture.

## Run

```sh
npm install
npm test
npm start
```

The renderer shell is introduced in Stage 2. For development, set `VITE_DEV_SERVER_URL` to your Vite server URL before starting Electron.

## Add Stockfish

Create an `engines/` directory at the project root and place the matching official Stockfish binary there. Supported expected filenames are listed in `electron/stockfish.js`. Alternatively, the Settings UI in a later stage will let you select a custom absolute path. The user is responsible for supplying a legally obtained binary and any NNUE assets.

## Fairness policy

The engine is available for finished-game review, free analysis positions, local bot games under the configured policy, and spectating other players. If the user is a participant in an active online game, engine analysis is locked in the Electron main process. The renderer cannot override the main-process analysis check. The lock clears when the platform game state reports a finished or inactive game.

No live-play move suggestions, automatic moves, screen reading, overlays, browser extensions, or input automation are part of this application.

## Development stages

1. Electron shell, UCI engine process manager, fairness lock.
2. React UI shell, responsive navigation and chessboard.
3. Lichess and Chess.com public integrations, profiles and spectating.
4. Play, review, analysis and local bot.
5. Library, puzzles, openings, performance and diagnostics.
6. Capacitor mobile build and desktop packaging.

## Notes

The Lichess event-stream integration will feed participant game state into the main-process fairness gate in the platform-integration stage. Do not treat renderer-supplied state as a substitute for verified platform events in a production release.
