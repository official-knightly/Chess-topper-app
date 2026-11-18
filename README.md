# Chessist Local

Chessist Local is a local-first chess desktop workspace built with React, Vite and Electron. It uses the official Lichess Board API for in-app games, the Chess.com Published-Data API for public player information, and a local UCI engine / Berserk WASM worker for analysis when fair-play rules allow it.

## What works
- Lichess OAuth 2.0 with PKCE and OS-encrypted token storage.
- Lichess seek, friend challenge, AI challenge, live board stream, clocks, chat, resign, abort and draw actions from the desktop app.
- Correct player-colour board orientation and input lock while waiting for the opponent.
- Public Lichess spectating and TV channels.
- Public Lichess and Chess.com profile, rating and recent-game lookup.
- Chess.com **Play** action opens the official Chess.com online-play page in the browser. Chess.com's published API is read-only; it does not expose an API for controlling a human game.
- Native UCI engine integration and Berserk WASM analysis.
- Main-process fairness lock rejects engine searches while the connected Lichess account is participating in an active online game.
- Optional browser companion reports only the current Lichess/Chess.com tab URL to the local app. It does not inspect boards, extract moves, inject engine arrows or automate clicks/keys.
- Desktop installer workflows for Windows, macOS and Linux, plus existing Capacitor build targets.

## Run
Requires Node.js 20+ (22 recommended).

```sh
npm install
npm test
npm run build
npm start
```

## Lichess setup
1. Create a personal OAuth application in Lichess account settings.
2. Register the redirect URI `chessist://oauth/lichess`.
3. Enter the OAuth client ID in Chessist Settings.
4. Connect and approve the requested scopes.
5. Use the Play page to seek, challenge a player or challenge the Lichess AI.

The access token is stored using Electron's OS-backed `safeStorage`. Do not share or commit it.

## Chess.com
Chessist uses the official Published-Data API for public profiles, ratings and archived games. To play a game, use **Play on Chess.com**; this opens Chess.com's own online-play page. There is no supported Chess.com public API for submitting moves to a human game.

## Browser companion
Load the `extension/` directory as an unpacked Chromium extension. It connects to the desktop bridge at `127.0.0.1:27301`. The bridge accepts only supported-site page-presence messages from a local browser extension. It does not transmit account tokens or board/game data.

## Engine and fair play
Native UCI engines are started and controlled by Electron. Berserk WASM is loaded in a dedicated worker. Analysis is permitted on free positions, spectator games and finished games. When the signed-in Lichess account is in an active online game, the main process denies engine analysis regardless of renderer state.

Do not use analysis assistance during rated or casual online games. Chessist does not provide live move recommendations or automated moves for games in which the user is a participant.

## Build
```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
npm run build:firefox-ext
```

Desktop artifacts are written to `release/`. Native engine binaries are not bundled by default; provide a compatible UCI engine and required NNUE files, or select one in the app. Only redistribute engines when their licenses permit it.

## Reference architecture
The directory layout follows the requested Chessist reference organization where it fits this app. The upstream repository did not include a license file, so this project uses independently written integration code rather than copying its implementation. Some upstream-only components (Bun worker, transparent gameplay overlay and binary artwork) are intentionally not imported.
