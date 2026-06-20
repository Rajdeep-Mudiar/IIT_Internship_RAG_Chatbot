# Image Input Ingestion Pipeline

This document details the architectural process, specifications, and prompt heuristics used to analyze uploaded broadcast images and index their text and visual layouts into the RAG vector database.

---

## 🏗️ Execution Flow

```
[ Image File (.png, .jpg, etc.) ] 
        │
        ▼ (POST /image-upload)
[ Save to uploads/ ] 
        │
        ▼ (base64 encode)
[ Base64 Image String ] 
        │
        ▼ (minicpm-v)
[ Text OCR + Layout Description ]
        │
        ▼ (process_text)
[ ChromaDB Vector Space ]
```

---

## 🛠️ Step-by-Step Process

1. **Upload Request (`POST /image-upload`):**
   * The client initiates an upload of an image file (`.png`, `.jpg`, `.jpeg`).
   * Saved in `uploads/`.

2. **Base64 String Encoding (`image_analysis.py`):**
   * The file stream is read and converted to base64 characters:
     $$\text{Base64 String} = \text{encode\_base64}(S_{\text{file}})$$

3. **Multimodal Analysis:**
   * The backend sends a request to local Ollama API running the multimodal **`minicpm-v`** model.
   * Prompts the model to perform OCR and transcribe the structural visual context:
     $$\text{Context Text} = \text{minicpm-v}(\text{Base64 String}, \text{Prompt})$$

4. **Vector Storage:**
   * Indexes the returned context using `process_text(text)`.

---

## ⚡ Technical Specifications

* **Multimodal Model:** Local `minicpm-v` (run on Ollama).
* **Extraction Complexity:** $O(I)$ where $I$ is image resolution/size.
* **Error Boundaries:** 
  * Large image files are checked for resolution thresholds.
  * API catches connection drops or model timeout exceptions safely.
