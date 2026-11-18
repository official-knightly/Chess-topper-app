# Engine execution and fair-play design

Native UCI engines run in the Electron main process. Berserk WASM runs in a renderer worker only after main-process fairness authorization. Every search requests authorization immediately before execution. Active online games involving the connected account are always locked.
