# Audio Input Ingestion Pipeline

This document details the architectural process, specifications, and speech-to-text algorithms used to transcribe audio broadcast files into text context for RAG indexing.

---

## 🏗️ Execution Flow

```
[ Audio File (.wav, .mp3, etc.) ] 
        │
        ▼ (POST /audio-upload)
[ Save to uploads/ ] 
        │
        ▼ (transcribe)
[ Whisper Model Load (base) ] 
        │
        ▼ (model.transcribe)
[ Speech Decoders ] ──(Sliding Audio Frame Processing)──► [ Generate Text ]
                                                               │
                                                               ▼
                                                      [ Save Transcript ]
                                                               │
                                                               ▼
                                                      [ process_text() ]
```

---

## 🛠️ Step-by-Step Process

1. **Upload Request (`POST /audio-upload`):**
   * The user uploads an audio clip (`.mp3`, `.wav`, `.m4a`, etc.).
   * Saved in the folder `uploads/` for processing.

2. **Whisper Transcription (`audio_analysis.py`):**
   * The server loads the **OpenAI Whisper "base" model** in CPU or GPU memory:
     $$M_{\text{whisper}} = \text{load\_model}(\text{"base"})$$
   * The file is decoded, resampled to **16,000 Hz**, and fed into the transformer sequence-to-sequence encoder-decoder pipeline:
     $$T = M_{\text{whisper}}.\text{transcribe}(\text{path})$$
   * Transcribe uses log-Mel spectrogram audio frame representations (each representing 30 seconds of audio) passed into a convolutional neural network encoder:
     $$\mathbf{A} \in \mathbb{R}^{80 \times 3000}$$
   * The decoder generates text sequences based on autoregressive temperature-driven greedy decoding or beam search.

3. **Text Context Ingestion:**
   * Returns transcription text $T$ to the main app router.
   * Calls `process_text(text, source_name)` in `rag.py` to index the transcripts into the ChromaDB vector database.

---

## ⚡ Technical Specifications

* **Library Dependency:** `openai-whisper` (utilizes PyTorch backend).
* **Sample Rate Requirement:** 16kHz mono (handled internally by Whisper decoding wrappers).
* **Transcription Complexity:** 
  * Linear complexity on duration: $O(D)$ where $D$ is the length of the audio file in seconds.
* **Error Boundaries:** 
  * Corrupted audio tracks throw file stream decoding errors.
  * API routes catch errors globally, preventing server reload issues.
