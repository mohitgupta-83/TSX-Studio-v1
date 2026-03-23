import sys  
import json  
try:  
    from faster_whisper import WhisperModel  
except ImportError:  
    print('ERROR')  
    sys.exit(1)  
def transcribe(audio, lang, out, model):  
    print('Loading model', model)  
    m = WhisperModel(model, device='cpu', compute_type='int8')  
    print('Transcribing...')  
    segs, info = m.transcribe(audio, language=lang)  
    for s in segs:  
        print(s.text)  
if __name__ == '__main__':  
    transcribe('test.mp3', 'hi', 'out.json', 'small')  
