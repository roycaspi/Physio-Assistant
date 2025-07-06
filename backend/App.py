from flask import Flask, request, jsonify
import base64
import tempfile
import os
from flask_cors import CORS
import openai
from dotenv import load_dotenv
import requests
import subprocess
from faster_whisper import WhisperModel

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client for versions >=1.0
openai.api_key = os.getenv("OPENAI_API_KEY")

# Load Ivrit.ai ASR model once at startup
ivrit_asr = WhisperModel("ivrit-ai/whisper-large-v3-ct2", device="cpu", compute_type="int8", cpu_threads=4)

def whisper_transcribe(audio_file_path):
    with open(audio_file_path, "rb") as audio_file:
        result = openai.Audio.transcribe(
            "whisper-1",
            audio_file,
            language="he"
        )
    # Handle both dict and list return types for compatibility
    if isinstance(result, dict):
        return result.get("text", "")
    elif isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
        return result[0].get("text", "")
    else:
        return str(result)

def convert_audio_to_flac(input_path, output_path):
    """Convert audio file to FLAC format using ffmpeg"""
    try:
        # Check if ffmpeg is available
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("FFmpeg not available, trying alternative approach")
            # If ffmpeg is not available, we'll try to use the original file
            # but this might not work with Google Cloud Speech-to-Text
            return False
        
        cmd = [
            'ffmpeg', '-y',  # Overwrite output file
            '-i', input_path,  # Input file
            '-acodec', 'flac',  # Use FLAC codec
            '-ar', '16000',  # Sample rate 16kHz (optimal for speech recognition)
            '-ac', '1',  # Mono audio
            output_path  # Output file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            raise Exception(f"Audio conversion failed: {result.stderr}")
            
        return True
    except Exception as e:
        print(f"Audio conversion error: {str(e)}")
        raise

def google_transcribe(audio_file_path):
    """Transcribe using Google Cloud Speech-to-Text API"""
    flac_path = None
    try:
        # You'll need to set GOOGLE_CLOUD_API_KEY in your .env file
        api_key = os.getenv("GOOGLE_CLOUD_API_KEY")
        if not api_key:
            raise Exception("Google Cloud API key not found")
        
        # Try to convert audio to FLAC format for better compatibility
        flac_path = audio_file_path.replace('.m4a', '.flac')
        conversion_success = convert_audio_to_flac(audio_file_path, flac_path)
        
        if conversion_success and os.path.exists(flac_path):
            # Use the converted FLAC file
            audio_file_to_use = flac_path
            encoding = "FLAC"
            sample_rate = 16000
        else:
            # Fallback to original file (might not work with Google Cloud)
            audio_file_to_use = audio_file_path
            encoding = "ENCODING_UNSPECIFIED"  # Let Google Cloud auto-detect
            sample_rate = 48000  # Default sample rate
        
        # Read the audio file
        with open(audio_file_to_use, "rb") as audio_file:
            audio_content = audio_file.read()
        
        # Encode audio content
        audio_encoded = base64.b64encode(audio_content).decode('utf-8')
        
        # Google Cloud Speech-to-Text API request
        url = f"https://speech.googleapis.com/v1/speech:recognize?key={api_key}"
        
        payload = {
            "config": {
                "encoding": encoding,
                "sampleRateHertz": sample_rate,
                "languageCode": "he-IL",
                "enableAutomaticPunctuation": True,
                "model": "latest_long",
                "useEnhanced": True  # Use enhanced model for better accuracy
            },
            "audio": {
                "content": audio_encoded
            }
        }
        
        print(f"Using encoding: {encoding}, sample rate: {sample_rate}")
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        result = response.json()
        
        if "results" in result and result["results"]:
            return result["results"][0]["alternatives"][0]["transcript"]
        else:
            raise Exception("No transcription result from Google Cloud")
            
    except Exception as e:
        print(f"Google Cloud transcription error: {str(e)}")
        raise
    finally:
        # Clean up the temporary FLAC file
        if flac_path and os.path.exists(flac_path):
            try:
                os.remove(flac_path)
            except:
                pass

app = Flask(__name__)
CORS(app)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        data = request.get_json()
        file_data = base64.b64decode(data["fileData"])
        file_name = data.get("fileName", "audio.m4a")
        use_google = data.get("useGoogle", False)  # Frontend can specify which service to use

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp_file:
            tmp_file.write(file_data)
            tmp_file_path = tmp_file.name

        try:
            # Try Google Cloud first if requested and available
            if use_google and os.getenv("GOOGLE_CLOUD_API_KEY"):
                transcription_text = google_transcribe(tmp_file_path)
                print("✅ Using Google Cloud transcription")
            else:
                # Fall back to Whisper
                transcription_text = whisper_transcribe(tmp_file_path)
                print("✅ Using Whisper transcription")
                
        except Exception as transcription_error:
            print(f"Primary transcription failed: {transcription_error}")
            # Fallback to Whisper
            transcription_text = whisper_transcribe(tmp_file_path)
            print("✅ Using Whisper fallback transcription")

        os.remove(tmp_file_path)

        return jsonify({"transcription": transcription_text})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500

@app.route('/transcribe_ivritai', methods=['POST'])
def transcribe_ivritai():
    try:
        data = request.get_json()
        audio_b64 = data.get('fileData')
        if not audio_b64:
            return jsonify({'error': 'No audio data provided'}), 400

        # Save the audio to a temp file with proper permissions
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        try:
            temp_file.write(base64.b64decode(audio_b64))
            temp_file.close()
            
            # Transcribe using the ivrit-ai model
            segments, info = ivrit_asr.transcribe(temp_file.name, language="he")
            
            # Combine all segments into one text
            transcription_text = " ".join([segment.text for segment in segments])
            
            return jsonify({'transcription': transcription_text})
        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_file.name)
            except:
                pass
    except Exception as e:
        print(f"Ivrit.ai transcription error: {str(e)}")
        return jsonify({'error': 'Ivrit.ai transcription failed', 'details': str(e)}), 500