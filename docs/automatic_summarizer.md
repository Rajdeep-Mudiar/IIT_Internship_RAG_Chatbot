# Automatic Summarizer Feature

This document explains the technical implementation of the **Automatic Summarizer** (one-click content summary) feature.

---

## 1. Feature Overview

The Automatic Summarizer allows users to select:
1. Any uploaded knowledge base asset (PDF, Word, TXT, Audio transcript, Video soundtrack transcript, Image transcript, Webpage crawl).
2. Complete knowledge base context (all assets concatenated).
3. The **active chat conversation transcript** (the back-and-forth conversation log of the currently active session).

The summarizer processes the selected context using LLMs to simultaneously produce three distinct outputs:
- **Short Summary**: 1-2 sentences summarizing the core message or discussion.
- **Medium Summary**: 1-2 paragraphs highlighting the main questions, answers, and points.
- **Detailed Summary**: Structured bullet points with comprehensive key details.

---

## 2. Technical Architecture & Ingestion

### A. Context Assembly
When a summary is requested:
1. **Asset Summary**:
   - If a specific `asset_id` is targeted, the backend fetches that asset's `text_content` from MongoDB.
   - If "Complete Knowledge Base" is selected, the backend queries all indexed assets in MongoDB and concatenates their content text segments together.
2. **Chat Session Summary**:
   - If the active chat conversation is selected, the backend retrieves all historical messages for the session from the `chat_messages` collection, formatted sequentially as:
     ```
     User: [query]
     Assistant: [response]
     ```
3. All input texts are trimmed to 6,000 characters to prevent context window overflow.

### B. LLM Prompts & JSON Output Routing
The backend formats a prompt asking the active LLM to generate the three summaries and return them *only* inside a JSON object:
```
Produce three distinct summaries of the context:
1. A Short Summary (1-2 sentences)
2. A Medium Summary (1-2 paragraphs)
3. A Detailed Summary (structured bullet points)

You MUST respond ONLY with a JSON object in this format:
{
  "short": "...",
  "medium": "...",
  "detailed": "..."
}
```
The response is cleaned of markdown code fences (like ` ```json `) and parsed using `json.loads()`. If parsing fails, a graceful fallback is provided.

---

## 3. API Contracts

### A. Asset / Knowledge Base Summarization (`POST /summarize`)

#### Request
```json
{
  "model": "auto-select",
  "asset_id": "9b8a7c6d5e..." // or null for all assets
}
```

#### Response
```json
{
  "status": "success",
  "short": "Quantum cryptography utilizes physics laws to construct secure keys...",
  "medium": "In this document, the authors outline the security proofs of QKD channels...",
  "detailed": "- Detail 1: Entangled photons are polarized...\n- Detail 2: Eavesdroppers alter photon spin...\n- Detail 3: BB84 protocol ensures..."
}
```

### B. Chat Session Summarization (`POST /chat/sessions/{session_id}/summarize`)

#### Request
```json
{
  "model": "auto-select"
}
```

#### Response
```json
{
  "status": "success",
  "short": "The user and assistant discussed quantum cryptography and communication protocols...",
  "medium": "The conversation focused on the polarization of photons and how eavesdroppers alter spin. The assistant explained the BB84 protocol to secure communication keys...",
  "detailed": "- User inquired about communication security.\n- Assistant explained quantum key distribution mechanisms.\n- Detailed analysis of eavesdropping interception detection..."
}
```

---

## 4. UI Presentation (`ChatPanel.jsx`)

The summarizer is integrated into the slide-out panel on the right side of the Chat tab:
- **Toggle Button**: Toggled via a "📰 Auto Summary" button in the Chat Header.
- **One-Click Summarize Button**: A "📝 Summarize Session" button is in the Chat Header, which automatically opens the summarizer panel, sets the target source to "Active Chat Conversation", and triggers summary generation instantly.
- **Source Target Dropdown**: A select menu showing all uploaded assets alongside the "💬 Active Chat Conversation" choice.
- **Tabbed Layout**: Users can click between three tabs—**Short**, **Medium**, and **Detailed**—to view the summaries in a scrollable glass container.

