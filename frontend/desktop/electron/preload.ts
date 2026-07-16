import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform, version: process.versions.electron,
  localSecurity: {
    chooseExecutable: () => ipcRenderer.invoke('local:choose'),
    quarantine: (filePath: string) => ipcRenderer.invoke('local:quarantine', filePath),
    sandboxStatus: () => ipcRenderer.invoke('local:sandbox-status'),
    openSandbox: (filePath: string) => ipcRenderer.invoke('local:open-sandbox', filePath),
  },
});
