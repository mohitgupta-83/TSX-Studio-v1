import { NextResponse } from 'next/server';

const DEFAULT_GROQ_API_KEY = "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";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string;
    const customApiKey = formData.get('groqApiKey') as string;

    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GROQ_API_KEY || DEFAULT_GROQ_API_KEY;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const complexLanguages = ["hi", "hinglish", "mr", "ta", "te", "bn", "ur", "ml", "kn", "gu", "pa", "or", "as"];
    const isComplex = complexLanguages.includes(language);
    const chosenModel = isComplex ? 'whisper-large-v3-turbo' : 'whisper-large-v3';

    const groqFormData = new FormData();
    groqFormData.append('file', file, file.name || 'audio.mp4');
    groqFormData.append('model', chosenModel);
    groqFormData.append('temperature', '0');
    groqFormData.append('response_format', 'verbose_json');
    
    const script = formData.get('script') as string;
    let finalLanguage = language !== 'auto' ? language : undefined;

    if (script === 'Romanized' || script === 'Mixed') {
        finalLanguage = 'en'; // Force English for Romanized so we get latin letters
    } else if (language === 'hinglish') {
        if (script === 'Hindi') finalLanguage = 'hi';
        else finalLanguage = 'en';
    } 

    if (finalLanguage) {
        if (finalLanguage === 'hinglish') finalLanguage = 'hi';
        groqFormData.append('language', finalLanguage);
    }
    
    if (script === 'Romanized' || (language === 'hinglish' && script !== 'Hindi')) {
        groqFormData.append('prompt', 'kya chal raha hai? main theek hoon. aap kaise ho? acha, thik hai, bahut badhiya. Transcribe exactly in Romanized Hindi (Hinglish) using Latin/English characters only. Do NOT use Devanagari script (like क्या, है, ठीक). Keep the Hindi pronunciation and spelling in English script. Do NOT translate to English.');
    } else if (script === 'Hindi' || language === 'hi') {
        groqFormData.append('prompt', 'Transcribe in pure Hindi Devanagari script.');
    }

    console.log("Sending to Groq API...");
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: groqFormData as any
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json({ error: 'Cloud transcription unavailable. Try again or use desktop version.' }, { status: 500 });
    }

    const data = await response.json();
    
    // Normalize output to JSON (existing format)
    const jsonOutput = {
      language: data.language || language || 'en',
      duration: data.duration || 0,
      segments: data.segments ? data.segments.map((s: any) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
        words: s.words ? s.words.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end
        })) : []
      })) : []
    };

    // Split overly long segments to match local transcription (1.5-2 seconds)
    const MAX_DURATION = 1.6;
    const finalSegments: any[] = [];
    
    jsonOutput.segments.forEach((seg: any) => {
        const duration = seg.end - seg.start;
        if (duration > MAX_DURATION) {
            const words = seg.text.split(' ');
            const numChunks = Math.ceil(duration / MAX_DURATION);
            const wordsPerChunk = Math.ceil(words.length / numChunks);
            for (let i = 0; i < numChunks; i++) {
                const chunkWords = words.slice(i * wordsPerChunk, (i + 1) * wordsPerChunk);
                if (chunkWords.length === 0) continue;
                const chunkStart = seg.start + (i * (duration / numChunks));
                const chunkEnd = (i === numChunks - 1) ? seg.end : seg.start + ((i + 1) * (duration / numChunks));
                
                const segmentWordsList = seg.words ? seg.words.slice(i * wordsPerChunk, (i + 1) * wordsPerChunk) : [];
                
                finalSegments.push({
                    start: Number(chunkStart.toFixed(2)),
                    end: Number(chunkEnd.toFixed(2)),
                    text: chunkWords.join(' '),
                    words: segmentWordsList
                });
            }
        } else {
            finalSegments.push({
                start: Number(seg.start.toFixed(2)),
                end: Number(seg.end.toFixed(2)),
                text: seg.text,
                words: seg.words || []
            });
        }
    });

    jsonOutput.segments = finalSegments.map((s, idx) => ({ ...s, id: idx + 1 }));

    // Generate TXT format
    const txtOutput = jsonOutput.segments.map((s: any) => s.text).join(' ');

    // Generate SRT format
    const formatTime = (seconds: number) => {
      const date = new Date(0);
      date.setSeconds(Math.floor(seconds));
      date.setMilliseconds((seconds % 1) * 1000);
      const iso = date.toISOString();
      return iso.substr(11, 8) + ',' + iso.substr(20, 3);
    };

    const srtOutput = jsonOutput.segments.map((s: any, i: number) => {
      return `${i + 1}\n${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text}\n`;
    }).join('\n');

    return NextResponse.json({
      success: true,
      transcription: JSON.stringify({
        json: jsonOutput,
        txt: txtOutput,
        srt: srtOutput
      })
    });

  } catch (error: any) {
    console.error("Groq transcription error:", error);
    return NextResponse.json({ error: 'Cloud transcription unavailable. Try again or use desktop version.' }, { status: 500 });
  }
}
