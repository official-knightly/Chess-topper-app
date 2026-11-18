"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const listen = (channel, callback) => {
  if (typeof callback !== "function") throw new TypeError("Listener must be a function");
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld("chessist", {
  os: process.platform,
  isDesktop: true,
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
    close: () => ipcRenderer.invoke("window:close")
  },
  engine: {
    start: () => ipcRenderer.invoke("engine:start"),
    choose: () => ipcRenderer.invoke("engine:choose"),
    analyze: options => ipcRenderer.invoke("engine:analyze", options),
    authorize: context => ipcRenderer.invoke("engine:authorize", context),
    stop: () => ipcRenderer.invoke("engine:stop"),
    setOption: (name, value) => ipcRenderer.invoke("engine:set-option", { name, value }),
    onInfo: callback => listen("engine:info", callback)
  },
  fairness: { getState: () => ipcRenderer.invoke("fairness:get-state"), onChange: callback => listen("fairness:changed", callback) },
  extension: { onPage: callback => listen("extension:page", callback) },
  platform: {
    chesscomGet: apiPath => ipcRenderer.invoke("chesscom:public-get", apiPath),
    openChessCom: () => ipcRenderer.invoke("platform:open-chesscom")
  },
  lichess: {
    request: options => ipcRenderer.invoke("lichess:request", options),
    streamGame: gameId => ipcRenderer.invoke("lichess:stream-game", gameId),
    stopGameStream: gameId => ipcRenderer.invoke("lichess:stop-game-stream", gameId),
    onGameEvent: callback => listen("lichess:game-event", callback)
  },
  auth: {
    openLichess: url => ipcRenderer.invoke("auth:open-lichess", url),
    exchangeLichessToken: input => ipcRenderer.invoke("auth:exchange-lichess-token", input),
    storeLichessToken: token => ipcRenderer.invoke("auth:store-lichess-token", token),
    clearLichess: () => ipcRenderer.invoke("auth:clear-lichess"),
    getStatus: () => ipcRenderer.invoke("auth:get-status"),
    onCallback: callback => listen("auth:callback", callback),
    onError: callback => listen("platform:error", callback)
  },
  diagnostics: () => ipcRenderer.invoke("diagnostics:get")
});
