from flask import Flask, request, jsonify
import base64
import io
import openai
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all domains


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        data = request.get_json()

        if not data or "fileData" not in data:
            return jsonify({"error": "Missing file data"}), 400

        # Decode the audio file
        file_data = base64.b64decode(data["fileData"])
        file_name = data.get("fileName", "audio.m4a")
        audio_file = io.BytesIO(file_data)
        audio_file.name = file_name  # Required by OpenAI

        # Call Whisper API
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
    app.run(host="0.0.0.0", port=5000, debug=True)
