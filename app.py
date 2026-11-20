
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

import os
import tempfile

from translator import translate_text
from speech_recognition import (
    recognize_speech,
    recognize_speech_with_language
)


# =====================================
# 1. FLASK CONFIGURATION
# =====================================

app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

ALLOWED_AUDIO_EXTENSIONS = {
    "wav",
    "mp3",
    "m4a",
    "ogg",
    "webm",
    "flac",
    "mp4"
}


# =====================================
# 2. HOME PAGE
# =====================================

@app.route("/")
def home():
    return render_template("index.html")


# =====================================
# 3. TEXT TRANSLATION API
# =====================================

@app.route("/api/translate", methods=["POST"])
def translate():

    try:

        data = request.get_json(silent=True) or {}

        text = data.get("text", "").strip()
        source_language = data.get("source_language")
        target_language = data.get("target_language")

        if not text:
            return jsonify({
                "error": "Please enter some text."
            }), 400

        translated_text = translate_text(
            text,
            source_language,
            target_language
        )

        return jsonify({
            "translated_text": translated_text
        })

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 400

    except Exception as error:

        app.logger.exception("Text translation failed")

        return jsonify({
            "error": str(error)
        }), 500


# =====================================
# 4. CHECK AUDIO FILE EXTENSION
# =====================================

def allowed_audio_file(filename):

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_AUDIO_EXTENSIONS
    )


# =====================================
# 5. AUTOMATIC SPEECH RECOGNITION API
# =====================================

@app.route("/api/speech-to-text", methods=["POST"])
def speech_to_text():

    audio_path = None

    try:

        if "audio" not in request.files:
            return jsonify({
                "error": "Please provide an audio recording."
            }), 400

        audio_file = request.files["audio"]

        if not audio_file or not audio_file.filename:
            return jsonify({
                "error": "No audio file received."
            }), 400

        filename = secure_filename(audio_file.filename)

        if not allowed_audio_file(filename):
            return jsonify({
                "error": "Unsupported audio file format."
            }), 400

        # Auto detection is the default.
        source_language = request.form.get(
            "source_language", "Auto"
        )

        extension = os.path.splitext(filename)[1].lower()

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_audio:

            audio_path = temp_audio.name
            audio_file.save(audio_path)

        # Whisper automatically detects the spoken language
        # when source_language is Auto.

        if source_language == "Auto":

            result = recognize_speech_with_language(
                audio_path,
                None
            )

        else:

            result = recognize_speech_with_language(
                audio_path,
                source_language
            )

        return jsonify({
            "recognized_text": result["recognized_text"],
            "detected_language": result["detected_language"]
        })

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 400

    except Exception as error:

        app.logger.exception("Automatic speech recognition failed")

        return jsonify({
            "error": str(error)
        }), 500

    finally:

        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


# =====================================
# 6. SPEECH TRANSLATION API
# =====================================

@app.route("/api/speech-translate", methods=["POST"])
def speech_translate():

    audio_path = None

    try:

        if "audio" not in request.files:
            return jsonify({
                "error": "Please upload or record an audio file."
            }), 400

        audio_file = request.files["audio"]

        if not audio_file or not audio_file.filename:
            return jsonify({
                "error": "No audio file selected."
            }), 400

        filename = secure_filename(audio_file.filename)

        if not allowed_audio_file(filename):
            return jsonify({
                "error": "Unsupported audio file format."
            }), 400

        source_language = request.form.get("source_language")
        target_language = request.form.get("target_language")

        if not source_language or not target_language:
            return jsonify({
                "error": "Please select both languages."
            }), 400

        if source_language == target_language:
            return jsonify({
                "error": "Please select two different languages."
            }), 400

        extension = os.path.splitext(filename)[1].lower()

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_audio:

            audio_path = temp_audio.name
            audio_file.save(audio_path)

        # Recognize speech using selected source language
        recognized_text = recognize_speech(
            audio_path,
            source_language
        )

        # Translate recognized speech
        translated_text = translate_text(
            recognized_text,
            source_language,
            target_language
        )

        return jsonify({
            "recognized_text": recognized_text,
            "translated_text": translated_text
        })

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 400

    except Exception as error:

        app.logger.exception("Speech translation failed")

        return jsonify({
            "error": str(error)
        }), 500

    finally:

        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


# =====================================
# 7. FILE SIZE ERROR
# =====================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({
        "error": "Audio file is too large. Maximum size is 25 MB."
    }), 413


# =====================================
# 8. RUN APPLICATION
# =====================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True
    )
