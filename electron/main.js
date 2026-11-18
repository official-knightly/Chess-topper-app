const { app, BrowserWindow, ipcMain, safeStorage, shell } = require("electron");
const path = require("node:path");
const { UciEngine } = require("./engine");
const { FairnessLock } = require("./fairness-lock");
const { resolveStockfishPath } = require("./stockfish");
const { getDiagnostics } = require("./diagnostics");
const { SecureStore } = require("./secure-store");
const { LichessMonitor } = require("./lichess-monitor");

let mainWindow;
let engine;
let enginePath = null;
const fairness = new FairnessLock();
const secureStore = new SecureStore({ safeStorage, userDataPath: app.getPath("userData") });
let lichessMonitor;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#09080d",
    title: "Chessist Local",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

function broadcastFairness() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("fairness:changed", fairness.snapshot());
}

// Platform monitors will call this from the main process after verifying official game events.
// Renderer IPC is deliberately not allowed to set or clear the fairness state.
function updateVerifiedPlatformGameState(state) {
  const snapshot = fairness.updateGame({
    platform: String(state.platform || ""),
    gameId: String(state.gameId || ""),
    status: String(state.status || ""),
    userIsParticipant: state.userIsParticipant === true
  });
  broadcastFairness();
  return snapshot;
}

ipcMain.handle("fairness:get-state", () => fairness.snapshot());
ipcMain.handle("auth:open-lichess", async (_event, url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "lichess.org" || !parsed.pathname.startsWith("/oauth")) throw new Error("Only official Lichess OAuth URLs are allowed.");
  await shell.openExternal(parsed.toString());
  return { opened: true };
});
ipcMain.handle("auth:store-lichess-token", async (_event, token) => {
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) throw new Error("Invalid Lichess access token.");
  secureStore.save("lichess", token);
  lichessMonitor?.stop();
  lichessMonitor = new LichessMonitor({ tokenProvider: async () => secureStore.get("lichess"), onGameState: updateVerifiedPlatformGameState });
  lichessMonitor.start().catch(error => mainWindow?.webContents.send("platform:error", { platform: "lichess", message: error.message }));
  return { connected: true };
});
ipcMain.handle("auth:clear-lichess", () => { lichessMonitor?.stop(); lichessMonitor = null; secureStore.delete("lichess"); fairness.clearPlatform("lichess"); broadcastFairness(); return { disconnected: true }; });

ipcMain.handle("engine:start", async () => {
  if (engine) return { ready: true, path: enginePath };
  enginePath = resolveStockfishPath({ appPath: app.isPackaged ? process.resourcesPath : process.cwd() });
  engine = new UciEngine({ binaryPath: enginePath, fairnessLock: fairness });
  engine.on("info", info => mainWindow?.webContents.send("engine:info", info));
  await engine.start();
  return { ready: true, path: enginePath };
});
ipcMain.handle("engine:analyze", async (_event, options) => {
  fairness.assertCanAnalyze(options?.context);
  if (!engine) throw new Error("Start Stockfish before analysis");
  await engine.analyze(options);
  return { accepted: true };
});
ipcMain.handle("engine:stop", () => { engine?.stop(); return { stopped: true }; });
ipcMain.handle("engine:set-option", (_event, { name, value }) => {
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) throw new Error("Invalid UCI option name");
  engine?.setOption(name, value);
  return { updated: true };
});
ipcMain.handle("diagnostics:get", () => getDiagnostics({
  enginePath, engineReady: Boolean(engine?.ready), fairness: fairness.snapshot()
}));

app.whenReady().then(() => {
  app.setAsDefaultProtocolClient("chessist");
  createWindow();
  const savedToken = secureStore.get("lichess");
  if (savedToken) {
    lichessMonitor = new LichessMonitor({ tokenProvider: async () => secureStore.get("lichess"), onGameState: updateVerifiedPlatformGameState });
    lichessMonitor.start().catch(error => mainWindow?.webContents.send("platform:error", { platform: "lichess", message: error.message }));
  }
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("before-quit", () => { lichessMonitor?.stop(); engine?.quit(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
