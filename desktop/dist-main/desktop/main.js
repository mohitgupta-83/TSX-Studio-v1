"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const render_1 = require("./engine/render");
const system_check_1 = require("./engine/system-check");
const router_1 = require("../lib/asr-engine/router");
const registry_1 = require("../lib/template-system/registry");
const fs_extra_1 = __importDefault(require("fs-extra"));
let mainWindow = null;
const isDev = !electron_1.app.isPackaged && process.env.NODE_ENV === 'development';
let userToken = null;
let pendingToken = null;
// 1. Register Custom Protocol (Deep Linking)
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        electron_1.app.setAsDefaultProtocolClient('tsx-studio', process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient('tsx-studio');
}
/**
 * Handle Auth Callback from Browser
 */
function handleAuthProtocol(url) {
    if (!url)
        return;
    try {
        const urlObj = new URL(url);
        // We look for any property that looks like a token in the URL query string
        const token = urlObj.searchParams.get('token');
        if (token) {
            console.log('Successfully captured authentication token.');
            if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
                mainWindow.webContents.send('auth-success', token);
                mainWindow.focus();
            }
            else {
                // If window isn't ready, "Mailbox" the token for startup
                pendingToken = token;
            }
            userToken = token;
        }
    }
    catch (e) {
        console.error('Handshake Parse Error:', e);
    }
}
// 2. Single Instance Lock (Required for professional Deep Linking)
const gotLock = electron_1.app.requestSingleInstanceLock();
if (!gotLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine) => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
        // Windows Deep Link capture
        const url = commandLine.pop();
        if (url && url.startsWith('tsx-studio://')) {
            handleAuthProtocol(url);
        }
    });
    electron_1.app.whenReady().then(() => {
        createWindow();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
        // macOS Deep Link capture
        electron_1.app.on('open-url', (event, url) => {
            event.preventDefault();
            handleAuthProtocol(url);
        });
    });
}
function createWindow() {
    // app.getAppPath() always returns the desktop/ root folder (where package.json is),
    // regardless of whether we're packaged, running via tsx, or compiled to dist-main/.
    // __dirname is unreliable here because tsc outputs to dist-main/desktop/.
    const rootPath = electron_1.app.isPackaged ? path_1.default.join(process.resourcesPath, 'app') : electron_1.app.getAppPath();
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        title: 'TSX Studio',
        icon: path_1.default.join(rootPath, 'logo.jpg'),
        show: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: electron_1.app.isPackaged
                ? path_1.default.join(__dirname, 'preload.js')
                : path_1.default.join(rootPath, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: false
        },
    });
    // Load Management Logic: Prefer Root Server -> Local Bundle -> Cloud Fallback
    const tryUrl = async (url) => {
        try {
            await mainWindow?.loadURL(url);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    const loadApp = async () => {
        // 1. Try Next.js root server (Image 1 Style - Sync Capable)
        const success3000 = await tryUrl("http://localhost:3000");
        if (success3000)
            return;
        // 2. Try Vite dev server (During Development)
        if (process.env.NODE_ENV === "development") {
            const success5173 = await tryUrl("http://localhost:5173");
            if (success5173)
                return;
        }
        // 3. Load Local Static Bundle (Image 2 Redesign - Standalone Capable)
        const localPath = path_1.default.join(rootPath, "dist-renderer/index.html");
        try {
            await mainWindow?.loadFile(localPath);
            console.log("Loaded local bundle from:", localPath);
        }
        catch (e) {
            console.error("Local bundle failed, falling back to cloud", e);
            // 4. Absolute Fallback to Cloud Production
            mainWindow?.loadURL("https://tsx-studio-v2.vercel.app");
        }
    };
    loadApp();
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
    // Surgical DOM patch for the Vercel UI
    // Injects the fully functional SRT and TXT features natively onto the Vercel dashboard at runtime!
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.executeJavaScript(`
            if (!window._tsxStringifyPatched) {
                window._tsxLatestTranscript = null;

                const originalParse = JSON.parse;
                JSON.parse = function(text, reviver) {
                    const result = originalParse.call(JSON, text, reviver);

                    // Capture transcription data when it returns from Electron IPC
                    if (result && typeof result === 'object' && result.json && result.srt) {
                        window._tsxLatestTranscript = result;
                        console.log("[TSX] Captured transcript:", result);
                        
                        // Force a tab refresh if UI is already open
                        if (window.showTSX) window.showTSX('json');
                    }

                    return result;
                };

                function injectTabs() {
                    // Look for the transcription result container
                    let container = document.querySelector('[class*="json"]');
                    if (!container) {
                        const allNodes = Array.from(document.querySelectorAll('div, span, p'));
                        const label = allNodes.find(n => (n.textContent||'').trim() === 'JSON OUTPUT');
                        if (label && label.parentElement) container = label.parentElement;
                    }

                    if (!container) return;
                    if (document.getElementById("tsx-tabs-header")) return;

                    const tabsHeader = document.createElement("div");
                    tabsHeader.id = "tsx-tabs-header";
                    tabsHeader.style.display = "flex";
                    tabsHeader.style.gap = "10px";
                    tabsHeader.style.marginBottom = "15px";
                    tabsHeader.style.marginTop = "10px";
                    
                    const btnStyle = "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;";
                    
                    tabsHeader.innerHTML = \`
                        <button style="\${btnStyle}" onclick="showTSX('json')">JSON</button>
                        <button style="\${btnStyle}" onclick="showTSX('srt')">SRT</button>
                        <button style="\${btnStyle}" onclick="showTSX('txt')">TXT</button>
                    \`;

                    const outputArea = document.createElement("pre");
                    outputArea.id = "tsx-output-display";
                    outputArea.style.background = "#09090b";
                    outputArea.style.border = "1px solid rgba(255,255,255,0.1)";
                    outputArea.style.borderRadius = "12px";
                    outputArea.style.padding = "20px";
                    outputArea.style.color = "#4ade80";
                    outputArea.style.fontSize = "13px";
                    outputArea.style.fontFamily = "monospace";
                    outputArea.style.maxHeight = "400px";
                    outputArea.style.overflow = "auto";
                    outputArea.style.whiteSpace = "pre-wrap";
                    outputArea.textContent = "Waiting for transcription...";

                    container.appendChild(tabsHeader);
                    container.appendChild(outputArea);

                    window.showTSX = function(type) {
                        const data = window._tsxLatestTranscript;
                        const display = document.getElementById("tsx-output-display");
                        if (!display) return;

                        if (!data) {
                            display.textContent = "No transcription data available yet. Please run a transcription job.";
                            return;
                        }

                        if (type === 'json') display.textContent = JSON.stringify(data.json, null, 2);
                        if (type === 'srt') display.textContent = data.srt || "No SRT data generated.";
                        if (type === 'txt') display.textContent = data.txt || "No TXT data generated.";
                    };
                }

                setInterval(injectTabs, 2000);
                window._tsxStringifyPatched = true;
            }
        `).catch(() => { });
    });
    // SAFETY: Prevent any links from opening inside the app window
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Only allow internal routes of the app
        const isInternal = url.startsWith('https://tsx-studio-v2.vercel.app') ||
            url.startsWith('http://localhost') ||
            url.startsWith('tsx-studio://');
        // FORCE external browser for OAuth providers
        if (url.includes('accounts.google.com') || url.includes('github.com')) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        if (isInternal) {
            return { action: 'allow' };
        }
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Intercept standard navigations (location.href)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.includes('accounts.google.com') || url.includes('api/auth/signin/google')) {
            event.preventDefault();
            electron_1.shell.openExternal(url);
        }
    });
    mainWindow.webContents.on('will-redirect', (event, url) => {
        if (url.includes('accounts.google.com')) {
            event.preventDefault();
            electron_1.shell.openExternal(url);
        }
    });
}
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// --- IPC Handlers ---
electron_1.ipcMain.handle('get-pending-token', () => {
    const token = pendingToken;
    pendingToken = null; // Clear the mailbox after delivery
    return token;
});
electron_1.ipcMain.handle('check-system', async () => {
    return await (0, system_check_1.checkSystem)();
});
electron_1.ipcMain.handle('render-project', async (event, options) => {
    try {
        const result = await (0, render_1.renderProject)({
            ...options,
            onProgress: (p) => event.sender.send('render-progress', p),
            onLog: (l) => event.sender.send('render-log', l),
        });
        return { success: true, path: result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('render-template', async (event, options) => {
    try {
        const { templateId, values, ...restOptions } = options;
        const template = (0, registry_1.getTemplateById)(templateId);
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
        const result = await (0, render_1.renderProject)({
            ...restOptions,
            code, // Inject the freshly generated TSX
            onProgress: (p) => event.sender.send('render-progress', p),
            onLog: (l) => event.sender.send('render-log', l),
        });
        return { success: true, path: result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
let userTranscriptionToken = null;
electron_1.ipcMain.handle('save-token', (_, token) => { userTranscriptionToken = token; });
electron_1.ipcMain.handle('get-token', () => { return userTranscriptionToken; });
electron_1.ipcMain.handle('open-path', (_, path) => { electron_1.shell.showItemInFolder(path); });
electron_1.ipcMain.handle('login', async () => {
    const authUrl = 'https://tsx-studio-v2.vercel.app/api/auth/desktop';
    await electron_1.shell.openExternal(authUrl);
});
electron_1.ipcMain.handle('get-render-logs', async () => {
    const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'render-debug.log');
    if (await fs_extra_1.default.pathExists(logPath)) {
        return await fs_extra_1.default.readFile(logPath, 'utf8');
    }
    return 'No logs found.';
});
electron_1.ipcMain.handle('install-whisper-engine', async (event) => {
    const { exec } = require('child_process');
    const runCommand = (cmd) => {
        return new Promise((resolve, reject) => {
            event.sender.send('transcribe-log', `[SETUP] Running: ${cmd}`);
            const proc = exec(cmd);
            proc.stdout.on('data', (data) => { event.sender.send('transcribe-log', `[SETUP] ${data.toString()}`); });
            proc.on('close', (code) => { code === 0 ? resolve(true) : reject(new Error(`Failed ${code}`)); });
        });
    };
    try {
        await runCommand('pip install -U openai-whisper faster-whisper');
        try {
            await runCommand('winget install ffmpeg --accept-source-agreements');
        }
        catch (e) { }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('transcribe-media', async (event, options) => {
    try {
        const jsonOutput = await (0, router_1.processAudioWithEngine)({
            audioPath: options.filePath,
            languageMode: options.language || 'auto',
            model: options.model || 'base',
            onProgress: (p) => event.sender.send('transcribe-progress', p),
            onLog: (l) => event.sender.send('transcribe-log', l),
        });
        // 1. Separate the data strings
        const casted = jsonOutput;
        const srtData = casted.srt;
        const txtData = casted.txt;
        // Data will be returned to the renderer — user decides when to export via the UI.
        const cleanJson = { ...casted };
        delete cleanJson.srt;
        delete cleanJson.txt;
        console.log("Sending response:", {
            json: !!cleanJson,
            srt: !!srtData,
            txt: !!txtData
        });
        return {
            success: true,
            transcription: JSON.stringify({
                json: cleanJson,
                srt: srtData || "",
                txt: txtData || ""
            })
        };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
//# sourceMappingURL=main.js.map