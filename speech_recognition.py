
import os
import threading

# =====================================
# 1. MODEL CONFIGURATION
# =====================================

MODEL_NAME = "base"

speech_model = None
speech_device = None

model_lock = threading.Lock()
transcription_lock = threading.Lock()


# =====================================
# 2. LAZY LOAD WHISPER MODEL
# =====================================

def get_speech_model():

    global speech_model, speech_device

    if speech_model is None:

        with model_lock:

            # Check again after acquiring the lock
            if speech_model is None:

                import torch
                import whisper

                speech_device = (
                    "cuda" if torch.cuda.is_available() else "cpu"
                )

                print("Loading Whisper Speech Recognition Model...")

                speech_model = whisper.load_model(
                    MODEL_NAME,
                    device=speech_device
                )

                print("Whisper Model Loaded Successfully!")

    return speech_model


# =====================================
# 3. LANGUAGE MAPPING
# =====================================

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "ta": "Tamil",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "ja": "Japanese",
    "zh": "Chinese",
    "ar": "Arabic"
}

LANGUAGE_CODES = {
    "English": "en",
    "Hindi": "hi",
    "Telugu": "te",
    "Tamil": "ta",
    "French": "fr",
    "German": "de",
    "Spanish": "es",
    "Japanese": "ja",
    "Chinese": "zh",
    "Arabic": "ar"
}


# =====================================
# 4. SPEECH RECOGNITION
# =====================================

def recognize_speech_with_language(audio_file, source_language=None):

    if not audio_file:
        raise ValueError("Please provide an audio file.")

    if not os.path.exists(audio_file):
        raise FileNotFoundError("Audio file not found.")

    options = {
        "task": "transcribe"
    }

    if source_language and source_language != "Auto":

        language_code = LANGUAGE_CODES.get(source_language)

        if not language_code:
            raise ValueError("Unsupported source language.")

        options["language"] = language_code

    try:

        model = get_speech_model()

        # Avoid simultaneous transcription requests
        with transcription_lock:

            result = model.transcribe(
                audio_file,
                **options
            )

        recognized_text = result["text"].strip()

        detected_code = result.get("language", "")

        detected_language = LANGUAGE_NAMES.get(
            detected_code,
            detected_code
        )

        if not recognized_text:
            raise ValueError("No speech detected in the audio.")

        return {
            "recognized_text": recognized_text,
            "detected_language": detected_language
        }

    except ValueError:
        raise

    except Exception as error:

        raise RuntimeError(
            f"Speech recognition error: {str(error)}"
        ) from error


# =====================================
# 5. BACKWARD-COMPATIBLE FUNCTION
# =====================================

def recognize_speech(audio_file, source_language=None):

    result = recognize_speech_with_language(
        audio_file,
        source_language
    )

    return result["recognized_text"]
