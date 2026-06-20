# MongoDB Asset Management & CRUD Operations

This document explains the technical details of the **Asset Management** system, which allows users to view, edit, re-index, and delete uploaded context assets (PDFs, Word documents, TXT files, Audio transcripts, Video transcripts, analyzed Image transcripts, and crawled Webpage URLs).

---

## 1. Feature Overview

To ensure the knowledge base remains accurate, dynamic, and easy to manage, the Multimodal RAG Chatbot includes a full CRUD (Create, Read, Update, Delete) asset manager:
- **Create**: Documents and media files are transcribed, indexed, and stored as assets. Web URLs are crawled and parsed.
- **Read**: Users can view the complete list of indexed assets along with metadata (filename, file type, file size, upload time, and context text content).
- **Update**: Users can edit the text transcript/content of any asset and automatically trigger vector re-indexing in ChromaDB.
- **Delete**: Users can remove assets, which automatically deletes their vectors from ChromaDB, removes the physical file from the disk, and deletes the MongoDB asset metadata record.

---

## 2. Database Schema (MongoDB `uploaded_assets`)

Every asset is saved as a document inside the `uploaded_assets` collection:
```javascript
{
  "asset_id": "9b8a7c6d5e...", 
  "filename": "quantum_physics.pdf",
  "file_type": "document", // "document" | "audio" | "video" | "image" | "url"
  "file_path": "uploads/quantum_physics.pdf",
  "file_size": 1809919, // size in bytes
  "text_content": "Quantum cryptography utilizes...", // raw text segment
  "chroma_ids": ["0_uuid1_quantum_physics.pdf", "1_uuid2_quantum_physics.pdf", ...],
  "upload_time": ISODate("2026-06-20T12:00:00Z")
}
```

---

## 3. CRUD Endpoint Architecture (FastAPI)

### A. List Assets (`GET /assets`)
Fetches all assets from MongoDB, sorted by their upload time descending:
```python
@app.get("/assets")
def list_assets():
    return {"assets": get_assets()}
```

### B. View Asset Details (`GET /assets/{asset_id}`)
Retrieves properties for a selected asset:
```python
@app.get("/assets/{asset_id}")
def view_asset(asset_id: str):
    asset = get_asset(asset_id)
    if asset:
        return {"status": "success", "asset": asset}
    return {"status": "error", "message": "Asset not found"}
```

### C. Update & Re-index Asset (`PUT /assets/{asset_id}`)
Enables direct edits to the asset text. It deletes old ChromaDB vectors, runs new text segmentation, creates new embeddings, adds new vectors to ChromaDB, and updates the MongoDB document:
```python
@app.put("/assets/{asset_id}")
def modify_asset(asset_id: str, data: AssetUpdateRequest):
    # 1. Delete old chunks from ChromaDB using old chroma_ids
    # 2. Segment and re-index new text_content into ChromaDB
    # 3. Save updated fields in MongoDB (filename, text_content, chroma_ids)
```

### D. Delete Asset (`DELETE /assets/{asset_id}`)
Completely cleanses the asset:
1. Deletes vector chunks from ChromaDB.
2. Removes the physical file from the disk (`uploads/` directory).
3. Deletes the MongoDB asset document record.
```python
@app.delete("/assets/{asset_id}")
def remove_asset(asset_id: str):
    # Deletes vectors, physical file, and MongoDB asset record
```

---

## 4. UI Presentation (`UploadPanel.jsx`)

The Asset Manager is integrated into the Ingestion tab:
- **Knowledge Assets Table**: Renders the complete table of knowledge assets including document type badges, formatted file sizes (KB/MB), upload dates, and edit/delete triggers.
- **View & Edit Asset Modal**: Clicking "Edit" opens a modal overlay showing the raw extracted text content or crawl transcription, enabling direct context edits and automatic re-indexing.
- **Interactive Prompts**: Confirms before deleting and displays real-time re-indexing status during edits.
