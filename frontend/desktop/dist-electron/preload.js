"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('desktop', {
    platform: process.platform, version: process.versions.electron,
    localSecurity: {
        chooseExecutable: () => electron_1.ipcRenderer.invoke('local:choose'),
        quarantine: (filePath) => electron_1.ipcRenderer.invoke('local:quarantine', filePath),
        sandboxStatus: () => electron_1.ipcRenderer.invoke('local:sandbox-status'),
        openSandbox: (filePath) => electron_1.ipcRenderer.invoke('local:open-sandbox', filePath),
    },
});
