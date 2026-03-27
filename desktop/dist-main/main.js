"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const isDev = process.env.NODE_ENV === "development";
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        title: "TSX Studio",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            // We keep the preload to allow the live site to communicate with future local features if needed,
            // but we strictly change the loading logic to point to the Sigma production URL.
            preload: path_1.default.join(__dirname, "preload.js")
        }
    });
    // Remove menu bar for a cleaner "App" look
    mainWindow.setMenuBarVisibility(false);
    console.log("Loading URL:", isDev
        ? "http://localhost:3000"
        : "https://tsx-studio-v1-sigma.vercel.app/");
    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
    }
    else {
        mainWindow.loadURL("https://tsx-studio-v1-sigma.vercel.app/");
    }
    // Ensure external links open in the default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://tsx-studio-v1-sigma.vercel.app") || url.startsWith("http://localhost")) {
            return { action: "allow" };
        }
        electron_1.shell.openExternal(url);
        return { action: "deny" };
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