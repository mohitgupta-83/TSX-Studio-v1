"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
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
    // Hide top menu for a cleaner experience
    mainWindow.setMenuBarVisibility(false);
    const sigmaUrl = "https://tsx-studio-v1-sigma.vercel.app/";
    console.log("Loading Unified Production URL:", sigmaUrl);
    // ALWAYS load the new V1 Sigma production URL.
    // This ensures the desktop application always reflects the latest deployed UI,
    // regardless of local dev server or old caches.
    mainWindow.loadURL(sigmaUrl);
    // Handle link clicks - keep internal navigation in the app, blow everything else to the browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://tsx-studio-v1-sigma.vercel.app")) {
            return { action: "allow" };
        }
        electron_1.shell.openExternal(url);
        return { action: "deny" };
    });
    // Check for any unauthorized redirects just in case
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith("https://tsx-studio-v1-sigma.vercel.app")) {
            event.preventDefault();
            electron_1.shell.openExternal(url);
        }
    });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
//# sourceMappingURL=main.js.map