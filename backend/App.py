from flask import Flask, request, jsonify
import base64
import tempfile
import os
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

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

        # Use new SDK structure with 'client.audio.transcriptions.create(...)'
        with open(tmp_file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-1",
                language="he"
            )

        os.remove(tmp_file_path)

        return jsonify({"transcription": transcription.text})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
