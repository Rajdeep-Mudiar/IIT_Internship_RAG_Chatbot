# Source Citations Feature

This document explains the end-to-end implementation of the **Source Citations** feature in the Multimodal RAG Chatbot system.

---

## 1. Feature Overview

The Source Citations feature allows the chatbot to display the origin of the information it uses to answer user questions. Rather than giving opaque answers, the assistant maps retrieved chunks back to their specific document source (PDF, DOCX, TXT), audio broadcast, video soundtrack, webpage URL, or image file. 

For multi-page text documents (PDFs), it also retrieves the exact **page number** and **chunk index** where the context was extracted.

---

## 2. Technical Architecture & Ingestion

### A. Document Segmentation (PDFs)
When a PDF document is uploaded, it is parsed page-by-page. Content inside each page is chunked into 500-character segments. During indexing, we assign each chunk a dictionary containing its exact coordinates:
```python
metadatas=[{
    "source": os.path.basename(path),
    "page": page_idx + 1,
    "chunk": chunk_idx + 1
}]
```
This metadata is saved in **ChromaDB** alongside the vector embedding.

### B. Media & Webpage Segmentation
For other uploaded media types (Audio transcripts, Video soundtracks, Images transcripts, crawled URL web pages), the page defaults to `1`, but the chunk index and filename are indexed:
```python
metadatas=[{
    "source": source_name, # e.g. "podcast.mp3" or "Google Homepage"
    "page": 1,
    "chunk": chunk_idx + 1
}]
```

### C. Retrieval and Querying
When querying ChromaDB using `collection.query()`, we fetch both the document contents and the metadata logs:
```python
def retrieve_chunks(question):
    embedding = create_embedding(question)
    result = collection.query(
        query_embeddings=[embedding],
        n_results=3
    )
    return result["documents"][0], result["metadatas"][0]
```

---

## 3. API Contract (`POST /chat`)

The `/chat` endpoint extracts the returned metadata from `retrieve_chunks()` and packages it into structured JSON citations containing the text snippet, source file, page index, and chunk count:
```json
{
  "answer": "India launched a new satellite...",
  "retrieved_chunks": [
    {
      "text": "India launched its new communication satellite from...",
      "source": "broadcast_news.pdf",
      "page": 5,
      "chunk": 12
    }
  ],
  "selected_model": "qwen3:latest",
  "selected_embed_model": "nomic-embed-text",
  "score": 94.0,
  "latency": 1.3,
  "session_id": "7f8b9c2a..."
}
```

---

## 4. Database Persistence (MongoDB)

Citations are persisted inside the `chat_messages` collection under the `sources` field. This ensures that when the user closes the page and re-opens their chat session history, the citations are preserved:
```javascript
// MongoDB Document structure in chat_messages
{
  "message_id": "9a8b7c6d...",
  "session_id": "7f8b9c2a...",
  "sender": "assistant",
  "text": "India launched a new satellite...",
  "sources": [
    {
      "text": "India launched its new communication satellite from...",
      "source": "broadcast_news.pdf",
      "page": 5,
      "chunk": 12
    }
  ],
  "timestamp": ISODate("2026-06-20T12:00:00Z")
}
```

---

## 5. Frontend Presentation (`ChatPanel.jsx`)

In the React UI, the retrieved context is rendered under each assistant message bubble inside a collapsible `<details>` wrapper (`🔍 Retrieved Context Citations`). 

### File-Type Detection & Icons
A utility function `getSourceTypeIconAndLabel()` dynamically inspects the file extension or formatting of the citation source to apply appropriate badges:
- **PDFs**: 📄 PDF Document (displays Page and Chunk badges)
- **Word/TXT**: 📄 Document
- **Audio files (`.mp3`, `.wav`)**: 🎵 Audio Broadcast
- **Video files (`.mp4`, `.avi`)**: 🎥 Video Broadcast
- **Images (`.png`, `.jpg`)**: 🖼️ Image Content
- **URLs**: 🌐 Website
