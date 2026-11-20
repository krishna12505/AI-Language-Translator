
import torch
import whisper
import os

MODEL_NAME = "base"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("Loading Whisper Speech Recognition Model...")

speech_model = whisper.load_model(MODEL_NAME, device=DEVICE)

print("Whisper Model Loaded Successfully!")


# Whisper language codes and application language names

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


def recognize_speech_with_language(audio_file, source_language=None):

    if not audio_file:
        raise ValueError("Please provide an audio file.")

    if not os.path.exists(audio_file):
        raise FileNotFoundError("Audio file not found.")

    try:

        options = {
            "task": "transcribe"
        }

        # Use automatic language detection when source is Auto
        if source_language and source_language != "Auto":

            language_codes = {
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

            language_code = language_codes.get(source_language)

            if not language_code:
                raise ValueError("Unsupported source language.")

            options["language"] = language_code

        # Whisper automatically detects language if none is supplied
        result = speech_model.transcribe(audio_file, **options)

        recognized_text = result["text"].strip()

        detected_code = result.get("language", "")
        detected_language = LANGUAGE_NAMES.get(
            detected_code, detected_code
        )

        if not recognized_text:
            raise ValueError("No speech detected in the audio.")

        return {
            "recognized_text": recognized_text,
            "detected_language": detected_language
        }

    except Exception as error:

        raise RuntimeError(
            f"Speech recognition error: {str(error)}"
        ) from error


# Backward-compatible function for Speech Translation

def recognize_speech(audio_file, source_language=None):

    result = recognize_speech_with_language(
        audio_file,
        source_language
    )

    return result["recognized_text"]
