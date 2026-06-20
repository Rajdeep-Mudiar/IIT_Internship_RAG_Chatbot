# Video Input Ingestion Pipeline

This document details the architectural process, specifications, and audio extraction algorithms used to extract audio tracks from video files and feed them to the RAG processing pipeline.

---

## 🏗️ Execution Flow

```
[ Video File (.mp4, .avi, etc.) ] 
        │
        ▼ (POST /video-upload)
[ Save to uploads/ ] 
        │
        ▼ (extract_audio)
[ MoviePy VideoFileClip ] ──(Write Audio Stream)──► [ temp.wav (PCM 16Bit) ]
                                                           │
                                                           ▼ (transcribe)
                                                    [ Whisper Decoder ]
                                                           │
                                                           ▼ (Text output)
                                                    [ process_text() ]
```

---

## 🛠️ Step-by-Step Process

1. **Upload Request (`POST /video-upload`):**
   * The user uploads video broadcast files (`.mp4`, `.avi`, `.webm`, etc.).
   * Saved to local disk inside `uploads/`.

2. **Audio Track Extraction (`video_analysis.py`):**
   * Opens the file path using MoviePy's `VideoFileClip` reader:
     $$C_{\text{clip}} = \text{VideoFileClip}(\text{video\_path})$$
   * Isolates the audio soundtrack stream:
     $$S_{\text{audio}} = C_{\text{clip}}.\text{audio}$$
   * Compiles and writes the extracted audio frames into a temporary WAV stream encoded in linear PCM 16-bit at 16kHz sample rate:
     $$S_{\text{audio}}.\text{write\_audiofile}(\text{"uploads/temp.wav"})$$

3. **Transcription & Indexing:**
   * Reads `"uploads/temp.wav"` and feeds it to the OpenAI Whisper model.
   * Feeds transcript string to `process_text` for index tokenization.

---

## ⚡ Technical Specifications

* **Library Dependency:** `moviepy` (which maps back to `ffmpeg` subprocess operations).
* **Extraction Complexity:** 
  * Audio extraction runs in $O(V)$ time where $V$ is video stream file size.
* **Error Boundaries:** 
  * If the video file does not contain an audio track (e.g., mute video), MoviePy throws `AttributeError`. The route handles this to prevent API downtime.
