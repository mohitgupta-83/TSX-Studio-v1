import { app, BrowserWindow, shell } from "electron";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "TSX Studio",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // We keep the preload to allow the live site to communicate with future local features if needed,
      // but we strictly change the loading logic to point to the Sigma production URL.
      preload: path.join(__dirname, "preload.js")
    }
  });

  // Remove menu bar for a cleaner "App" look
  mainWindow.setMenuBarVisibility(false);

  console.log("Loading URL:", isDev
    ? "http://localhost:3000"
    : "https://tsx-studio-v1-sigma.vercel.app/"
  );

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadURL("https://tsx-studio-v1-sigma.vercel.app/");
  }

  // Ensure external links open in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://tsx-studio-v1-sigma.vercel.app") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
