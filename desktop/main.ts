import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs-extra";
import { processAudioWithEngine } from "../lib/asr-engine/router";
import { renderProject } from './engine/render';
import { checkSystem } from './engine/system-check';
import { getTemplateById } from '../lib/template-system/registry';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "TSX Studio",
    backgroundColor: "#000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
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
            // Legacy transcript injection removed. Web application now natively handles formatting and tabs.
        }
    `).catch(console.error);
  });

  // Link behavior
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(sigmaUrl) || url.startsWith("tsx-studio://")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// Whisper / Rendering Handlers (Required for the "New" app experience)
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
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const code = template.generateCode(values);
    const result = await renderProject({
      ...restOptions,
      code,
      onProgress: (p) => event.sender.send('render-progress', p),
      onLog: (l) => event.sender.send('render-log', l),
    });
    return { success: true, path: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transcribe-media', async (event, options) => {
  try {
    const output = await processAudioWithEngine({
      audioPath: options.filePath,
      languageMode: options.language || 'auto',
      model: options.model || 'base',
      scriptMode: options.script,
      onProgress: (p) => event.sender.send('transcribe-progress', p),
      onLog: (l) => event.sender.send('transcribe-log', l),
    });
    const casted = output as any;
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
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-path', async (event, filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      shell.showItemInFolder(filePath);
      return { success: true };
    }
    return { success: false, error: "File not found" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
