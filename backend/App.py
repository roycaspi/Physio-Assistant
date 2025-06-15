from flask import Flask, request, jsonify
import base64
import tempfile
import os
from flask_cors import CORS
import openai
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

try:
    # Preferred interface for openai>=1.0
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    def whisper_transcribe(audio_file):
        result = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            language="he",
        )
        return result.text
except Exception:  # Fallback for openai<1.0
    openai.api_key = OPENAI_API_KEY

    def whisper_transcribe(audio_file):
        result = openai.Audio.transcribe(
            model="whisper-1",
            file=audio_file,
            language="he",
        )
        return result["text"]

app = Flask(__name__)
CORS(app)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        data = request.get_json()
        file_data = base64.b64decode(data["fileData"])
        file_name = data.get("fileName", "audio.m4a")

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp_file:
            tmp_file.write(file_data)
            tmp_file_path = tmp_file.name

        # Transcribe using whichever OpenAI interface is available
        with open(tmp_file_path, "rb") as audio_file:
            transcription_text = whisper_transcribe(audio_file)

        os.remove(tmp_file_path)

        return jsonify({"transcription": transcription_text})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
