const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  startDownload: (payload) => ipcRenderer.invoke('start-download', payload),
  onProgress: (cb) => ipcRenderer.on('download-progress', (_, p) => cb(p)),
  onLog: (cb) => ipcRenderer.on('download-log',     (_, msg) => cb(msg))
});
