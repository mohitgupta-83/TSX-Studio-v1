"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    renderProject: (options) => electron_1.ipcRenderer.invoke('render-project', options),
    onRenderProgress: (callback) => electron_1.ipcRenderer.on('render-progress', (_event, value) => callback(value)),
    onRenderLog: (callback) => electron_1.ipcRenderer.on('render-log', (_event, value) => callback(value)),
    checkSystem: () => electron_1.ipcRenderer.invoke('check-system'),
    login: () => electron_1.ipcRenderer.invoke('login'),
    saveToken: (token) => electron_1.ipcRenderer.invoke('save-token', token),
    getToken: () => electron_1.ipcRenderer.invoke('get-token'),
    openPath: (path) => electron_1.ipcRenderer.invoke('open-path', path),
    transcribeMedia: (options) => electron_1.ipcRenderer.invoke('transcribe-media', options),
    onTranscribeProgress: (callback) => electron_1.ipcRenderer.on('transcribe-progress', (_event, value) => callback(value)),
    onTranscribeLog: (callback) => electron_1.ipcRenderer.on('transcribe-log', (_event, value) => callback(value)),
    getLocalLogs: () => electron_1.ipcRenderer.invoke('get-render-logs'),
    // Auth specific
    onAuthSuccess: (callback) => {
        const subscription = (_event, value) => callback(value);
        electron_1.ipcRenderer.on('auth-success', subscription);
        return () => electron_1.ipcRenderer.removeListener('auth-success', subscription);
    },
    getPendingToken: () => electron_1.ipcRenderer.invoke('get-pending-token'),
});
//# sourceMappingURL=preload.js.map