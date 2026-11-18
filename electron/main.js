"use strict";
const { app, BrowserWindow, ipcMain, safeStorage, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { UciEngine } = require("./engine");
const { FairnessLock } = require("./fairness-lock");
const { resolveStockfishPath } = require("./stockfish");
const { getDiagnostics } = require("./diagnostics");
const { SecureStore } = require("./secure-store");
const { LichessMonitor } = require("./lichess-monitor");
const { LichessApi } = require("./lichess-api");
const { authorizeEngineAnalysis } = require("./engine-authorization");
const { ExtensionBridge } = require("./ws-server");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let mainWindow = null;
let engine = null;
let enginePath = null;
let secureStore = null;
let lichessMonitor = null;
let lichessApi = null;
let extensionBridge = null;
let quitting = false;
const pendingOAuthCallbacks = [];
const fairness = new FairnessLock();

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.isLoading() === false) {
    mainWindow.webContents.send(channel, payload);
    return true;
  }
  return false;
}
function deliverProtocolUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "chessist:" || url.hostname !== "oauth" || url.pathname !== "/lichess") return;
    const payload = { provider: "lichess", code: url.searchParams.get("code"), state: url.searchParams.get("state"), error: url.searchParams.get("error") };
    if (!sendToRenderer("auth:callback", payload)) pendingOAuthCallbacks.push(payload);
  } catch {}
}
function flushOAuthCallbacks() {
  while (pendingOAuthCallbacks.length) sendToRenderer("auth:callback", pendingOAuthCallbacks.shift());
}
if (gotLock) {
  app.on("open-url", (event, url) => { event.preventDefault(); deliverProtocolUrl(url); });
  app.on("second-instance", (_event, argv) => {
    const callback = argv.find(value => value.startsWith("chessist://"));
    if (callback) deliverProtocolUrl(callback);
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1000, minHeight: 680,
    show: false, backgroundColor: "#09080d", title: "Chessist Local",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const external = new URL(url);
      if (external.protocol === "https:" && ["lichess.org", "www.lichess.org", "chess.com", "www.chess.com"].includes(external.hostname)) shell.openExternal(external.toString());
    } catch {}
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const isDev = process.env.VITE_DEV_SERVER_URL && url.startsWith(process.env.VITE_DEV_SERVER_URL);
    const isAppFile = url.startsWith("file://") && url.endsWith("/dist/index.html");
    if (!isDev && !isAppFile) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.on("did-finish-load", flushOAuthCallbacks);
  mainWindow.on("closed", () => { mainWindow = null; });
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
function broadcastFairness() { sendToRenderer("fairness:changed", fairness.snapshot()); }
function updateVerifiedPlatformGameState(state) {
  const snapshot = fairness.updateGame({
    platform: String(state.platform || ""), gameId: String(state.gameId || ""),
    status: String(state.status || ""), userIsParticipant: state.userIsParticipant === true
  });
  broadcastFairness();
  return snapshot;
}
function createLichessClients() {
  lichessApi?.stopAll();
  lichessMonitor?.stop();
  lichessApi = new LichessApi({
    tokenProvider: async () => secureStore?.get("lichess"),
    onGameEvent: (gameId, event) => sendToRenderer("lichess:game-event", { gameId, event })
  });
  lichessMonitor = new LichessMonitor({
    tokenProvider: async () => secureStore?.get("lichess"),
    onGameState: updateVerifiedPlatformGameState,
    onAvailability: (verified, error) => {
      fairness.setMonitoring("lichess", verified);
      broadcastFairness();
      if (error) sendToRenderer("platform:error", { platform: "lichess", message: error.message });
    }
  });
  lichessMonitor.start().catch(error => sendToRenderer("platform:error", { platform: "lichess", message: error.message }));
}
function requireTrustedRenderer(event) {
  if (event.sender !== mainWindow?.webContents || event.senderFrame !== event.sender.mainFrame) {
    throw new Error("Untrusted renderer IPC request rejected.");
  }
  const frameUrl = event.senderFrame?.url || "";
  if (process.env.VITE_DEV_SERVER_URL && frameUrl.startsWith(process.env.VITE_DEV_SERVER_URL)) return;
  if (frameUrl.startsWith("file://")) return;
  throw new Error("Untrusted renderer IPC request rejected.");
}

ipcMain.handle("window:minimize", event => { requireTrustedRenderer(event); mainWindow?.minimize(); });
ipcMain.handle("window:toggle-maximize", event => { requireTrustedRenderer(event); if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize(); });
ipcMain.handle("window:close", event => { requireTrustedRenderer(event); mainWindow?.close(); });
ipcMain.handle("fairness:get-state", event => { requireTrustedRenderer(event); return fairness.snapshot(); });
ipcMain.handle("engine:authorize", (event, context) => { requireTrustedRenderer(event); return authorizeEngineAnalysis(fairness, context); });
ipcMain.handle("auth:open-lichess", async (event, value) => {
  requireTrustedRenderer(event);
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname !== "lichess.org" || parsed.pathname !== "/oauth") throw new Error("Only the official Lichess OAuth page is allowed.");
  await shell.openExternal(parsed.toString());
  return { opened: true };
});
ipcMain.handle("auth:exchange-lichess-token", async (event, input) => {
  requireTrustedRenderer(event);
  const { code, verifier, clientId, redirectUri } = input || {};
  if (![code, verifier, clientId].every(value => typeof value === "string" && value.length > 0 && value.length < 4096)) throw new Error("Invalid OAuth exchange parameters.");
  if (redirectUri !== "chessist://oauth/lichess") throw new Error("Unexpected OAuth redirect URI.");
  const body = new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, client_id: clientId, redirect_uri: redirectUri });
  const response = await fetch("https://lichess.org/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body });
  if (!response.ok) throw new Error("Lichess token exchange failed: HTTP " + response.status);
  return response.json();
});
ipcMain.handle("auth:get-status", event => { requireTrustedRenderer(event); try { return { connected: Boolean(secureStore?.get("lichess")) }; } catch { return { connected: false, secureStorageAvailable: false }; } });
ipcMain.handle("auth:store-lichess-token", async (event, token) => {
  requireTrustedRenderer(event);
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) throw new Error("Invalid Lichess access token.");
  secureStore.save("lichess", token);
  createLichessClients();
  return { connected: true };
});
ipcMain.handle("auth:clear-lichess", event => {
  requireTrustedRenderer(event);
  lichessApi?.stopAll(); lichessApi = null; lichessMonitor?.stop(); lichessMonitor = null;
  secureStore.delete("lichess"); fairness.clearPlatform("lichess"); fairness.clearMonitoring("lichess"); broadcastFairness();
  return { disconnected: true };
});
ipcMain.handle("lichess:request", (event, options) => {
  requireTrustedRenderer(event);
  if (!lichessApi) throw new Error("Connect Lichess first.");
  return lichessApi.request(options?.path, options || {});
});
ipcMain.handle("lichess:stream-game", (event, gameId) => { requireTrustedRenderer(event); if (!lichessApi) throw new Error("Connect Lichess first."); return lichessApi.streamGame(gameId); });
ipcMain.handle("lichess:stop-game-stream", (event, gameId) => { requireTrustedRenderer(event); return lichessApi?.stopStream(gameId); });
ipcMain.handle("chesscom:public-get", async (event, apiPath) => {
  requireTrustedRenderer(event);
  if (typeof apiPath !== "string" || !/^\/player\/[a-zA-Z0-9_-]+(?:\/(?:stats|games\/archives|games\/\d{4}\/\d{2}))?$/.test(apiPath)) throw new Error("Chess.com endpoint is not allowed.");
  const response = await fetch("https://api.chess.com/pub" + apiPath, { headers: { Accept: "application/json", "User-Agent": "ChessistLocal/1.0" } });
  if (response.status === 429) throw new Error("Chess.com rate limit reached; retry later.");
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : null };
});
ipcMain.handle("platform:open-chesscom", async event => {
  requireTrustedRenderer(event);
  await shell.openExternal("https://www.chess.com/play/online");
  return { opened: true };
});
ipcMain.handle("engine:choose", async event => {
  requireTrustedRenderer(event);
  const result = await dialog.showOpenDialog(mainWindow, { title: "Select a UCI chess engine", properties: ["openFile"] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const selected = result.filePaths[0];
  if (!fs.statSync(selected).isFile()) throw new Error("Selected engine path is not a file.");
  engine?.quit(); enginePath = selected;
  engine = new UciEngine({ binaryPath: enginePath, fairnessLock: fairness });
  engine.on("info", info => sendToRenderer("engine:info", info));
  await engine.start();
  return { ready: true, path: enginePath };
});
ipcMain.handle("engine:start", async event => {
  requireTrustedRenderer(event);
  if (engine?.ready) return { ready: true, path: enginePath };
  if (!engine) {
    enginePath = resolveStockfishPath({ appPath: app.isPackaged ? process.resourcesPath : process.cwd() });
    engine = new UciEngine({ binaryPath: enginePath, fairnessLock: fairness });
    engine.on("info", info => sendToRenderer("engine:info", info));
  }
  await engine.start();
  return { ready: true, path: enginePath };
});
ipcMain.handle("engine:analyze", async (event, options) => {
  requireTrustedRenderer(event);
  fairness.assertCanAnalyze(options?.context);
  if (!engine) throw new Error("Start a UCI engine before analysis.");
  await engine.analyze(options);
  return { accepted: true };
});
ipcMain.handle("engine:stop", event => { requireTrustedRenderer(event); engine?.stop(); return { stopped: true }; });
ipcMain.handle("engine:set-option", (event, { name, value }) => {
  requireTrustedRenderer(event);
  if (!engine?.ready) throw new Error("Start a UCI engine before changing its options.");
  engine.setOption(name, value);
  return { updated: true };
});
ipcMain.handle("diagnostics:get", event => { requireTrustedRenderer(event); return getDiagnostics({ enginePath, engineReady: Boolean(engine?.ready), fairness: fairness.snapshot() }); });

if (gotLock) {
  app.whenReady().then(() => {
    secureStore = new SecureStore({ safeStorage, userDataPath: app.getPath("userData") });
    if (app.isPackaged) app.setAsDefaultProtocolClient("chessist"); else app.setAsDefaultProtocolClient("chessist", process.execPath, [path.resolve(process.argv[1])]);
    extensionBridge = new ExtensionBridge({ port: 27301, host: "127.0.0.1", onPage: payload => sendToRenderer("extension:page", payload) });
    extensionBridge.start();
    createWindow();
    try { if (secureStore.get("lichess")) createLichessClients(); } catch (error) { sendToRenderer("platform:error", { platform: "storage", message: error.message }); }
    const coldStartUrl = process.argv.find(value => value.startsWith("chessist://"));
    if (coldStartUrl) deliverProtocolUrl(coldStartUrl);
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch(error => { dialog.showErrorBox("Chessist Local failed to start", error.message); app.quit(); });
  app.on("before-quit", () => {
    quitting = true; extensionBridge?.stop(); lichessMonitor?.stop(); lichessApi?.stopAll(); engine?.quit();
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
