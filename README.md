# Chessist Local

Chessist Local is a **native desktop application**, built with Electron, React and Vite. It is not a hosted website or a browser-only chessboard. The Vite renderer is packaged inside the Electron application and the development command launches Electron.

## Features
- Lichess OAuth 2.0 PKCE with token exchange in the Electron main process and OS-encrypted token storage.
- Play real Lichess games inside Chessist through the official Board API: seek opponents, challenge friends or Lichess AI, live board updates, clocks, chat, draw, abort and resign.
- Chess.com public profile, rating and archive lookup through the Published-Data API. The **Open Chess.com Play** action launches Chess.com's official interface because its public API does not support submitting moves in human games.
- Live Lichess spectator games and TV channels.
- Berserk WASM analysis and local games against Berserk using the supplied engine adapter and the existing WASM URL.
- Optional native UCI / Stockfish executable selection.
- PGN library stored locally, FEN/PGN analysis, daily puzzles, opening explorer and engine benchmark.
- Optional browser companion reports only whether a Lichess or Chess.com tab is open. It does not read board state, extract moves, display engine suggestions or automate input.
- Fair-play protection: engine searches are blocked while the connected Lichess account is a participant in an active game.

## Requirements
- Node.js 22 or newer.
- Windows 10/11, macOS or Linux for the desktop build.
- Internet access for Lichess, Chess.com public data and the remote Berserk WASM download.

## Run the desktop application
```sh
npm install
npm run dev
```
On Windows, `install.bat` installs dependencies and starts the Electron app.

To build the renderer and launch the packaged Electron shell locally:
```sh
npm run build
npm start
``

## Lichess setup
1. Create a personal OAuth application in Lichess account settings.
2. Register the redirect URI `chessist://oauth/lichess`.
3. Enter the OAuth client ID in Chessist Settings.
4. Connect and approve the requested scopes.
5. Open Play to seek, challenge a player or challenge the Lichess AI.

Tokens are exchanged in Electron's main process and encrypted with the operating system's secure storage. If OS secure storage is unavailable, token saving fails closed rather than writing a plaintext token.

## Chess.com
Chessist can retrieve public player data using the official Published-Data API. It cannot control human games through that API. Chess.com play opens the official Chess.com interface in the system browser; no DOM scraping, move automation or unofficial game-control endpoint is used.

## Engine
Berserk runs in a WebAssembly worker inside the desktop app. The adapter is `src/services/engine.ts`; it loads the existing WASM binary from the Berserk Web repository. Native UCI engines are optional and can be selected from the Engine page. No third-party engine executable is bundled by default; provide a locally installed engine and NNUE files where required.

## Fair play
Chessist does not provide engine assistance or automated moves in online games where the connected user is a participant. The Electron main process monitors Lichess account game events and enforces the lock for both native UCI and Berserk WASM analysis. If Lichess game status cannot be verified while connected, Chessist fails closed and pauses analysis until verification recovers. Spectator analysis, local games and post-game review remain available when verification is healthy.

## Browser companion
Load `extension/` as an unpacked Chromium extension. It connects to the local desktop bridge at `127.0.0.1:27301`. The bridge accepts only loopback connections from browser extension origins and validates supported-site hostnames.

## Tests and desktop packaging
```sh
npm test
npm run build
npm run build:firefox-ext
npm run dist:win
npm run dist:mac
npm run dist:linux
``
GitHub Actions runs CI and creates Windows, macOS and Linux release artifacts. Native binaries are not bundled unless you add appropriately licensed binaries to `engines/`.
