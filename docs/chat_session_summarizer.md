# Chat Session Summarizer

This document explains the technical implementation of the **Chat Session Summarizer** (one-click conversation summary) feature.

---

## 1. Feature Overview

The Chat Session Summarizer allows users to summarize the entire conversation transcript of their current chat session with a single click. It extracts the historical back-and-forth between the User and the AI Assistant, cleans the dialog format, and leverages the active LLM to generate three structured summaries:
- **Short Summary**: A 1-2 sentence overview of the conversation topic.
- **Medium Summary**: A 1-2 paragraph description highlighting the main questions asked and the answers provided.
- **Detailed Summary**: Structured bullet points summarizing all key details discussed.

---

## 2. Technical Architecture & Data Processing

### A. Transcript Compilation
When a session summary is requested, the backend retrieves all chat messages associated with the `session_id` from MongoDB's `chat_messages` collection, sorted by their timestamps. It compiles these messages into a raw text dialog transcript:
```
User: [User Message 1]
Assistant: [Assistant Response 1]
User: [User Message 2]
Assistant: [Assistant Response 2]
...
```
To protect the LLM context window, the transcript is truncated to a maximum of 6,000 characters before being appended to the LLM prompt.

### B. Prompt & Serialization Safety
The prompt instructs the LLM to format the response as a JSON string with specific keys (`short`, `medium`, `detailed`). 

Since LLMs may occasionally return parsed JSON structures (e.g., lists of objects for transcripts), the backend includes an `ensure_string_summary` safety wrapper. This utility automatically sanitizes the fields:
- If a summary field is a list, it formats the items as clean bullet points.
- If it is a dictionary, it formats the properties as structured key-value lines.
- This prevents React from throwing rendering errors.

---

## 3. API Endpoint Contract (`POST /chat/sessions/{session_id}/summarize`)

### Request
- **URL**: `http://127.0.0.1:8000/chat/sessions/{session_id}/summarize`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "model": "auto-select" // or model tag name
  }
  ```

### Response
```json
{
  "status": "success",
  "short": "The user and assistant discussed quantum cryptography and communication protocols...",
  "medium": "The conversation focused on the polarization of photons and how eavesdroppers alter spin. The assistant explained the BB84 protocol to secure communication keys...",
  "detailed": "- User inquired about communication security.\n- Assistant explained quantum key distribution mechanisms.\n- Detailed analysis of eavesdropping interception detection...",
  "model": "qwen3:latest"
}
```

---

## 4. UI Presentation (`ChatPanel.jsx`)

The feature is accessible via two hooks in the Chat tab:
- **Direct One-Click Button**: A "📝 Summarize Session" button sits inside the Chat Header. Clicking it auto-opens the summarizer side-panel, sets the target target to the current session, and fires the summarization API immediately.
- **Dropdown Target**: Users can also select "💬 Active Chat Conversation" manually from the dropdown menu in the Summarizer sidebar and click "⚡ Generate Summary".
- **Tabbed View**: The resulting Short, Medium, and Detailed summaries are rendered inside scrollable tabs in the right slide-out panel.
