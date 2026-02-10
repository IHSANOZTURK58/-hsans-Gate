"""
İhsan's Gate — TTS Server (edge-tts + Flask)
Tamamen ÜCRETSİZ, API key gerektirmeyen, yüksek kaliteli
Amerikan aksanlı Text-to-Speech sunucusu.
"""

import asyncio
import io
import os
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import edge_tts

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

VOICES = {
    "andrew": {"id": "en-US-AndrewNeural", "name": "Andrew", "gender": "Male"},
    "ava":    {"id": "en-US-AvaNeural",    "name": "Ava",    "gender": "Female"},
    "brian":  {"id": "en-US-BrianNeural",  "name": "Brian",  "gender": "Male"},
    "emma":   {"id": "en-US-EmmaNeural",   "name": "Emma",   "gender": "Female"},
    "jenny":  {"id": "en-US-JennyNeural",  "name": "Jenny",  "gender": "Female"},
    "guy":    {"id": "en-US-GuyNeural",    "name": "Guy",    "gender": "Male"},
}

DEFAULT_VOICE = "andrew"

async def generate_speech(text: str, voice_key: str = None):
    voice_info = VOICES.get(voice_key or DEFAULT_VOICE, VOICES[DEFAULT_VOICE])
    voice_id = voice_info["id"]
    communicate = edge_tts.Communicate(text, voice_id)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

@app.route('/api/tts', methods=['GET', 'POST'])
def tts_endpoint():
    try:
        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            text = data.get('text', '').strip()
            voice = data.get('voice', DEFAULT_VOICE).lower()
        else:
            # GET support for direct audio.src URL
            text = request.args.get('text', '').strip()
            voice = request.args.get('voice', DEFAULT_VOICE).lower()

        if not text:
            return jsonify({"error": "Metin bos olamaz."}), 400

        def stream_audio():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            gen = generate_speech(text, voice)
            try:
                while True:
                    try:
                        chunk = loop.run_until_complete(gen.__anext__())
                        yield chunk
                    except StopAsyncIteration:
                        break
            finally:
                loop.close()

        from flask import Response
        return Response(stream_audio(), mimetype='audio/mpeg')

    except Exception as e:
        print(f"[API Error] {e}")
        return jsonify({"error": "Sunucu hatasi."}), 500

@app.route('/api/tts/voices', methods=['GET'])
def voices_endpoint():
    return jsonify({
        "default": DEFAULT_VOICE,
        "voices": [{"key": k, **v} for k, v in VOICES.items()]
    })

@app.route('/api/health', methods=['GET'])
def health_endpoint():
    return jsonify({"status": "ok", "engine": "edge-tts", "platform": "python-flask"})

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    port = 3000
    print(f"\n🎙️  Ihsan's Gate TTS Server (Python) - http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=False)
