const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yptiDesktop', {
  retryConnection: () => ipcRenderer.send('ypti:retry-connection'),
});
