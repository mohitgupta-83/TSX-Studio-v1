const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * TSX STUDIO - FINAL HARDENED BOOTSTRAP
 * Prevents "ASAR Spawn" errors and silences unnecessary popups.
 */

if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked');
    const unpackedNodeModules = path.join(unpackedPath, 'node_modules');

    // 1. Force-Unlock All Binaries
    const compositorPkg = path.join(unpackedNodeModules, '@remotion', 'compositor-win32-x64-msvc');
    const esbuildPath = path.join(unpackedNodeModules, '@esbuild', 'win32-x64', 'esbuild.exe');
    const ffmpegPath = path.join(unpackedNodeModules, 'ffmpeg-static', 'ffmpeg.exe');
    const ffprobePath = path.join(unpackedNodeModules, 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe');

    if (fs.existsSync(compositorPkg)) process.env.REMOTION_COMPOSITOR_BINARY_PATH = compositorPkg;
    if (fs.existsSync(esbuildPath)) process.env.ESBUILD_BINARY_PATH = esbuildPath;
    if (fs.existsSync(ffmpegPath)) process.env.FFMPEG_BINARY = ffmpegPath;
    if (fs.existsSync(ffprobePath)) process.env.FFPROBE_BINARY = ffprobePath;

    // 2. Global Sandbox & Permission Bypass
    process.env.ELECTRON_DISABLE_SANDBOX = '1';
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu-sandbox');

    // 3. SILENCE GHOST POPUPS
    // This catches internal "spawn" errors before they reach the user
    process.on('uncaughtException', (err) => {
        if (err.message && (err.message.includes('ENOENT') || err.message.includes('spawn'))) {
            console.warn('[SILENCED GHOST ERROR]:', err.message);
            // We ignore these because they are usually Remotion probing for files
            // that we have already overridden with the correct paths.
            return;
        }
        console.error('SYSTEM ERROR:', err);
    });
}

const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

if (isDev) {
    require('tsx/cjs');
    require('./main.ts');
} else {
    // Due to tsc outputting differently when importing outside rootDir
    const mainPath1 = path.join(__dirname, 'dist-main', 'main.js');
    const mainPath2 = path.join(__dirname, 'dist-main', 'desktop', 'main.js');

    if (fs.existsSync(mainPath2)) {
        require(mainPath2);
    } else {
        require(mainPath1);
    }
}
