import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { renderProject } from './engine/render';
import { checkSystem } from './engine/system-check';
import { processAudioWithEngine } from '../lib/asr-engine/router';
import { getTemplateById } from '../lib/template-system/registry';
import fs from 'fs-extra';

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

let userToken: string | null = null;
let pendingToken: string | null = null;

// 1. Register Custom Protocol (Deep Linking)
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('tsx-studio', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('tsx-studio');
}

/**
 * Handle Auth Callback from Browser
 */
function handleAuthProtocol(url: string) {
    if (!url) return;

    try {
        const urlObj = new URL(url);
        // We look for any property that looks like a token in the URL query string
        const token = urlObj.searchParams.get('token');

        if (token) {
            console.log('Successfully captured authentication token.');
            if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
                mainWindow.webContents.send('auth-success', token);
                mainWindow.focus();
            } else {
                // If window isn't ready, "Mailbox" the token for startup
                pendingToken = token;
            }
            userToken = token;
        }
    } catch (e) {
        console.error('Handshake Parse Error:', e);
    }
}

// 2. Single Instance Lock (Required for professional Deep Linking)
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        // Windows Deep Link capture
        const url = commandLine.pop();
        if (url && url.startsWith('tsx-studio://')) {
            handleAuthProtocol(url);
        }
    });

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // macOS Deep Link capture
        app.on('open-url', (event, url) => {
            event.preventDefault();
            handleAuthProtocol(url);
        });
    });
}

function createWindow() {
    const rootPath = app.isPackaged ? path.join(__dirname, '..') : __dirname;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        title: 'TSX Studio',
        icon: path.join(rootPath, 'logo.jpg'),
        show: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(rootPath, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: false
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        const prodUrl = 'https://tsx-studio-v2.vercel.app';
        mainWindow.loadURL(prodUrl).catch(() => {
            mainWindow?.loadFile(path.join(rootPath, 'dist-renderer', 'index.html'));
        });
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();

        // Check if the app was literally opened by clicking a link
        const args = process.argv;
        const protocolArg = args.find(arg => arg.startsWith('tsx-studio://'));
        if (protocolArg) {
            handleAuthProtocol(protocolArg);
        }
    });

    if (!isDev) {
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow?.webContents.closeDevTools();
        });
    }

    // SAFETY: Prevent any links from opening inside the app window
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Only allow internal routes of the app
        const isInternal = url.startsWith('https://tsx-studio-v2.vercel.app') ||
            url.startsWith('http://localhost') ||
            url.startsWith('tsx-studio://');

        // FORCE external browser for OAuth providers
        if (url.includes('accounts.google.com') || url.includes('github.com')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        if (isInternal) {
            return { action: 'allow' };
        }

        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Intercept standard navigations (location.href)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.includes('accounts.google.com') || url.includes('api/auth/signin/google')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    mainWindow.webContents.on('will-redirect', (event, url) => {
        if (url.includes('accounts.google.com')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('get-pending-token', () => {
    const token = pendingToken;
    pendingToken = null; // Clear the mailbox after delivery
    return token;
});

ipcMain.handle('check-system', async () => {
    return await checkSystem();
});

ipcMain.handle('render-project', async (event, options) => {
    try {
        const result = await renderProject({
            ...options,
            onProgress: (p) => event.sender.send('render-progress', p),
            onLog: (l) => event.sender.send('render-log', l),
        });
        return { success: true, path: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('render-template', async (event, options) => {
    try {
        const { templateId, values, ...restOptions } = options;
        const template = getTemplateById(templateId);

        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Use the default schema values if any are missing
        const finalValues = { ...values };
        template.schema.fields.forEach(field => {
            if (finalValues[field.id] === undefined && field.defaultValue !== undefined) {
                finalValues[field.id] = field.defaultValue;
            }
        });

        // 1. Generate code locally exactly as the browser editor did
        const code = template.generateCode(finalValues);

        // 2. Delegate to the standard renderer
        const result = await renderProject({
            ...restOptions,
            code, // Inject the freshly generated TSX
            onProgress: (p) => event.sender.send('render-progress', p),
            onLog: (l) => event.sender.send('render-log', l),
        });

        return { success: true, path: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

let userTranscriptionToken: string | null = null;
ipcMain.handle('save-token', (_, token) => { userTranscriptionToken = token; });
ipcMain.handle('get-token', () => { return userTranscriptionToken; });
ipcMain.handle('open-path', (_, path) => { shell.showItemInFolder(path); });

ipcMain.handle('login', async () => {
    const authUrl = 'https://tsx-studio-v2.vercel.app/api/auth/desktop';
    await shell.openExternal(authUrl);
});

ipcMain.handle('get-render-logs', async () => {
    const logPath = path.join(app.getPath('userData'), 'render-debug.log');
    if (await fs.pathExists(logPath)) {
        return await fs.readFile(logPath, 'utf8');
    }
    return 'No logs found.';
});

ipcMain.handle('install-whisper-engine', async (event) => {
    const { exec } = require('child_process');
    const runCommand = (cmd: string) => {
        return new Promise((resolve, reject) => {
            event.sender.send('transcribe-log', `[SETUP] Running: ${cmd}`);
            const proc = exec(cmd);
            proc.stdout.on('data', (data: any) => { event.sender.send('transcribe-log', `[SETUP] ${data.toString()}`); });
            proc.on('close', (code: number) => { code === 0 ? resolve(true) : reject(new Error(`Failed ${code}`)); });
        });
    };

    try {
        await runCommand('pip install -U openai-whisper faster-whisper');
        try { await runCommand('winget install ffmpeg --accept-source-agreements'); } catch (e) { }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('transcribe-media', async (event, options) => {
    try {
        const jsonOutput = await processAudioWithEngine({
            audioPath: options.filePath,
            languageMode: options.language || 'auto',
            model: options.model || 'base',
            onProgress: (p: number) => event.sender.send('transcribe-progress', p),
            onLog: (l: string) => event.sender.send('transcribe-log', l),
        });
        
        return { success: true, transcription: JSON.stringify(jsonOutput) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});
