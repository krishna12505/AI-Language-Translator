
import requests

LANGUAGES = {
    "english": "en", "en": "en",
    "hindi": "hi", "hi": "hi",
    "telugu": "te", "te": "te",
    "tamil": "ta", "ta": "ta",
    "french": "fr", "fr": "fr",
    "german": "de", "de": "de",
    "spanish": "es", "es": "es",
    "japanese": "ja", "ja": "ja",
    "chinese": "zh-CN", "zh": "zh-CN", "zh-cn": "zh-CN",
    "arabic": "ar", "ar": "ar"
}


def translate_text(text, source_language, target_language):

    if not text or not text.strip():
        raise ValueError("Please enter some text to translate.")

    source = str(source_language).strip().lower()
    target = str(target_language).strip().lower()

    if source in ("auto", "automatic", "detect"):
        raise ValueError(
            "Automatic language detection is not supported by this API. "
            "Please select the source language."
        )

    source_code = LANGUAGES.get(source)
    target_code = LANGUAGES.get(target)

    if not source_code:
        raise ValueError(f"Unsupported source language: {source_language}")

    if not target_code:
        raise ValueError(f"Unsupported target language: {target_language}")

    if source_code == target_code:
        return text

    url = "https://api.mymemory.translated.net/get"

    try:
        response = requests.get(
            url,
            params={
                "q": text,
                "langpair": f"{source_code}|{target_code}"
            },
            timeout=20
        )

        response.raise_for_status()
        data = response.json()

        if data.get("responseStatus") != 200:
            raise RuntimeError(
                data.get("responseDetails") or "Translation failed."
            )

        result = data.get("responseData", {}).get("translatedText")

        if not result:
            raise RuntimeError("Translation service returned no result.")

        return result

    except requests.RequestException as error:
        raise RuntimeError(
            "Unable to connect to the translation service."
        ) from error
