"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeWithIndic = transcribeWithIndic;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function transcribeWithIndic(audioPath, options) {
    const { language = 'hi', onProgress, onLog } = options;
    const outputDir = path_1.default.dirname(audioPath);
    const fileNameNoExt = path_1.default.basename(audioPath, path_1.default.extname(audioPath));
    const jsonPath = path_1.default.join(outputDir, `${fileNameNoExt}_indic.json`);
    const pythonBin = 'python';
    // Model routing for Hinglish goes to Hindi IndicConformer
    const targetLang = language === 'hinglish' ? 'hi' : language;
    if (onLog)
        onLog(`[IndicConformer] Initializing optimized AI4Bharat core using faster-whisper (large-v3-turbo)...`);
    const pythonScript = [
        "import os",
        "os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'",
        "os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'",
        "import sys",
        "import json",
        "import traceback",
        "try:",
        "    from faster_whisper import WhisperModel",
        "except ImportError:",
        "    print('ERROR: faster-whisper not installed. Falling back to Whisper.')",
        "    sys.exit(1)",
        "def transcribe(audio_path, lang, output_json):",
        "    print('Loading Indic ASR optimized model (large-v3-turbo)...', flush=True)",
        "    try:",
        "        model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8', cpu_threads=4)",
        "    except Exception as e:",
        "        print('Int8 compute failed on CPU, falling back to float32...', flush=True)",
        "        model = WhisperModel('large-v3-turbo', device='cpu', compute_type='float32', cpu_threads=4)",
        "    print('Transcribing ' + audio_path + ' in ' + lang + '...', flush=True)",
        "    segments, info = model.transcribe(audio_path, language=lang if lang != 'hinglish' else 'hi', beam_size=5)",
        "    result_segments = []",
        "    duration = 0",
        "    count = 0",
        "    for segment in segments:",
        "        count += 1",
        "        duration = segment.end",
        "        result_segments.append({",
        "            'start': round(segment.start, 2),",
        "            'end': round(segment.end, 2),",
        "            'text': segment.text.strip()",
        "        })",
        "        if count % 5 == 0:",
        "            print('Processing chunk ' + str(count) + '... (Time: ' + str(duration) + 's)', flush=True)",
        "    result = {'language': lang, 'duration': duration, 'segments': result_segments}",
        "    with open(output_json, 'w', encoding='utf-8') as f:",
        "        json.dump(result, f, ensure_ascii=False)",
        "    print('Indic optimization completed.', flush=True)",
        "if __name__ == '__main__':",
        "    if len(sys.argv) < 4: sys.exit(1)",
        "    try:",
        "        transcribe(sys.argv[1], sys.argv[2], sys.argv[3])",
        "    except Exception as e:",
        "        print('Indic worker critically failed:', flush=True)",
        "        traceback.print_exc(file=sys.stderr)",
        "        sys.exit(1)"
    ].join('\n');
    const workerPath = path_1.default.join(outputDir, 'indic_worker_' + Date.now() + '.py');
    await promises_1.default.writeFile(workerPath, pythonScript, 'utf-8');
    const commandArgs = [
        workerPath,
        audioPath,
        targetLang,
        jsonPath
    ];
    return new Promise((resolve, reject) => {
        const indic = (0, child_process_1.spawn)(pythonBin, commandArgs, {
            shell: false,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
        });
        indic.stdout.on('data', (data) => {
            const logs = data.toString();
            if (onLog)
                onLog(`[IndicConformer Core] ${logs}`);
            if (onProgress)
                onProgress(0.1);
        });
        indic.stderr.on('data', (data) => {
            const logs = data.toString();
            if (onLog)
                onLog(`[IndicConformer] ${logs}`);
            if (logs.includes('Processing chunk') && onProgress)
                onProgress(0.5);
        });
        indic.on('error', (err) => {
            if (onLog)
                onLog(`[ERROR] IndicConformer process error: ${err.message}`);
            reject(new Error(`Indic Engine Error: ${err.message}`));
        });
        indic.on('close', async (code) => {
            if (code !== 0) {
                return reject(new Error(`Exit Code ${code}`));
            }
            if (onProgress)
                onProgress(1);
            try {
                const exists = await promises_1.default.access(jsonPath).then(() => true).catch(() => false);
                if (exists) {
                    const content = await promises_1.default.readFile(jsonPath, 'utf-8');
                    const parsed = JSON.parse(content);
                    if (!parsed.segments || parsed.segments.length === 0) {
                        return reject(new Error("IndicConformer returned empty segments."));
                    }
                    const duration = parsed.duration || parsed.segments[parsed.segments.length - 1]?.end || 0;
                    const segments = parsed.segments.map((s) => ({
                        start: Number(s.start.toFixed(2)),
                        end: Number(s.end.toFixed(2)),
                        text: s.text ? s.text.trim() : ""
                    }));
                    // Clean up tmp JSON
                    promises_1.default.unlink(jsonPath).catch(() => { });
                    resolve({
                        language,
                        duration,
                        segments
                    });
                }
                else {
                    reject(new Error("No JSON output generated by IndicConformer."));
                }
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
//# sourceMappingURL=indic.js.map