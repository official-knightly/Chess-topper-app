const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chessist", {
  platform: process.platform,
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
    reportGameState: state => ipcRenderer.invoke("fairness:report-game-state", state),
    onChange: callback => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on("fairness:changed", listener);
      return () => ipcRenderer.removeListener("fairness:changed", listener);
    }
  },
  diagnostics: () => ipcRenderer.invoke("diagnostics:get")
});
