const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { UciEngine } = require("./engine");
const { FairnessLock } = require("./fairness-lock");
const { resolveStockfishPath } = require("./stockfish");
const { getDiagnostics } = require("./diagnostics");

let mainWindow;
let engine;
let enginePath = null;
const fairness = new FairnessLock();

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
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("before-quit", () => engine?.quit());
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
