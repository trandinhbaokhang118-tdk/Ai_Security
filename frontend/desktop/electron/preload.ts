import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform, version: process.versions.electron,
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  localSecurity: {
    chooseExecutable: () => ipcRenderer.invoke('local:choose'),
    quarantine: (filePath: string) => ipcRenderer.invoke('local:quarantine', filePath),
    getDownloadGuardSettings: () => ipcRenderer.invoke('local:download-guard-settings'),
    setDownloadGuard: (enabled: boolean) => ipcRenderer.invoke('local:set-download-guard-settings', enabled),
    onAutoQuarantined: (listener: (result: unknown) => void) => {
      const callback = (_event: Electron.IpcRendererEvent, result: unknown) => listener(result);
      ipcRenderer.on('local:auto-quarantined', callback);
      return () => ipcRenderer.removeListener('local:auto-quarantined', callback);
    },
    sandboxStatus: () => ipcRenderer.invoke('local:sandbox-status'),
    openSandbox: (filePath: string) => ipcRenderer.invoke('local:open-sandbox', filePath),
  },
});
