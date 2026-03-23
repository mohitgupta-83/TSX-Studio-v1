export interface CaptionLine {
    text: string;
    duration: number; // in seconds
}

export function processScript(text: string): CaptionLine[] {
    // Basic splitting by punctuation or newline
    const lines = text
        .split(/(?<=[.?!])\s+|\n+/)
        .map(l => l.trim())
        .filter(line => line.length > 0);
    
    return lines.map(line => {
        // Average words per minute is ~150 => 2.5 words per sec.
        const wordCount = line.split(/\s+/).length;
        // Min 1.5 seconds, estimate 0.4s per word.
        const duration = Math.max(1.5, wordCount * 0.4); 
        return {
            text: line,
            duration: Number(duration.toFixed(2))
        };
    });
}
