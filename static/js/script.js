
// =====================================
// CONFIGURATION
// =====================================

const SPEECH_LANGUAGES = {
    English: "en-US",
    Hindi: "hi-IN",
    Telugu: "te-IN",
    Tamil: "ta-IN",
    French: "fr-FR",
    German: "de-DE",
    Spanish: "es-ES",
    Japanese: "ja-JP",
    Chinese: "zh-CN",
    Arabic: "ar-SA"
};

const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let textRecognition = null;
let speechRecognition = null;

let textRecordingActive = false;
let speechRecordingActive = false;

let textTranscript = "";
let speechTranscript = "";


// =====================================
// TAB SWITCHING
// =====================================

function showTab(tabId, button) {

    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });

    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.classList.remove("active");
    });

    document.getElementById(tabId).classList.add("active");
    button.classList.add("active");
}


// =====================================
// CREATE SPEECH RECOGNITION
// =====================================

function createRecognition(language, onTranscript, onEnd, statusElement) {

    if (!SpeechRecognitionAPI) {
        throw new Error(
            "Speech recognition is not supported in this browser. Please use Google Chrome."
        );
    }

    const recognition = new SpeechRecognitionAPI();

    recognition.lang = SPEECH_LANGUAGES[language] || "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = event => {

        for (let i = event.resultIndex; i < event.results.length; i++) {

            if (event.results[i].isFinal) {

                const transcript = event.results[i][0].transcript.trim();

                if (transcript) {
                    onTranscript(transcript);
                }
            }
        }
    };

    recognition.onerror = event => {

        console.error("Speech Recognition Error:", event.error);

        if (event.error === "not-allowed" ||
            event.error === "service-not-allowed") {

            statusElement.textContent =
                "Microphone permission denied. Please allow microphone access.";

        } else if (event.error === "no-speech") {

            statusElement.textContent =
                "No speech detected. Please speak into your microphone.";

        } else if (event.error === "network") {

            statusElement.textContent =
                "Speech recognition network error. Please check your connection.";

        } else if (event.error !== "aborted") {

            statusElement.textContent =
                "Speech recognition failed: " + event.error;
        }
    };

    recognition.onend = () => {
        onEnd();
    };

    return recognition;
}


// =====================================
// TEXT TRANSLATION - START SPEAKING
// =====================================

function startTextRecording() {

    if (textRecordingActive) return;

    const sourceLanguage = document.getElementById(
        "text-source-language"
    ).value;

    const status = document.getElementById("text-speech-status");

    try {

        textTranscript = "";

        document.getElementById("text-input").value = "";

        textRecognition = createRecognition(
            sourceLanguage,

            transcript => {

                textTranscript +=
                    (textTranscript ? " " : "") + transcript;

                document.getElementById("text-input").value =
                    textTranscript;

                status.textContent = "Listening...";

            },

            () => {

                textRecordingActive = false;

                document.getElementById(
                    "text-start-recording"
                ).disabled = false;

                document.getElementById(
                    "text-stop-recording"
                ).disabled = true;

                if (textTranscript) {
                    status.textContent =
                        "Speech converted successfully! You can now click Translate.";
                } else if (status.textContent === "Listening...") {
                    status.textContent = "No speech detected. Please try again.";
                }

                textRecognition = null;
            },

            status
        );

        textRecordingActive = true;

        document.getElementById(
            "text-start-recording"
        ).disabled = true;

        document.getElementById(
            "text-stop-recording"
        ).disabled = false;

        status.textContent = "Listening... Speak now.";

        textRecognition.start();

    } catch (error) {

        textRecordingActive = false;

        status.textContent = error.message;

        document.getElementById(
            "text-start-recording"
        ).disabled = false;

        document.getElementById(
            "text-stop-recording"
        ).disabled = true;
    }
}


// =====================================
// TEXT TRANSLATION - STOP SPEAKING
// =====================================

function stopTextRecording() {

    if (!textRecognition || !textRecordingActive) return;

    document.getElementById(
        "text-stop-recording"
    ).disabled = true;

    document.getElementById(
        "text-speech-status"
    ).textContent = "Processing your speech...";

    textRecognition.stop();
}


// =====================================
// TEXT TRANSLATION API
// =====================================

async function translateText() {

    const inputText = document.getElementById("text-input").value.trim();

    const sourceLanguage = document.getElementById(
        "text-source-language"
    ).value;

    const targetLanguage = document.getElementById(
        "text-target-language"
    ).value;

    const output = document.getElementById("text-output");
    const status = document.getElementById("text-status");

    if (!inputText) {
        status.textContent = "Please enter or speak some text.";
        return;
    }

    if (sourceLanguage === targetLanguage) {
        status.textContent = "Please select two different languages.";
        return;
    }

    status.textContent = "Translating... Please wait.";
    output.value = "";

    try {

        const response = await fetch("/api/translate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: inputText,
                source_language: sourceLanguage,
                target_language: targetLanguage
            })

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Translation failed.");
        }

        output.value = result.translated_text || "";

        status.textContent = "Translation completed successfully!";

    } catch (error) {

        console.error("Translation Error:", error);
        status.textContent = error.message;
    }
}


// =====================================
// SWAP TEXT LANGUAGES
// =====================================

function swapTextLanguages() {

    const source = document.getElementById("text-source-language");
    const target = document.getElementById("text-target-language");

    const temp = source.value;

    source.value = target.value;
    target.value = temp;
}


// =====================================
// CLEAR TEXT TRANSLATION
// =====================================

function clearText() {

    if (textRecordingActive) {
        stopTextRecording();
    }

    document.getElementById("text-input").value = "";
    document.getElementById("text-output").value = "";

    textTranscript = "";

    document.getElementById("text-status").textContent = "";

    document.getElementById("text-speech-status").textContent =
        "Click Start Speaking to enter text using your voice.";
}


// =====================================
// COPY TEXT TRANSLATION
// =====================================

async function copyText() {

    const output = document.getElementById("text-output");
    const status = document.getElementById("text-status");

    if (!output.value.trim()) {
        status.textContent = "There is no translation to copy.";
        return;
    }

    try {

        await navigator.clipboard.writeText(output.value);

        status.textContent = "Translation copied successfully!";

    } catch (error) {

        status.textContent = "Unable to copy the translation.";
    }
}


// =====================================
// SPEECH TRANSLATION - START RECORDING
// =====================================

function startSpeechRecording() {

    if (speechRecordingActive) return;

    const sourceLanguage = document.getElementById(
        "speech-source-language"
    ).value;

    const status = document.getElementById(
        "speech-recording-status"
    );

    try {

        speechTranscript = "";

        document.getElementById("recognized-text").value = "";
        document.getElementById("speech-translated-output").value = "";

        speechRecognition = createRecognition(
            sourceLanguage,

            transcript => {

                speechTranscript +=
                    (speechTranscript ? " " : "") + transcript;

                document.getElementById("recognized-text").value =
                    speechTranscript;

                status.textContent = "Listening...";

            },

            () => {

                speechRecordingActive = false;

                document.getElementById(
                    "speech-start-recording"
                ).disabled = false;

                document.getElementById(
                    "speech-stop-recording"
                ).disabled = true;

                status.textContent = speechTranscript
                    ? "Recording completed. Click Recognize and Translate Speech."
                    : "No speech detected. Please try again.";

                speechRecognition = null;
            },

            status
        );

        speechRecordingActive = true;

        document.getElementById(
            "speech-start-recording"
        ).disabled = true;

        document.getElementById(
            "speech-stop-recording"
        ).disabled = false;

        status.textContent = "Listening... Speak now.";

        speechRecognition.start();

    } catch (error) {

        speechRecordingActive = false;

        status.textContent = error.message;

        document.getElementById(
            "speech-start-recording"
        ).disabled = false;

        document.getElementById(
            "speech-stop-recording"
        ).disabled = true;
    }
}


// =====================================
// SPEECH TRANSLATION - STOP RECORDING
// =====================================

function stopSpeechRecording() {

    if (!speechRecognition || !speechRecordingActive) return;

    document.getElementById(
        "speech-stop-recording"
    ).disabled = true;

    document.getElementById(
        "speech-recording-status"
    ).textContent = "Processing your speech...";

    speechRecognition.stop();
}


// =====================================
// SPEECH TRANSLATION API
// =====================================

async function translateSpeech() {

    const sourceLanguage = document.getElementById(
        "speech-source-language"
    ).value;

    const targetLanguage = document.getElementById(
        "speech-target-language"
    ).value;

    const status = document.getElementById("speech-status");

    const recognizedOutput = document.getElementById("recognized-text");

    const translatedOutput = document.getElementById(
        "speech-translated-output"
    );

    const recognizedText = recognizedOutput.value.trim();

    if (!recognizedText) {
        status.textContent =
            "Please record your speech first and click Stop Recording.";
        return;
    }

    if (sourceLanguage === targetLanguage) {
        status.textContent = "Please select two different languages.";
        return;
    }

    status.textContent = "Translating recognized speech... Please wait.";

    translatedOutput.value = "";

    try {

        const response = await fetch("/api/translate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: recognizedText,
                source_language: sourceLanguage,
                target_language: targetLanguage
            })

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Speech translation failed.");
        }

        translatedOutput.value = result.translated_text || "";

        status.textContent =
            "Speech translation completed successfully!";

    } catch (error) {

        console.error("Speech Translation Error:", error);
        status.textContent = error.message;
    }
}


// =====================================
// SWAP SPEECH LANGUAGES
// =====================================

function swapSpeechLanguages() {

    const source = document.getElementById("speech-source-language");
    const target = document.getElementById("speech-target-language");

    const temp = source.value;

    source.value = target.value;
    target.value = temp;
}


// =====================================
// CLEAR SPEECH TRANSLATION
// =====================================

function clearSpeech() {

    if (speechRecordingActive) {
        stopSpeechRecording();
    }

    document.getElementById("recognized-text").value = "";

    document.getElementById(
        "speech-translated-output"
    ).value = "";

    document.getElementById("speech-status").textContent = "";

    document.getElementById("speech-recording-status").textContent =
        "Click Start Recording to record your voice.";

    speechTranscript = "";
}


// =====================================
// COPY SPEECH TRANSLATION
// =====================================

async function copySpeechTranslation() {

    const output = document.getElementById(
        "speech-translated-output"
    );

    const status = document.getElementById("speech-status");

    if (!output.value.trim()) {
        status.textContent = "There is no translation to copy.";
        return;
    }

    try {

        await navigator.clipboard.writeText(output.value);

        status.textContent = "Translation copied successfully!";

    } catch (error) {

        status.textContent = "Unable to copy the translation.";
    }
}
