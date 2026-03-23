"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAudioWithEngine = processAudioWithEngine;
const audioPreprocess_1 = require("./audioPreprocess");
const languageDetector_1 = require("./languageDetector");
const whisper_1 = require("./whisper");
const indic_1 = require("./indic");
const promises_1 = __importDefault(require("fs/promises"));
const INDIC_LANGUAGES = ["hi", "hinglish", "ta", "te", "bn", "ml", "kn", "mr", "gu", "pa", "or", "as"];
async function processAudioWithEngine(options) {
    const { audioPath, languageMode = 'auto', model = 'base', onProgress, onLog } = options;
    // STEP 6: Preprocess Audio for massive speed gains
    if (onLog)
        onLog("[ASR ROUTER] Preprocessing audio to 16kHz Mono...");
    const cleanAudioPath = await (0, audioPreprocess_1.preprocessAudio)(audioPath);
    try {
        // STEP 2: Language Detection
        if (onLog)
            onLog("[ASR ROUTER] Detecting optimal language...");
        let detectedLanguage = await (0, languageDetector_1.detectLanguage)(cleanAudioPath, languageMode);
        if (onLog)
            onLog(`[ASR ROUTER] Final Language Route: ${detectedLanguage}`);
        // STEP 3: Model Routing
        const isIndic = INDIC_LANGUAGES.includes(detectedLanguage);
        let result;
        if (isIndic) {
            if (onLog)
                onLog("[ASR ROUTER] Engaging AI4Bharat IndicConformer...");
            try {
                result = await (0, indic_1.transcribeWithIndic)(cleanAudioPath, {
                    language: detectedLanguage,
                    model: model === 'tiny' || model === 'base' ? 'small' : model, // Indic strictly demands higher accuracy models mapping fallback
                    onProgress,
                    onLog
                });
            }
            catch (err) {
                // STEP 9: Fallback System
                if (onLog)
                    onLog(`[ASR ROUTER WARNING] IndicConformer failed: ${err.message}. Falling back to Whisper!`);
                result = await (0, whisper_1.transcribeWithWhisper)(cleanAudioPath, {
                    language: detectedLanguage === 'hinglish' ? 'hi' : detectedLanguage,
                    model,
                    onProgress,
                    onLog
                });
            }
        }
        else {
            // Global Route
            if (onLog)
                onLog("[ASR ROUTER] Engaging OpenAI Whisper (Global)...");
            result = await (0, whisper_1.transcribeWithWhisper)(cleanAudioPath, {
                language: detectedLanguage,
                model,
                onProgress,
                onLog
            });
        }
        // --- GLOBAL POST-PROCESSING: 2.0 SECOND CLAMPING & FORMATTING ---
        const MAX_DURATION = 2.0;
        const finalSegments = [];
        const corrections = {
            "एएई ट्रेंड": "एआई ट्रेंड", "चाजजीपीटी": "चैटजीपीटी", "अपलूट": "अपलोड",
            "सिक्रित": "सीक्रेट", "प्रम्ट": "प्रॉम्ट", "ताईप": "टाइप",
            "रेलिस्टेक": "रियलिस्टिक", "वीटियो": "वीडियो", "कनवर्ट": "कन्वर्ट",
            "चाएगे": "चाहिए", "कमन": "कमेंट", "दीम": "डीएम", "शोलो": "फॉलो"
        };
        const correctText = (t) => {
            let fixed = t;
            Object.keys(corrections).forEach(wrong => { fixed = fixed.split(wrong).join(corrections[wrong]); });
            return fixed;
        };
        result.segments.forEach((seg) => {
            const duration = seg.end - seg.start;
            if (duration > MAX_DURATION) {
                const words = seg.text.split(' ');
                const numChunks = Math.ceil(duration / 1.5);
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
        // GENERATE SRT & TXT
        const formatSrtTime = (seconds) => {
            const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
            const ms = String(Math.floor((seconds * 1000) % 1000)).padStart(3, '0');
            return `${hh}:${mm}:${ss},${ms}`;
        };
        let srtOutput = "";
        let txtOutput = "";
        finalSegments.forEach((s, i) => {
            srtOutput += `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n\n`;
            txtOutput += `${s.text}\n`;
        });
        result.segments = finalSegments.map((s, idx) => ({ ...s, id: idx + 1 }));
        result.srt = srtOutput.trim();
        result.txt = txtOutput.trim();
        return result;
    }
    finally {
        // Cleanup generated temporary mono wav
        promises_1.default.unlink(cleanAudioPath).catch(() => { });
    }
}
//# sourceMappingURL=router.js.map