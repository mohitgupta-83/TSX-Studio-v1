import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const language = formData.get('language') as string;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file, 'audio.mp3'); // or whatever filename
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('temperature', '0');
    groqFormData.append('response_format', 'verbose_json');
    
    if (language && language !== 'auto') {
      groqFormData.append('language', language);
    }

    console.log("Sending to Groq API...");
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
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
        text: s.text.trim()
      })) : []
    };

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
        ...jsonOutput,
        txt: txtOutput,
        srt: srtOutput
      })
    });

  } catch (error: any) {
    console.error("Groq transcription error:", error);
    return NextResponse.json({ error: 'Cloud transcription unavailable. Try again or use desktop version.' }, { status: 500 });
  }
}
