
import os
from groq import Groq

LANGUAGES = {
    "english": "English",
    "en": "English",
    "hindi": "Hindi",
    "hi": "Hindi",
    "telugu": "Telugu",
    "te": "Telugu",
    "tamil": "Tamil",
    "ta": "Tamil",
    "french": "French",
    "fr": "French",
    "german": "German",
    "de": "German",
    "spanish": "Spanish",
    "es": "Spanish",
    "japanese": "Japanese",
    "ja": "Japanese",
    "chinese": "Chinese",
    "zh": "Chinese",
    "zh-cn": "Chinese",
    "arabic": "Arabic",
    "ar": "Arabic"
}


def translate_text(text, source_language, target_language):

    if not text or not text.strip():
        raise ValueError("Please enter some text to translate.")

    source = str(source_language).strip().lower()
    target = str(target_language).strip().lower()

    if source in ("auto", "automatic", "detect"):
        raise ValueError(
            "Please select the source language."
        )

    source_name = LANGUAGES.get(source)
    target_name = LANGUAGES.get(target)

    if not source_name:
        raise ValueError("Unsupported source language.")

    if not target_name:
        raise ValueError("Unsupported target language.")

    if source_name == target_name:
        return text

    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError(
            "Groq API key is missing. Please configure GROQ_API_KEY."
        )

    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional translator. "
                        "Translate the user's text accurately into "
                        f"{target_name}. The source language is "
                        f"{source_name}. Preserve the original meaning, "
                        "tone and formatting. Return only the translated "
                        "text. Do not explain or add comments."
                    )
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0.2,
            max_completion_tokens=2048
        )

        translated_text = (
            response.choices[0].message.content.strip()
        )

        if not translated_text:
            raise RuntimeError("No translation was returned.")

        return translated_text

    except ValueError:
        raise

    except Exception as error:
        print("Groq translation error:", str(error))
        raise RuntimeError(
            "Translation service failed. Please try again."
        ) from error
