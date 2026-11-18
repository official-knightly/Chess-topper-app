# Native engine design

A native UCI engine is launched as a child process by Electron. The renderer communicates through a narrow preload API. Engine stdout is parsed into info, score, principal variation and best-move events. The process is terminated on app shutdown.
