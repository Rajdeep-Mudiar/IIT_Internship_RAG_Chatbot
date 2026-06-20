# Website URL Ingestion & Asset CRUD

This document explains the end-to-end implementation of the **Website URL Ingestion** feature and the corresponding CRUD management endpoints.

---

## 1. Feature Overview

The Web URL Ingestion feature allows users to index webpage content directly into the chatbot's knowledge base. By entering a URL, the system scrapes the target website, cleanses the text, chunks it, generates vector embeddings, and stores it in the database.

Additionally, a comprehensive CRUD manager is available, enabling users to view, edit, or delete uploaded text content directly from the vector search space.

---

## 2. Technical Ingestion Pipeline

### A. Crawling & Cleaning (BeautifulSoup)
When a crawl request is triggered:
1. The backend makes an HTTP request with standard browser Headers (User-Agent spoofing) to request the webpage HTML.
2. It uses `BeautifulSoup` to parse the markup.
3. Elements like `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, and `<aside>` are stripped to remove navigation links, templates, and advertisements.
4. Extracted text is normalized by removing double whitespaces and empty newlines.

### B. ChromaDB Vector Indexing
The clean webpage text is segmented into 500-character blocks, embedded, and added to the ChromaDB proxy index under the webpage title as the `source`.

### C. MongoDB Asset Metadata
The webpage is indexed as an asset inside MongoDB's `uploaded_assets` collection:
- `file_type`: `"url"`
- `file_path`: webpage URL
- `filename`: webpage `<title>`
- `file_size`: bytes size of text content.

---

## 3. CRUD Endpoint Architecture

### A. Get Assets (`GET /assets`)
Fetches all assets from MongoDB, representing PDF/Word files, audio soundtracks, and crawled URLs.

### B. View Asset (`GET /assets/{asset_id}`)
Fetches detailed text content and indexed properties for a specific asset.

### C. Edit Asset (`PUT /assets/{asset_id}`)
Allows admins to edit the filename or modify the parsed text content of any asset:
1. Deletes the old vector IDs from ChromaDB.
2. Regenerates embeddings and indexes the modified text content into ChromaDB with new chunk IDs.
3. Overwrites the metadata and text content inside MongoDB.

### D. Delete Asset (`DELETE /assets/{asset_id}`)
Removes the knowledge asset:
1. Deletes the matching vector chunks from ChromaDB.
2. Deletes the physical file from the backend disk (`uploads/` directory).
3. Deletes the asset document record from MongoDB.

---

## 4. UI Presentation (`UploadPanel.jsx`)

The CRUD actions and URL uploader are presented inside the Ingestion dashboard:
- **Index Tab**: Features a "🌐 Website URL" field. Clicking it triggers `POST /url-upload` and index animations.
- **Indexed Assets Table**: Renders the complete table of knowledge assets including document type badges (`🌐 WEB` for website crawls), file size in KB/MB, upload date, and edit/delete triggers.
- **Interactive Markdown Modal**: Clicking "Edit" opens a modal overlay showing the raw extracted text content or crawl transcription, enabling direct context edits and automatic re-indexing.
