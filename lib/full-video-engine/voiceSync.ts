import { CaptionLine } from "./scriptProcessor";

export interface SyncedCaption {
    start: number; // in seconds
    end: number;   // in seconds
    text: string;
}

export function syncVoiceWithCaptions(captions: CaptionLine[], totalVoiceDurationSec: number): SyncedCaption[] {
    const totalScriptDuration = captions.reduce((sum, c) => sum + c.duration, 0);
    
    // Scale factor to fit all chunks into the actual voice generation runtime
    // Fallback exactly to 1 sequence if undefined / 0
    const scale = totalVoiceDurationSec > 0 ? (totalVoiceDurationSec / totalScriptDuration) : 1;
    
    let currentTime = 0;
    return captions.map(c => {
        const actualDuration = c.duration * scale;
        const start = currentTime;
        const end = currentTime + actualDuration;
        currentTime = end;
        
        return {
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
            text: c.text
        };
    });
}
