"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const router_1 = require("../lib/asr-engine/router");
const render_1 = require("./engine/render");
const system_check_1 = require("./engine/system-check");
const registry_1 = require("../lib/template-system/registry");
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        title: "TSX Studio",
        backgroundColor: "#000000",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path_1.default.join(__dirname, "preload.js")
        }
    });
    mainWindow.setMenuBarVisibility(false);
    // The single source of truth for the desktop application
    const sigmaUrl = "https://tsx-studio-v1-sigma.vercel.app/";
    console.log("Loading High-End Studio Environment:", sigmaUrl);
    mainWindow.loadURL(sigmaUrl);
    /**
     * INJECTION: RESTORING PRO FEATURES
     * This injects the SRT/TXT/JSON tabs into the Vercel dashboard at runtime,
     * effectively upgrading the website into the "Best" desktop application.
     */
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
        if (!window._tsxStringifyPatched) {
            window._tsxLatestTranscript = null;
            const originalParse = JSON.parse;
            JSON.parse = function(text, reviver) {
                const result = originalParse.call(JSON, text, reviver);
                if (result && typeof result === 'object' && result.json && result.srt) {
                    window._tsxLatestTranscript = result;
                    if (window.showTSX) window.showTSX('json');
                }
                return result;
            };

            function injectTabs() {
                let container = document.querySelector('[class*="json"]');
                if (!container) {
                    const allNodes = Array.from(document.querySelectorAll('div, span, p'));
                    const label = allNodes.find(n => (n.textContent||'').trim() === 'JSON OUTPUT');
                    if (label && label.parentElement) container = label.parentElement;
                }
                if (!container || document.getElementById("tsx-tabs-header")) return;

                const header = document.createElement("div");
                header.id = "tsx-tabs-header";
                header.style.cssText = "display:flex; gap:10px; margin-bottom:15px; margin-top:10px;";
                const btnStyle = "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;";
                
                header.innerHTML = \`
                    <button style="\${btnStyle}" onclick="showTSX('json')">JSON</button>
                    <button style="\${btnStyle}" onclick="showTSX('srt')">SRT</button>
                    <button style="\${btnStyle}" onclick="showTSX('txt')">TXT</button>
                \`;

                const display = document.createElement("pre");
                display.id = "tsx-output-display";
                display.style.cssText = "background:#09090b; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:20px; color:#4ade80; font-size:13px; font-family:monospace; max-height:400px; overflow:auto; white-space:pre-wrap;";
                display.textContent = "Waiting for transcription...";

                container.appendChild(header);
                container.appendChild(display);

                window.showTSX = function(type) {
                    const data = window._tsxLatestTranscript;
                    const d = document.getElementById("tsx-output-display");
                    if (!d || !data) return;
                    if (type === 'json') d.textContent = JSON.stringify(data.json, null, 2);
                    if (type === 'srt') d.textContent = data.srt;
                    if (type === 'txt') d.textContent = data.txt;
                };
            }
            setInterval(injectTabs, 2000);
            window._tsxStringifyPatched = true;
        }
    `).catch(console.error);
    });
    // Link behavior
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith(sigmaUrl) || url.startsWith("tsx-studio://"))
            return { action: "allow" };
        electron_1.shell.openExternal(url);
        return { action: "deny" };
    });
}
// Whisper / Rendering Handlers (Required for the "New" app experience)
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
        if (!template)
            throw new Error(`Template not found: ${templateId}`);
        const code = template.generateCode(values);
        const result = await (0, render_1.renderProject)({
            ...restOptions,
            code,
            onProgress: (p) => event.sender.send('render-progress', p),
            onLog: (l) => event.sender.send('render-log', l),
        });
        return { success: true, path: result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('transcribe-media', async (event, options) => {
    try {
        const output = await (0, router_1.processAudioWithEngine)({
            audioPath: options.filePath,
            languageMode: options.language || 'auto',
            model: options.model || 'base',
            scriptMode: options.script,
            onProgress: (p) => event.sender.send('transcribe-progress', p),
            onLog: (l) => event.sender.send('transcribe-log', l),
        });
        const casted = output;
        const srt = casted.srt || "";
        const txt = casted.txt || "";
        delete casted.srt;
        delete casted.txt;
        return {
            success: true,
            transcription: JSON.stringify({
                json: casted,
                srt: srt,
                txt: txt
            })
        };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
electron_1.ipcMain.handle('open-path', async (event, filePath) => {
    try {
        if (await fs_extra_1.default.pathExists(filePath)) {
            electron_1.shell.showItemInFolder(filePath);
            return { success: true };
        }
        return { success: false, error: "File not found" };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
//# sourceMappingURL=main.js.map