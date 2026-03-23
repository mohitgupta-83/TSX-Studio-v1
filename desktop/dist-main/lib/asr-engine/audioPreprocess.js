"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessAudio = preprocessAudio;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
async function preprocessAudio(inputPath) {
    const tmpDir = os_1.default.tmpdir();
    const outputPath = path_1.default.join(tmpDir, `preprocessed_${Date.now()}.wav`);
    return new Promise((resolve, reject) => {
        // -ac 1: mono
        // -ar 16000: 16kHz
        // -af loudnorm: normalize volume
        const ffmpeg = (0, child_process_1.spawn)('ffmpeg', [
            '-y',
            '-i', inputPath,
            '-ac', '1',
            '-ar', '16000',
            '-af', 'loudnorm',
            outputPath
        ]);
        ffmpeg.on('close', (code) => {
            if (code === 0)
                resolve(outputPath);
            else
                reject(new Error(`ffmpeg exited with code ${code}`));
        });
        ffmpeg.on('error', reject);
    });
}
//# sourceMappingURL=audioPreprocess.js.map