
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


# =====================================
# 1. MODEL CONFIGURATION
# =====================================

MODEL_NAME = "facebook/nllb-200-distilled-600M"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# =====================================
# 2. LANGUAGE MAPPING
# =====================================

LANGUAGE_CODES = {
    "English": "eng_Latn",
    "Hindi": "hin_Deva",
    "Telugu": "tel_Telu",
    "Tamil": "tam_Taml",
    "French": "fra_Latn",
    "German": "deu_Latn",
    "Spanish": "spa_Latn",
    "Japanese": "jpn_Jpan",
    "Chinese": "zho_Hans",
    "Arabic": "arb_Arab"
}


# =====================================
# 3. LOAD TRANSLATION MODEL
# =====================================

print("Loading AI Translation Model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

model.to(DEVICE)

model.eval()

print("AI Translation Model Loaded Successfully!")


# =====================================
# 4. TRANSLATION FUNCTION
# =====================================

def translate_text(text, source_language, target_language):

    if not text or not text.strip():
        raise ValueError("Please enter some text to translate.")

    if source_language not in LANGUAGE_CODES:
        raise ValueError("Unsupported source language.")

    if target_language not in LANGUAGE_CODES:
        raise ValueError("Unsupported target language.")

    if source_language == target_language:
        raise ValueError("Source and target languages must be different.")

    source_code = LANGUAGE_CODES[source_language]
    target_code = LANGUAGE_CODES[target_language]

    try:

        # Set source language.
        tokenizer.src_lang = source_code

        # Convert text into model tokens.
        inputs = tokenizer(
            text.strip(),
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(DEVICE)

        # Generate translation.
        with torch.inference_mode():

            generated_tokens = model.generate(
                **inputs,
                forced_bos_token_id=tokenizer.convert_tokens_to_ids(
                    target_code
                ),
                max_new_tokens=512,
                num_beams=4
            )

        # Convert generated tokens into readable text.
        translated_text = tokenizer.batch_decode(
            generated_tokens,
            skip_special_tokens=True
        )[0]

        return translated_text

    except Exception as error:

        raise RuntimeError(
            f"Translation error: {str(error)}"
        ) from error
