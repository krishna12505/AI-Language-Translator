
from flask import Flask, render_template, request, jsonify
import os

from translator import translate_text


# =====================================
# 1. FLASK CONFIGURATION
# =====================================

app = Flask(__name__)


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

        if not source_language or not target_language:
            return jsonify({
                "error": "Please select both languages."
            }), 400

        translated_text = translate_text(
            text,
            source_language,
            target_language
        )

        return jsonify({
            "translated_text": translated_text
        }), 200

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    except Exception:
        app.logger.exception("Text translation failed")

        return jsonify({
            "error": "Translation failed. Please try again."
        }), 500


# =====================================
# 4. RUN APPLICATION
# =====================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("FLASK_DEBUG") == "1"
    )
