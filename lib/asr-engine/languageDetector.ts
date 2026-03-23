import { spawn } from 'child_process';

/**
 * Detects the language of an audio file using a swift Whisper pass or honors manual override.
 */
export async function detectLanguage(audioPath: string, manualOverride?: string): Promise<string> {
    if (manualOverride && manualOverride !== 'auto') {
        const lower = manualOverride.toLowerCase();
        // Just return hinglish directly if it's the override
        if (lower === 'hinglish') return 'hinglish';
        return lower;
    }
    
    return new Promise((resolve) => {
        const pythonBin = 'python';
        // Run a tiny model to detect language instantly and then kill
        const whisper = spawn(pythonBin, ['-m', 'whisper', audioPath, '--model', 'tiny', '--task', 'transcribe', '--language', 'auto']);
        
        let detected = 'en'; 
        let detectedFound = false;
        
        const extractLanguage = (data: Buffer) => {
            const str = data.toString();
            // Whisper output looks like: "Detected language: English"
            const match = str.match(/Detected language: (\w+)/i);
            
            if (match && !detectedFound) {
                const lang = match[1].toLowerCase();
                const map: Record<string, string> = {
                    "english": "en",
                    "hindi": "hi",
                    "tamil": "ta",
                    "telugu": "te",
                    "bengali": "bn",
                    "malayalam": "ml",
                    "kannada": "kn",
                    "marathi": "mr",
                    "gujarati": "gu",
                    "punjabi": "pa",
                    "odia": "or",
                    "assamese": "as",
                };
                detected = map[lang] || "en";
                detectedFound = true;
                
                // Kill the process as we have what we need, saving massive CPU cycles
                try {
                    whisper.kill('SIGKILL');
                } catch(e) {}
            }
        };

        whisper.stdout.on('data', extractLanguage);
        whisper.stderr.on('data', extractLanguage);

        whisper.on('close', () => {
             resolve(detected);
        });
        
        whisper.on('error', () => {
             resolve('en'); // Safe fallback
        });
    });
}
