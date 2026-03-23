import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export async function preprocessAudio(inputPath: string): Promise<string> {
    const tmpDir = os.tmpdir();
    const outputPath = path.join(tmpDir, `preprocessed_${Date.now()}.wav`);
    
    return new Promise((resolve, reject) => {
        // -ac 1: mono
        // -ar 16000: 16kHz
        // -af loudnorm: normalize volume
        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-i', inputPath,
            '-ac', '1',
            '-ar', '16000',
            '-af', 'loudnorm',
            outputPath
        ]);

        ffmpeg.on('close', (code) => {
            if (code === 0) resolve(outputPath);
            else reject(new Error(`ffmpeg exited with code ${code}`));
        });
        
        ffmpeg.on('error', reject);
    });
}
