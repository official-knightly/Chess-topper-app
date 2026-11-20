<h1 align="center">Chess Topper</h1>
<p align="center">A native desktop chess analysis companion for Chess.com and Lichess, with public World Chess profile support.</p>

## Chess Topper v1.0.4

Chess Topper brings engine analysis, board evaluation, and move assistance into a focused desktop app. The companion browser extension reads supported live chess boards and connects them to the desktop engine.

### Highlights
- Native Stockfish analysis with persistent engine sessions.
- Live board position, evaluation, depth, best move and analysis arrows in the desktop app.
- Overlay, in-page and desktop-app rendering modes.
- Configurable move assistance and timing controls.
- Lichess account connection, game monitoring and challenge/seek API support.
- Chess.com and Lichess live-board integration through the browser extension.
- World Chess public-profile link support.
- In-app update checking for supported Windows installer builds.

**Lichess gameplay note:** live-board analysis and move assistance require opening the Lichess game in a supported browser and loading the Chess Topper extension. The desktop app does not currently provide a standalone embedded Lichess online-play board.

## Download

Get the current Windows, macOS or Linux installer from the [Chess Topper Releases page](https://github.com/official-knightly/Chess-topper-app-/releases).

- Windows: `.exe` installer
- macOS: `.dmg` installer
- Linux: `.AppImage` or `.deb`

The release page contains platform installers and the update metadata required by the in-app updater. Internal worker binaries and ZIP bundles are not user downloads.

## Setup

1. Install and launch Chess Topper.
2. Open **Setup** and follow the Browser Extension instructions.
3. Load the bundled extension in your browser (Chrome, Brave or Edge; Firefox uses its matching extension build).
4. Open a supported Chess.com or Lichess game tab.
5. Return to Chess Topper to view the live position and engine evaluation.

Stockfish is prepared by the desktop app on first launch. The transparent native overlay is currently Windows-only.

## Build from source

Requirements: Node.js 22+, Bun 1.4.4, and the .NET SDK needed by the Windows overlay helper.

```bash
npm install
npm run dev
```

Platform builds:

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

## Project layout

- `electron/` — desktop main process, local services, engine and updater
- `src/` — React desktop interface and pages
- `extension/` — browser companion
- `overlay/` — Windows overlay helper
- `scripts/` — build and packaging helpers

## Credits

Chess Topper is maintained by [Official Knightly](https://github.com/official-knightly). It uses [Stockfish](https://stockfishchess.org/) for chess analysis; see the repository and included notices for dependency and license details.
