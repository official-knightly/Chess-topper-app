# Chessist Local desktop architecture

## Product boundaries
- Electron owns secrets, native engine processes, authenticated platform requests and game-participant fairness state.
- React owns presentation and user interactions only.
- The preload bridge exposes narrow capabilities; renderer code has no Node.js access.
- Lichess Board API is the supported in-app online-play integration.
- Chess.com Published-Data API is read-only. Chess.com games are played on Chess.com itself; the app does not automate the site.

## Fair play
The main process locks engine search while the connected Lichess account has an active game. Spectator analysis and post-game review are allowed. The companion extension reports only which supported site tab is open; it does not inspect boards, read moves, inject overlays or automate input.

## Local extension bridge
The bridge binds only to 127.0.0.1:27301, validates extension origin, host and message shape, and accepts page-presence events only. No tokens or game state pass through this socket.
