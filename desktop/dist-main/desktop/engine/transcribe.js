"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
async function transcribeAudio(options) {
    const { filePath, model = 'base', language = 'en', onProgress, onLog } = options;
    const outputDir = path_1.default.dirname(filePath);
    // Whisper CLI generates the JSON file with the same name as the input file
    const fileNameNoExt = path_1.default.basename(filePath, path_1.default.extname(filePath));
    const jsonPath = path_1.default.join(outputDir, `${fileNameNoExt}.json`);
    // Simplified Binary Resolution
    // Use absolute path to Python to allow shell: false (safest for args)
    // We found this path on the user's system via 'Get-Command python'
    const pythonBin = 'C:\\Program Files\\Python313\\python.exe';
    // NO manual quoting needed when shell: false. Node handles spaces perfectly.
    // Build arguments list dynamically
    const commandArgs = ['-m', 'whisper'];
    // 1. Core Config
    commandArgs.push('--model', model);
    commandArgs.push('--output_format', 'json');
    commandArgs.push('--output_dir', outputDir);
    commandArgs.push('--fp16', 'False');
    // 2. Language Setup
    const whisperLang = language === 'hinglish' ? 'hi' : language;
    if (whisperLang && whisperLang !== 'auto') {
        commandArgs.push('--language', whisperLang);
    }
    // 3. Quality & Speed Optimization
    commandArgs.push('--temperature', '0');
    commandArgs.push('--threads', '8');
    commandArgs.push('--word_timestamps', 'True');
    commandArgs.push('--max_line_width', '40');
    commandArgs.push('--max_line_count', '1');
    // 4. Prompting for Correct Script
    if (language === 'hinglish') {
        commandArgs.push('--initial_prompt', 'Namaste, ye ek AI trend video hai. Isme ChatGPT, photo upload, secret prompt, realistic video, image type, comment, dm aur follow ke bare mein baat ho rahi hai.');
    }
    else if (language === 'hi') {
        commandArgs.push('--initial_prompt', 'नमस्ते, यह एक एआई ट्रेंड वीडियो है। इसमें चैटजीपीटी, फोटो अपलोड, सीक्रेट प्रॉम्प्ट, रियलिस्टिक वीडियो, इमेज टाइप, कमेंट, डीएम और फॉलो के बारे में बात हो रही है।');
    }
    // 5. INPUT FILE (Must be at the end)
    commandArgs.push(filePath);
    // Add verbose flag only if strictly needed, but 'False' was causing errors. 
    // Usually omitting it is cleaner.
    // commandArgs.push('--verbose', 'False'); 
    return new Promise((resolve, reject) => {
        const whisper = (0, child_process_1.spawn)(pythonBin, commandArgs, {
            shell: false, // <--- Key change: disable shell for reliable arg passing
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8', // <--- CRITICAL FIX: Forces Python to use UTF-8 for logs, preventing crashes efficiently on Windows with non-English text
                PYTHONUTF8: '1', // Additional safeguard for Python 3.7+
                // Add common paths where winget might have installed ffmpeg if not in system PATH
                PATH: `${process.env.PATH};${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-6.0-full_build\\bin;${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Links`
            }
        });
        whisper.stdout.on('data', (data) => {
            if (onLog)
                onLog(data.toString());
            // Rough progress: if we see output, we are working.
            if (onProgress)
                onProgress(0.1);
        });
        whisper.stderr.on('data', (data) => {
            // Whisper prints progress to stderr often
            // Example: [00:00.000 --> 00:07.000]
            const log = data.toString();
            if (onLog)
                onLog(log);
            // Try to parse timestamp for progress (simple heuristic)
            if (log.includes('-->')) {
                if (onProgress)
                    onProgress(0.5); // At least half way if segments generating
            }
        });
        whisper.on('error', (err) => {
            const isMissing = err.code === 'ENOENT';
            const logMsg = isMissing ? 'Python executable not found in PATH.' : `Spawn error: ${err.message}`;
            if (onLog)
                onLog(`[ERROR] ${logMsg}`);
            reject(new Error(isMissing
                ? "Python not found. Please ensure Python is installed and added to PATH."
                : `Whisper Error: ${err.message}`));
        });
        whisper.on('close', async (code) => {
            if (code === 0) {
                if (onProgress)
                    onProgress(1);
                try {
                    // Read the generated JSON
                    if (await fs_extra_1.default.pathExists(jsonPath)) {
                        const content = await fs_extra_1.default.readFile(jsonPath, 'utf-8');
                        const parsed = JSON.parse(content);
                        if (!parsed.segments || parsed.segments.length === 0) {
                            throw new Error("Transcribed audio was empty or silent. Please check the file.");
                        }
                        // Transform output to match user request
                        const lastSegment = parsed.segments[parsed.segments.length - 1];
                        const duration = parsed.duration || lastSegment?.end || 0; // Calculate duration if missing
                        // Robustly find language probability (sometimes nested or missing)
                        let langProb = 0.999;
                        if (parsed.language_probability)
                            langProb = parsed.language_probability;
                        else if (parsed.language_score)
                            langProb = parsed.language_score; // Some variants
                        const rawSegments = parsed.segments.map((s) => ({
                            start: s.start,
                            end: s.end,
                            text: s.text ? s.text.trim() : ""
                        }));
                        // 2. STRICT SPLITTING: Force segments to be 3-5 seconds
                        const MAX_DURATION = 5.0;
                        const finalSegments = [];
                        // HINDI TECH AUTOCORRECT DICTIONARY
                        const corrections = {
                            "एएई ट्रेंड": "एआई ट्रेंड",
                            "चाजजीपीटी": "चैटजीपीटी",
                            "अपलूट": "अपलोड",
                            "सिक्रित": "सीक्रेट",
                            "प्रम्ट": "प्रॉम्ट",
                            "ताईप": "टाइप",
                            "रेलिस्टेक": "रियलिस्टिक",
                            "वीटियो": "वीडियो",
                            "कनवर्ट": "कन्वर्ट",
                            "चाएगे": "चाहिए",
                            "कमन": "कमेंट",
                            "दीम": "डीएम",
                            "देदीम": "डीएम",
                            "शोलो": "फॉलो",
                            "एनने": "मिल",
                            "जगर": "जगह",
                            "वारल": "वायरल"
                        };
                        const correctText = (t) => {
                            let fixed = t;
                            Object.keys(corrections).forEach(wrong => {
                                fixed = fixed.split(wrong).join(corrections[wrong]);
                            });
                            return fixed;
                        };
                        rawSegments.forEach((seg) => {
                            const duration = seg.end - seg.start;
                            if (duration > MAX_DURATION) {
                                const words = seg.text.split(' ');
                                const numChunks = Math.ceil(duration / 4.0);
                                const wordsPerChunk = Math.ceil(words.length / numChunks);
                                for (let i = 0; i < numChunks; i++) {
                                    const chunkWords = words.slice(i * wordsPerChunk, (i + 1) * wordsPerChunk);
                                    if (chunkWords.length === 0)
                                        continue;
                                    const chunkStart = seg.start + (i * (duration / numChunks));
                                    const chunkEnd = (i === numChunks - 1) ? seg.end : seg.start + ((i + 1) * (duration / numChunks));
                                    finalSegments.push({
                                        start: Number(chunkStart.toFixed(2)),
                                        end: Number(chunkEnd.toFixed(2)),
                                        text: correctText(chunkWords.join(' '))
                                    });
                                }
                            }
                            else {
                                finalSegments.push({ ...seg, text: correctText(seg.text) });
                            }
                        });
                        const data = {
                            language: parsed.language || "en",
                            language_probability: langProb,
                            duration: duration,
                            segments: finalSegments.map((s, index) => ({
                                id: index + 1,
                                start: s.start,
                                end: s.end,
                                text: s.text
                            }))
                        };
                        resolve(JSON.stringify(data, null, 2));
                    }
                    else {
                        // Fail if no output generated (means Whisper skipped or failed)
                        reject(new Error("Transcription failed: No output file generated. Check logs for errors."));
                    }
                }
                catch (e) {
                    reject(e);
                }
            }
            else {
                reject(new Error(`Whisper process exited with code ${code}`));
            }
        });
    });
}
//# sourceMappingURL=transcribe.js.map