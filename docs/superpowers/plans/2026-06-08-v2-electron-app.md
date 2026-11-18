# V2 implementation plan

1. Preserve the existing React/Vite renderer and Electron security boundary.
2. Keep Lichess OAuth PKCE, OS-encrypted token storage, Board API play and server-side game monitoring in Electron.
3. Keep Chess.com limited to its published public profile, ratings and archive endpoints.
4. Add a minimal browser companion bridge for supported-site tab presence only.
5. Add compatibility page/component paths matching the reference directory layout without copying unlicensed upstream implementation.
6. Verify syntax, tests, renderer build and platform packaging in CI before release.
