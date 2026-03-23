import { preprocessAudio } from './audioPreprocess';
import { detectLanguage } from './languageDetector';
import { transcribeWithWhisper, ASRResult, WhisperOptions } from './whisper';
import { transcribeWithIndic } from './indic';
import fs from 'fs/promises';

const INDIC_LANGUAGES = ["hi", "hinglish", "ta", "te", "bn", "ml", "kn", "mr", "gu", "pa", "or", "as"];

export interface RouteTranscribeOptions {
    audioPath: string;
    languageMode?: string; // 'auto', 'en', 'hi', 'hinglish', etc
    model?: string; // 'tiny', 'base', 'small', 'medium', 'large'
    onProgress?: (progress: number) => void;
    onLog?: (log: string) => void;
}

export async function processAudioWithEngine(options: RouteTranscribeOptions): Promise<ASRResult> {
    const { audioPath, languageMode = 'auto', model = 'base', onProgress, onLog } = options;
    
    // STEP 6: Preprocess Audio for massive speed gains
    if (onLog) onLog("[ASR ROUTER] Preprocessing audio to 16kHz Mono...");
    const cleanAudioPath = await preprocessAudio(audioPath);
    
    try {
        // STEP 2: Language Detection
        if (onLog) onLog("[ASR ROUTER] Detecting optimal language...");
        let detectedLanguage = await detectLanguage(cleanAudioPath, languageMode);
        if (onLog) onLog(`[ASR ROUTER] Final Language Route: ${detectedLanguage}`);
        
        // STEP 3: Model Routing
        const isIndic = INDIC_LANGUAGES.includes(detectedLanguage);
        
        let result: ASRResult;
        
        if (isIndic) {
            if (onLog) onLog("[ASR ROUTER] Engaging AI4Bharat IndicConformer...");
            try {
                result = await transcribeWithIndic(cleanAudioPath, {
                    language: detectedLanguage,
                    model: model === 'tiny' || model === 'base' ? 'small' : model, // Indic strictly demands higher accuracy models mapping fallback
                    onProgress,
                    onLog
                });
            } catch (err: any) {
                // STEP 9: Fallback System
                if (onLog) onLog(`[ASR ROUTER WARNING] IndicConformer failed: ${err.message}. Falling back to Whisper!`);
                
                result = await transcribeWithWhisper(cleanAudioPath, {
                    language: detectedLanguage === 'hinglish' ? 'hi' : detectedLanguage,
                    model,
                    onProgress,
                    onLog
                });
            }
        } else {
            // Global Route
            if (onLog) onLog("[ASR ROUTER] Engaging OpenAI Whisper (Global)...");
            result = await transcribeWithWhisper(cleanAudioPath, {
                language: detectedLanguage,
                model,
                onProgress,
                onLog
            });
        }
        
        // --- GLOBAL POST-PROCESSING: 2.0 SECOND CLAMPING & FORMATTING ---
        const MAX_DURATION = 2.0;
        const finalSegments: any[] = [];
        
        const corrections: Record<string, string> = {
            "एएई ट्रेंड": "एआई ट्रेंड", "चाजजीपीटी": "चैटजीपीटी", "अपलूट": "अपलोड",
            "सिक्रित": "सीक्रेट", "प्रम्ट": "प्रॉम्ट", "ताईप": "टाइप",
            "रेलिस्टेक": "रियलिस्टिक", "वीटियो": "वीडियो", "कनवर्ट": "कन्वर्ट",
            "चाएगे": "चाहिए", "कमन": "कमेंट", "दीम": "डीएम", "शोलो": "फॉलो"
        };
        const correctText = (t: string) => {
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
                    if (chunkWords.length === 0) continue;
                    const chunkStart = seg.start + (i * (duration / numChunks));
                    const chunkEnd = (i === numChunks - 1) ? seg.end : seg.start + ((i + 1) * (duration / numChunks));
                    finalSegments.push({
                        start: Number(chunkStart.toFixed(2)),
                        end: Number(chunkEnd.toFixed(2)),
                        text: correctText(chunkWords.join(' '))
                    });
                }
            } else {
                finalSegments.push({ ...seg, text: correctText(seg.text) });
            }
        });

        // GENERATE SRT & TXT
        const formatSrtTime = (seconds: number) => {
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
        (result as any).srt = srtOutput.trim();
        (result as any).txt = txtOutput.trim();
        
        return result;
    } finally {
        // Cleanup generated temporary mono wav
        fs.unlink(cleanAudioPath).catch(() => {});
    }
}
