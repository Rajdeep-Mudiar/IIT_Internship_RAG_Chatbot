# Query History & Chat Sessions

This document outlines the **Query History** logging system.

---

## 1. Feature Overview

The Query History feature tracks and displays previous conversational interactions in a chronological sidebar log. Every chat session is saved with a timestamp and a descriptive title (inferred automatically from the user's first query). Users can revisit, continue, or delete old sessions.

---

## 2. Technical Architecture & Databases

### A. Chat Sessions Schema
Every conversation has a unique `session_id` mapping to a session document in MongoDB's `chat_sessions` collection:
```javascript
{
  "session_id": "7f8b9c2a3d4e...",
  "title": "What is Quantum Cryptography?",
  "created_at": ISODate("2026-06-20T12:00:00Z"),
  "updated_at": ISODate("2026-06-20T12:15:30Z")
}
```

### B. Chat Messages Schema
Individual user queries and assistant responses within a session are saved inside the `chat_messages` collection:
```javascript
{
  "message_id": "a1b2c3d4...",
  "session_id": "7f8b9c2a3d4e...",
  "sender": "user", // or "assistant"
  "text": "What is Quantum Cryptography?",
  "image": null, # base64 preview if image attachment
  "model": null, # LLM name for assistant messages
  "embedModel": null,
  "score": 0,
  "latency": 0,
  "sources": [],
  "timestamp": ISODate("2026-06-20T12:00:00Z")
}
```

---

## 3. API Contract

### A. Get Sessions (`GET /chat/sessions`)
Fetches all chat sessions sorted by their most recent activity (`updated_at` descending):
```json
{
  "sessions": [
    {
      "session_id": "7f8b9c2a3d4e...",
      "title": "What is Quantum Cryptography?",
      "created_at": "2026-06-20T12:00:00.123456",
      "updated_at": "2026-06-20T12:15:30.654321"
    }
  ]
}
```

### B. Create Session (`POST /chat/sessions`)
Initializes a new session:
```json
{
  "status": "success",
  "session_id": "7f8b9c2a3d4e..."
}
```

### C. Get Session Messages (`GET /chat/sessions/{session_id}/messages`)
Returns all historical message entries for a selected session:
```json
{
  "messages": [
    {
      "sender": "user",
      "text": "What is Quantum Cryptography?",
      "timestamp": "2026-06-20T12:00:00.123456"
    },
    {
      "sender": "assistant",
      "text": "Quantum cryptography utilizes principles of...",
      "model": "qwen3:latest",
      "timestamp": "2026-06-20T12:00:01.456789"
    }
  ]
}
```

### D. Delete Session (`DELETE /chat/sessions/{session_id}`)
Deletes a chat session along with all its conversation history from both databases.

### E. Update Session Title (`PUT /chat/sessions/{session_id}`)
Renames an existing chat session title:
**Request Body**:
```json
{
  "title": "My Updated Chat Title"
}
```
**Response**:
```json
{
  "status": "success",
  "message": "Session title updated"
}
```

---

## 4. UI Presentation (`ChatPanel.jsx`)

The sessions list is rendered inside the Left Sidebar in the Chat Terminal tab:
- **Automatic Titles**: When a conversation is started, its title defaults to "New Chat". Upon receiving the first user message, the title is automatically overwritten with the first 30 characters of the user's query.
- **Clock Timestamps**: Rendered alongside each session item (e.g. `⏰ 10:14`) showing the exact hour and minute the conversation was last updated.
- **Session Actions**: 
  - **Rename Chat (`✏️`)**: Toggles inline edit mode, replacing the title button with an auto-focused text field. Pressing `Enter` or blurring the input saves the new name to MongoDB; pressing `Escape` cancels edits.
  - **Delete Chat (`✕`)**: Removes the session and its history.
- **Active States**: Highlighting of the currently viewed session item with an active indicator border.
