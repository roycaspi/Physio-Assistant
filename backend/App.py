from flask import Flask, request, jsonify
from transformers import pipeline
import base64
import io
import openai
# from pydub import AudioSegment
# from pydub.utils import which
from flask_cors import CORS
import wave
import os
import numpy as np
from dotenv import load_dotenv
load_dotenv()


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS so your React Native app can access it


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        data = request.get_json()
        file_data = base64.b64decode(data["fileData"])
        file_name = data.get("fileName", "audio.m4a")

        # Prepare file-like object
        audio_file = io.BytesIO(file_data)
        audio_file.name = file_name

        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="he"
        )
        return jsonify({"transcription": result.text})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
