# Rearchitecture

Electron is authoritative for secrets, native engine processes, platform API requests and fair-play state. React is a sandboxed renderer. Platform integration uses official APIs and least-privilege scopes. Browser companion integration is limited to local tab-presence events.
