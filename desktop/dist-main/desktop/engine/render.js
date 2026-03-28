"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderProject = renderProject;
const bundler_1 = require("@remotion/bundler");
const renderer_1 = require("@remotion/renderer");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const electron_1 = require("electron");
const ffmpeg_1 = require("./ffmpeg");
const os_1 = __importDefault(require("os"));
async function reportProgress(jobId, progress, status = "RENDERING", filePath, durationSeconds, outputSizeBytes, errorMsg) {
    try {
        // MATCH THE NEW SIGMA PRODUCTION TARGET
        const apiBase = electron_1.app.isPackaged ? 'https://tsx-studio-v1-sigma.vercel.app' : 'http://localhost:3000';
        await fetch(`${apiBase}/api/render`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId,
                progress,
                status,
                storageKey: filePath,
                durationSeconds,
                outputSizeBytes,
                errorMessage: errorMsg
            })
        });
    }
    catch (e) {
        console.error("Failed to report progress to server:", e);
    }
}
async function renderProject(options) {
    const { projectId, code, durationInFrames, fps, width, height, onProgress, onLog } = options;
    const durationSeconds = Number((durationInFrames / fps).toFixed(2));
    const baseDir = electron_1.app.getPath('userData');
    const tempDir = path_1.default.join(baseDir, '.tsx-temp', projectId);
    const rendersDir = path_1.default.join(baseDir, 'renders');
    const logFile = path_1.default.join(baseDir, 'render-debug.log');
    // Writable cache for Chromium
    process.env.PUPPETEER_CACHE_DIR = path_1.default.join(baseDir, 'puppeteer-cache');
    await fs_extra_1.default.remove(logFile);
    const log = async (msg) => {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${msg}\n`;
        await fs_extra_1.default.appendFile(logFile, formatted);
        onLog(msg);
    };
    await fs_extra_1.default.ensureDir(tempDir);
    await fs_extra_1.default.ensureDir(rendersDir);
    await fs_extra_1.default.ensureDir(process.env.PUPPETEER_CACHE_DIR);
    const inputPath = path_1.default.join(tempDir, 'UserComposition.tsx');
    const entryPath = path_1.default.join(tempDir, 'index.tsx');
    const cssPath = path_1.default.join(tempDir, 'styles.css');
    const outputPath = path_1.default.join(rendersDir, `render-${projectId}-${Date.now()}.mp4`);
    try {
        await log('--- STARTING HIGH-PERFORMANCE RENDER ---');
        const binDir = process.env.REMOTION_COMPOSITOR_BINARY_PATH || undefined;
        const ffmpegPath = process.env.FFMPEG_BINARY || (0, ffmpeg_1.getFFmpegPath)();
        await log('Step 1: Preparing build...');
        await fs_extra_1.default.writeFile(inputPath, code);
        const entryContent = `
            import React from 'react';
            import { registerRoot, Composition } from 'remotion';
            import './styles.css';
            import UserComp from './UserComposition';

            export const RemotionRoot: React.FC = () => {
                return (
                    <Composition
                        id="Main"
                        component={UserComp}
                        durationInFrames={${durationInFrames}}
                        fps={${fps}}
                        width={${width}}
                        height={${height}}
                    />
                );
            };
            registerRoot(RemotionRoot);
        `;
        await fs_extra_1.default.writeFile(entryPath, entryContent);
        const cssContent = `
/* Premium Caption Typography Engine */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800;900&display=swap');

html, body, #root, [data-remotion-wrapper] {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    margin: 0;
    padding: 0;
    background-color: black;
}
`;
        await fs_extra_1.default.writeFile(cssPath, cssContent);
        await log('Step 2: Bundling Code...');
        const bundled = await (0, bundler_1.bundle)({
            entryPoint: entryPath,
            outDir: path_1.default.join(tempDir, 'bundle'),
        });
        await log('Step 3: Initializing Engine...');
        const composition = await (0, renderer_1.selectComposition)({
            serveUrl: bundled,
            id: 'Main',
            binariesDirectory: binDir
        });
        await log('Step 4: Rendering MP4 (PARALLEL MODE)...');
        // CALC OPTIMAL CONCURRENCY FOR THIS MACHINE
        const cpuCores = os_1.default.cpus().length;
        const optimalConcurrency = Math.max(1, Math.min(cpuCores - 1, 16));
        await (0, renderer_1.renderMedia)({
            composition,
            serveUrl: bundled,
            codec: 'h264',
            outputLocation: outputPath,
            concurrency: optimalConcurrency,
            chromiumOptions: {
                args: [
                    '--no-sandbox',
                    '--hide-scrollbars',
                    '--disable-web-security',
                    '--font-render-hinting=none'
                ],
            },
            binariesDirectory: binDir,
            ffmpegExecutable: ffmpegPath || undefined,
            ffprobeExecutable: process.env.FFPROBE_BINARY || (0, ffmpeg_1.getFFprobePath)() || undefined,
            onProgress: ({ progress }) => {
                const p = Math.round(progress * 100);
                onProgress(p);
                if (options.jobId)
                    reportProgress(options.jobId, p, "RENDERING", undefined, durationSeconds);
            },
        });
        let fileSize = 0;
        try {
            const stats = await fs_extra_1.default.stat(outputPath);
            fileSize = stats.size;
        }
        catch (err) { }
        await log('COMPLETE: Render successful.');
        if (options.jobId)
            await reportProgress(options.jobId, 100, "COMPLETED", outputPath, durationSeconds, fileSize);
        await fs_extra_1.default.remove(tempDir);
        return outputPath;
    }
    catch (error) {
        const errorStack = error.stack || error.message;
        await log(`ERROR: \n${errorStack} `);
        console.error("Render failed:", error);
        onLog(`Failed: ${error.message} `);
        if (options.jobId)
            await reportProgress(options.jobId, 0, "FAILED", undefined, undefined, undefined, error.message);
        throw error;
    }
}
//# sourceMappingURL=render.js.map