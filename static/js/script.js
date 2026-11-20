
let textRecorder = null;
let speechRecorder = null;

let textAudioChunks = [];
let speechAudioChunks = [];

let recordedSpeechAudio = null;

// Live transcription variables
let textRecordingActive = false;
let textStream = null;
let textTranscript = "";


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
// AUDIO EXTENSION
// =====================================

function getAudioExtension(mimeType = "") {

    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("wav")) return "wav";

    return "webm";
}


// =====================================
// SEND AUDIO TO BACKEND
// =====================================

async function sendAudioToBackend(audioBlob, endpoint, sourceLanguage) {

    const formData = new FormData();

    const extension = getAudioExtension(audioBlob.type);

    const audioFile = new File(
        [audioBlob],
        `recording.${extension}`,
        {
            type: audioBlob.type || "audio/webm"
        }
    );

    formData.append("audio", audioFile);
    formData.append("source_language", sourceLanguage);

    const response = await fetch(endpoint, {
        method: "POST",
        body: formData
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Audio processing failed.");
    }

    return result;
}


// =====================================
// TEXT TRANSLATION - LIVE SPEECH INPUT
// =====================================

async function startTextRecording() {

    if (!navigator.mediaDevices || !window.MediaRecorder) {

        document.getElementById("text-speech-status").textContent =
            "Your browser does not support audio recording.";

        return;
    }

    if (textRecordingActive) return;

    try {

        textStream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        textTranscript = "";
        textRecordingActive = true;

        document.getElementById("text-input").value = "";

        document.getElementById("text-start-recording").disabled = true;
        document.getElementById("text-stop-recording").disabled = false;

        document.getElementById("text-speech-status").textContent =
            "Listening... Speak now.";

        recordNextTextChunk();

    } catch (error) {

        console.error("Microphone Error:", error);

        textRecordingActive = false;

        if (textStream) {
            textStream.getTracks().forEach(track => track.stop());
            textStream = null;
        }

        document.getElementById("text-speech-status").textContent =
            "Microphone access denied or unavailable.";

        document.getElementById("text-start-recording").disabled = false;
        document.getElementById("text-stop-recording").disabled = true;
    }
}


// =====================================
// RECORD AND PROCESS LIVE AUDIO CHUNKS
// =====================================

function recordNextTextChunk() {

    if (!textRecordingActive || !textStream) return;

    textAudioChunks = [];

    const currentRecorder = new MediaRecorder(textStream);

    textRecorder = currentRecorder;

    currentRecorder.ondataavailable = event => {

        if (event.data.size > 0) {
            textAudioChunks.push(event.data);
        }

    };

    currentRecorder.onstop = async () => {

        const audioBlob = new Blob(textAudioChunks, {
            type: currentRecorder.mimeType
        });

        try {

            if (audioBlob.size > 0) {

                document.getElementById("text-speech-status").textContent =
                    "Whisper is recognizing your speech...";

                // Automatically detect the spoken language
                const sourceLanguage = "Auto";

                const result = await sendAudioToBackend(
                    audioBlob,
                    "/api/speech-to-text",
                    sourceLanguage
                );

                // Automatically update the source-language dropdown
                if (result.detected_language) {

                    const sourceDropdown = document.getElementById(
                        "text-source-language"
                    );

                    const detectedLanguage = result.detected_language;

                    const languageExists = Array.from(
                        sourceDropdown.options
                    ).some(option => option.value === detectedLanguage);

                    if (languageExists) {
                        sourceDropdown.value = detectedLanguage;
                    } else {
                        console.warn(
                            "Detected language is not available in the dropdown:",
                            detectedLanguage
                        );
                    }

                }

                // Add recognized speech to the text input
                if (result.recognized_text) {

                    const newText = result.recognized_text.trim();

                    if (newText) {

                        textTranscript +=
                            (textTranscript ? " " : "") + newText;

                        document.getElementById("text-input").value =
                            textTranscript;

                    }

                }

                document.getElementById("text-speech-status").textContent =
                    "Listening... Speak now.";

            }

        } catch (error) {

            console.error("Live Transcription Error:", error);

            document.getElementById("text-speech-status").textContent =
                error.message;

        } finally {

            // Continue recording after processing the previous chunk
            if (textRecordingActive) {

                recordNextTextChunk();

            } else {

                finishTextRecording();

            }

        }

    };

    currentRecorder.start();

    // Capture approximately 3 seconds of audio
    setTimeout(() => {

        if (
            textRecordingActive &&
            currentRecorder.state === "recording"
        ) {

            currentRecorder.stop();

        }

    }, 3000);

}


// =====================================
// FINISH TEXT RECORDING
// =====================================

function finishTextRecording() {

    if (textStream) {

        textStream.getTracks().forEach(track => track.stop());

        textStream = null;

    }

    textRecorder = null;

    document.getElementById("text-start-recording").disabled = false;
    document.getElementById("text-stop-recording").disabled = true;

    document.getElementById("text-speech-status").textContent =
        textTranscript
            ? "Speech converted successfully! You can now click Translate."
            : "No speech detected. Please try again.";

}


// =====================================
// STOP TEXT RECORDING
// =====================================

function stopTextRecording() {

    if (!textRecordingActive) return;

    textRecordingActive = false;

    document.getElementById("text-stop-recording").disabled = true;

    document.getElementById("text-speech-status").textContent =
        "Stopping recording and processing final audio...";

    if (textRecorder && textRecorder.state === "recording") {

        textRecorder.stop();

    } else if (!textRecorder && textStream) {

        finishTextRecording();

    }

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

    if (!output.value.trim()) {

        document.getElementById("text-status").textContent =
            "There is no translation to copy.";

        return;
    }

    try {

        await navigator.clipboard.writeText(output.value);

        document.getElementById("text-status").textContent =
            "Translation copied successfully!";

    } catch (error) {

        document.getElementById("text-status").textContent =
            "Unable to copy the translation.";

    }

}


// =====================================
// SPEECH TRANSLATION - START RECORDING
// =====================================

async function startSpeechRecording() {

    if (!navigator.mediaDevices || !window.MediaRecorder) {

        document.getElementById("speech-recording-status").textContent =
            "Your browser does not support audio recording.";

        return;
    }

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        speechAudioChunks = [];
        recordedSpeechAudio = null;

        speechRecorder = new MediaRecorder(stream);

        speechRecorder.ondataavailable = event => {

            if (event.data.size > 0) {
                speechAudioChunks.push(event.data);
            }

        };

        speechRecorder.onstop = () => {

            recordedSpeechAudio = new Blob(speechAudioChunks, {
                type: speechRecorder.mimeType
            });

            stream.getTracks().forEach(track => track.stop());

            document.getElementById("speech-recording-status").textContent =
                "Recording completed. Click Recognize and Translate Speech.";

        };

        speechRecorder.start();

        document.getElementById("speech-start-recording").disabled = true;
        document.getElementById("speech-stop-recording").disabled = false;

        document.getElementById("speech-recording-status").textContent =
            "Recording... Speak now.";

    } catch (error) {

        console.error("Speech Recording Error:", error);

        document.getElementById("speech-recording-status").textContent =
            "Microphone access denied or unavailable.";

    }

}


// =====================================
// SPEECH TRANSLATION - STOP RECORDING
// =====================================

function stopSpeechRecording() {

    if (speechRecorder && speechRecorder.state !== "inactive") {

        speechRecorder.stop();

        document.getElementById("speech-start-recording").disabled = false;
        document.getElementById("speech-stop-recording").disabled = true;

    }

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

    const audioFile = document.getElementById(
        "speech-audio-file"
    ).files[0];

    const status = document.getElementById("speech-status");

    const recognizedOutput = document.getElementById("recognized-text");

    const translatedOutput = document.getElementById(
        "speech-translated-output"
    );

    if (!audioFile && !recordedSpeechAudio) {

        status.textContent = "Please record or upload an audio file.";

        return;
    }

    if (sourceLanguage === targetLanguage) {

        status.textContent = "Please select two different languages.";

        return;
    }

    status.textContent = "Recognizing speech and translating... Please wait.";

    recognizedOutput.value = "";
    translatedOutput.value = "";

    try {

        const formData = new FormData();

        if (audioFile) {

            formData.append("audio", audioFile);

        } else {

            const extension = getAudioExtension(recordedSpeechAudio.type);

            const recordedFile = new File(
                [recordedSpeechAudio],
                `recording.${extension}`,
                {
                    type: recordedSpeechAudio.type || "audio/webm"
                }
            );

            formData.append("audio", recordedFile);

        }

        formData.append("source_language", sourceLanguage);
        formData.append("target_language", targetLanguage);

        const response = await fetch("/api/speech-translate", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Speech translation failed.");
        }

        recognizedOutput.value = result.recognized_text || "";
        translatedOutput.value = result.translated_text || "";

        status.textContent = "Speech translation completed successfully!";

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

    document.getElementById("speech-audio-file").value = "";

    document.getElementById("recognized-text").value = "";

    document.getElementById("speech-translated-output").value = "";

    document.getElementById("speech-status").textContent = "";

    document.getElementById("speech-recording-status").textContent =
        "Click Start Recording to record your voice.";

    recordedSpeechAudio = null;

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
