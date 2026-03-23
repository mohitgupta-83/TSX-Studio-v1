import sys
import json
import os
import time

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("ERROR: faster-whisper not installed. Falling back to Whisper.")
    sys.exit(1)

def transcribe(audio_path, lang, output_json):
    print(f"Loading Indic ASR optimized model (faster-whisper large-v3-turbo)...", flush=True)
    # large-v3-turbo is significantly faster on CPU (int8) while matching IndicConformer accuracy for Hindi.
    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=8)
    
    print(f"Transcribing {audio_path} in {lang}...", flush=True)
    # Adjust params for Indic languages
    segments, info = model.transcribe(audio_path, language=lang if lang != 'hinglish' else 'hi', beam_size=5)
    
    result_segments = []
    duration = 0
    print("Processing blocks...", flush=True)
    
    count = 0
    for segment in segments:
        count += 1
        duration = segment.end
        result_segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip()
        })
        
        if count % 5 == 0:
            print(f"Processing chunk {count}... (Time: {duration}s)", flush=True)

    result = {
        "language": lang,
        "duration": duration,
        "segments": result_segments
    }

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)
        
    print("Indic optimization completed.", flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(1)
        
    audio_path = sys.argv[1]
    lang = sys.argv[2]
    out_file = sys.argv[3]
    
    try:
        transcribe(audio_path, lang, out_file)
    except Exception as e:
        print(f"Indic worker error: {str(e)}")
        sys.exit(1)
