# PDF Input Ingestion Pipeline

This document details the architectural process, specifications, and specifications for text extraction from PDF files in the RAG system.

---

## 🏗️ Execution Flow

```
[ PDF File Upload ] 
        │
        ▼ (POST /upload)
[ Save to uploads/ ] 
        │
        ▼ (read_pdf)
[ pypdf.PdfReader ] ──(Iterative Page Loop)──► [ Extract text() ]
                                                    │
                                                    ▼
                                            [ Sanitize spacing ]
                                                    │
                                                    ▼
                                            [ Return String ]
```

---

## 🛠️ Step-by-Step Process

1. **Upload Request (`POST /upload`):**
   * The client initiates a multipart form upload containing the `.pdf` file.
   * The backend saves the stream to the local file system path: `uploads/{filename}`.
   
2. **Text Extraction (`read_pdf` in `utils.py`):**
   * Initializes `pypdf.PdfReader` with the uploaded file path.
   * Reads metadata and identifies the total page count $N$.
   * Iterates through pages from index $0$ to $N-1$:
     $$T_i = \text{page}_i.\text{extract\_text}() \quad \text{for } i \in [0, N-1]$$
   * Concatenates individual page strings with newline anchors:
     $$T_{\text{raw}} = \sum_{i=0}^{N-1} T_i$$

3. **Text Sanitization:**
   * Removes double spaces, excessive blank lines, and normalizes hyphens.
   * Returns a contiguous UTF-8 encoded text string ready for token chunking.

---

## ⚡ Technical Specifications

* **Library Dependency:** `pypdf` (pure-python PDF library).
* **Extraction Complexity:** 
  * Time Complexity: $O(N \cdot L)$ where $N$ is page count and $L$ is average character count per page.
  * Space Complexity: $O(C_{\text{total}})$ where $C_{\text{total}}$ is the total character size loaded in memory.
* **Error Boundaries:** 
  * If a file is password-protected or scan-only (non-OCR), `extract_text()` returns empty characters.
  * Caught via general `try-except` blocks returning empty fallback strings to prevent FastAPI worker crashes.
