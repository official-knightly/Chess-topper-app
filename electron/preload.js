const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chessist", {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
    close: () => ipcRenderer.invoke("window:close")
  },
  engine: {
    start: () => ipcRenderer.invoke("engine:start"),
    analyze: options => ipcRenderer.invoke("engine:analyze", options),
    stop: () => ipcRenderer.invoke("engine:stop"),
    setOption: (name, value) => ipcRenderer.invoke("engine:set-option", { name, value }),
    onInfo: callback => {
      const listener = (_event, info) => callback(info);
      ipcRenderer.on("engine:info", listener);
      return () => ipcRenderer.removeListener("engine:info", listener);
    }
  },
  fairness: {
    getState: () => ipcRenderer.invoke("fairness:get-state"),
    onChange: callback => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on("fairness:changed", listener);
      return () => ipcRenderer.removeListener("fairness:changed", listener);
    }
  },
  auth: {
    openLichess: url => ipcRenderer.invoke("auth:open-lichess", url),
    storeLichessToken: token => ipcRenderer.invoke("auth:store-lichess-token", token),
    clearLichess: () => ipcRenderer.invoke("auth:clear-lichess"),
    onCallback: callback => { const listener = (_event, data) => callback(data); ipcRenderer.on("auth:callback", listener); return () => ipcRenderer.removeListener("auth:callback", listener); },
    onError: callback => { const listener = (_event, error) => callback(error); ipcRenderer.on("platform:error", listener); return () => ipcRenderer.removeListener("platform:error", listener); }
  },
  diagnostics: () => ipcRenderer.invoke("diagnostics:get")
});
