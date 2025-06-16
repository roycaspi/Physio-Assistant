from flask import Flask, request, jsonify
import base64
import tempfile
import os
from flask_cors import CORS
import openai
import openai
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        data = request.get_json()
        file_data = base64.b64decode(data["fileData"])
        file_name = data.get("fileName", "audio.m4a")

        # Prepare in-memory file-like object
        audio_file = io.BytesIO(file_data)
        audio_file.name = file_name  # Required by OpenAI's old version

        # Call OpenAI Whisper API
        result = openai.Audio.transcribe(
            model="whisper-1",
            file=audio_file,
            language="he"
        )

        return jsonify({"transcription": result["text"]})
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)