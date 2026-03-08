import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';
import { getFFmpegPath, getFFprobePath } from './ffmpeg';

interface RenderOptions {
    jobId?: string;
    projectId: string;
    code: string;
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
    onProgress: (progress: number) => void;
    onLog: (log: string) => void;
}

async function reportProgress(jobId: string, progress: number, status = "RENDERING", filePath?: string, durationSeconds?: number, outputSizeBytes?: number, errorMsg?: string) {
    try {
        const apiBase = app.isPackaged ? 'https://tsx-studio-v2.vercel.app' : 'http://localhost:3000';
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
    } catch (e) {
        console.error("Failed to report progress to server:", e);
    }
}

export async function renderProject(options: RenderOptions): Promise<string> {
    const { projectId, code, durationInFrames, fps, width, height, onProgress, onLog } = options;
    const durationSeconds = Number((durationInFrames / fps).toFixed(2));

    const baseDir = app.getPath('userData');
    const tempDir = path.join(baseDir, '.tsx-temp', projectId);
    const rendersDir = path.join(baseDir, 'renders');
    const logFile = path.join(baseDir, 'render-debug.log');

    // Writable cache for Chromium
    process.env.PUPPETEER_CACHE_DIR = path.join(baseDir, 'puppeteer-cache');

    await fs.remove(logFile);
    const log = async (msg: string) => {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${msg}\n`;
        await fs.appendFile(logFile, formatted);
        onLog(msg);
    };

    await fs.ensureDir(tempDir);
    await fs.ensureDir(rendersDir);
    await fs.ensureDir(process.env.PUPPETEER_CACHE_DIR);

    const inputPath = path.join(tempDir, 'UserComposition.tsx');
    const entryPath = path.join(tempDir, 'index.tsx');
    const cssPath = path.join(tempDir, 'styles.css');
    const outputPath = path.join(rendersDir, `render-${projectId}-${Date.now()}.mp4`);

    try {
        await log('--- STARTING CLEAN RENDER ---');
        const binDir = process.env.REMOTION_COMPOSITOR_BINARY_PATH;
        const ffmpegPath = process.env.FFMPEG_BINARY || getFFmpegPath();

        await log('Step 1: Preparing build...');
        await fs.writeFile(inputPath, code);

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
        await fs.writeFile(entryPath, entryContent);
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
        await fs.writeFile(cssPath, cssContent);

        await log('Step 2: Bundling Code...');
        const bundled = await bundle({
            entryPoint: entryPath,
            outDir: path.join(tempDir, 'bundle'),
        });

        await log('Step 3: Initializing Engine...');
        // CRITICAL FIX: Also pass binDir to selectComposition to prevent pre-flight crash
        const composition = await selectComposition({
            serveUrl: bundled,
            id: 'Main',
            binariesDirectory: binDir || undefined
        } as any);

        await log('Step 4: Rendering MP4...');

        await renderMedia({
            composition,
            serveUrl: bundled,
            codec: 'h264',
            outputLocation: outputPath,
            concurrency: 1,
            chromiumOptions: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            },
            binariesDirectory: binDir || undefined,
            ffmpegExecutable: ffmpegPath || undefined,
            ffprobeExecutable: process.env.FFPROBE_BINARY || getFFprobePath() || undefined,
            onProgress: ({ progress }) => {
                const p = Math.round(progress * 100);
                onProgress(p);
                if (options.jobId) reportProgress(options.jobId, p, "RENDERING", undefined, durationSeconds);
            },
        } as any);

        let fileSize = 0;
        try {
            const stats = await fs.stat(outputPath);
            fileSize = stats.size;
        } catch (err) { }

        await log('COMPLETE: Render successful.');
        if (options.jobId) await reportProgress(options.jobId, 100, "COMPLETED", outputPath, durationSeconds, fileSize);

        await fs.remove(tempDir);
        return outputPath;

    } catch (error: any) {
        const errorStack = error.stack || error.message;
        await log(`ERROR: \n${errorStack} `);
        console.error("Render failed:", error);

        onLog(`Failed: ${error.message} `);
        if (options.jobId) await reportProgress(options.jobId, 0, "FAILED", undefined, undefined, undefined, error.message);
        throw error;
    }
}
