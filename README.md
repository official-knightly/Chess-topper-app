# Chessist Local Pro

A local-first chess desktop and mobile workspace built with React, Vite, Electron and Capacitor. The goal is a better integrated analysis, play and spectating experience without scraping other websites, reading browser pages, or injecting overlays.

## Current implementation

- Electron shell with context isolation, a restricted preload bridge and working custom window controls.
- Responsive dark-purple React workspace with collapsible desktop sidebar, mobile bottom navigation and a chessboard.
- Local analysis board with FEN/PGN import, UCI engine output and best-move arrows.
- User-selected UCI engine executable from the desktop app.
- Lichess OAuth 2.0 PKCE helper, encrypted desktop token storage, authenticated Board API proxy, game stream and in-app seek/challenge/AI play controls.
- Main-process Lichess event monitor that locks engine analysis while the signed-in user is playing and unlocks after the game finishes.
- Public Lichess spectating by username and TV channel, with best-move arrows and live switching between native UCI engines and your Berserk WASM engine.
- Berserk WASM worker and generated loader are sourced from the matching `official-knightly/Berserk-web` build; the engine search path requests main-process fairness authorization before every search.
- Public Lichess and Chess.com profile adapters; World Chess intentionally remains an explicit unsupported stub rather than scraping.
- Mocked API tests plus UCI, binary resolver, updater and fairness-lock tests.
- Capacitor configuration and CI workflows for desktop installers, Android debug APK and iOS Simulator build.

Some navigation areas are still staged placeholders. Finished-game review, local bot, persistent library, puzzles, opening explorer, performance suite, mobile Stockfish WASM and mobile secure token storage remain planned work. The Lichess OAuth flow and platform APIs should be tested with a registered application and a real account before public release.

## Requirements

- Node.js 20+ (22 recommended)
- npm
- A Stockfish native binary matching the desktop OS and CPU architecture for desktop engine use
- Android Studio + Android SDK for local Android builds
- Xcode on macOS for iOS builds

## Run locally

```sh
npm install
npm test
npm run build
npm start
```

For renderer development, run the Vite server in one terminal and launch Electron with `VITE_DEV_SERVER_URL` set to the server URL.

## Add or switch Stockfish

Place a user-supplied native Stockfish executable in `engines/` using the platform filenames supported by `electron/stockfish.js`, or use the **Switch engine…** action in Spectate to choose an executable from disk. Do not commit engine binaries unless redistribution rights and the engine license have been checked. NNUE files must be supplied where required by the engine build.

## Lichess setup

1. Sign in to Lichess and create a personal OAuth application in your Lichess account settings.
2. Register this redirect URI exactly: `chessist://oauth/lichess`.
3. Copy the OAuth application client ID into Chessist Local → Settings → Lichess account.
4. Select **Connect Lichess** and approve the requested `board:play`, `challenge:write`, and `preference:read` scopes.
5. Once connected, Play uses the Lichess Board API inside the app. You do not need to open the Lichess website to seek or play a game.

The desktop app stores the access token encrypted with Electron's OS-backed `safeStorage`. Do not share the token or commit it to source control.

## Build desktop installers

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Outputs are written to `release/`. Windows builds target NSIS and MSI, macOS targets DMG, and Linux targets AppImage and DEB. Builds produced without signing certificates are unsigned and may show OS security warnings.

## Build mobile

```sh
npm run build:android
npm run build:ios
```

The first run creates the Capacitor native project. For an Android debug APK:

```sh
cd android
./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/`. iOS builds require macOS and Xcode; the current CI workflow produces an iOS Simulator app archive, not a signed App Store IPA. A signed iOS release requires an Apple Developer account and signing assets.

## GitHub Actions artifacts

Run **Actions → Chessist Local Release Builds → Run workflow** to build Windows, macOS, Linux, Android and iOS Simulator artifacts. Tag pushes matching `v*` also trigger the release build workflow. Download each platform's artifact from the workflow run page.

## Fair-play policy

The native engine is permitted for finished-game review, free analysis positions, local bot games under the configured policy, and games being spectated where the user is not a participant. During an active Lichess game in which the connected account is a participant, the Electron main process rejects analysis requests. The Lichess event stream and account-playing endpoint feed that lock; the renderer cannot set or clear it.

There are no live-play move suggestions, automatic moves, browser-page reading, screen reading, overlays, browser extensions, or keyboard/mouse automation. Chess.com integration is read-only and uses its Published-Data API. World Chess is a no-scraping stub until an official public API is available.

## Test suite

```sh
npm test
npm run build
```

The tests cover UCI parsing, Stockfish path resolution, updater URL validation, fairness-lock behavior, adapter contracts, Lichess NDJSON parsing and rate-limit handling, Chess.com caching, and the World Chess unsupported response.
