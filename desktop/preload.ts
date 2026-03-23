import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    renderProject: (options: any) => ipcRenderer.invoke('render-project', options),
    onRenderProgress: (callback: any) => ipcRenderer.on('render-progress', (_event, value) => callback(value)),
    onRenderLog: (callback: any) => ipcRenderer.on('render-log', (_event, value) => callback(value)),
    checkSystem: () => ipcRenderer.invoke('check-system'),
    login: () => ipcRenderer.invoke('login'),
    saveToken: (token: string) => ipcRenderer.invoke('save-token', token),
    getToken: () => ipcRenderer.invoke('get-token'),
    openPath: (path: string) => ipcRenderer.invoke('open-path', path),
    transcribeMedia: (options: any) => ipcRenderer.invoke('transcribe-media', options),
    onTranscribeProgress: (callback: any) => ipcRenderer.on('transcribe-progress', (_event, value) => callback(value)),
    onTranscribeLog: (callback: any) => ipcRenderer.on('transcribe-log', (_event, value) => callback(value)),
    getLocalLogs: () => ipcRenderer.invoke('get-render-logs'),
    
    // Auth specific
    onAuthSuccess: (callback: (token: string) => void) => {
        const subscription = (_event: any, value: string) => callback(value);
        ipcRenderer.on('auth-success', subscription);
        return () => ipcRenderer.removeListener('auth-success', subscription);
    },
    getPendingToken: () => ipcRenderer.invoke('get-pending-token'),
});
