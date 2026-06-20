# Technology Stack Reference

This document outlines the technology stack utilized in the **Multimodal RAG Analytics & Benchmarking System**, explaining why each component was chosen and where it is integrated within the codebase.

---

## 🎨 Frontend Stack

### React (v19)
*   **Why it's used:** Provides a component-based, reactive architecture for building complex state-driven interfaces (such as side-by-side model comparison views, chat consoles, and real-time dashboard analytics) with smooth updates and clean state management.
*   **Where it's used:**
    *   Initialize and bootstrap the application: [main.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/main.jsx) and [App.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/App.jsx).
    *   Page components for layouts: [Home.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/pages/Home.jsx) (chat and benchmarking client) and [Dashboard.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/pages/Dashboard.jsx) (historical runs analytics).
    *   Core modular widgets under [frontend/src/components/](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/).

### Vite (v8)
*   **Why it's used:** Served as the frontend build tool and development server. It offers near-instantaneous Hot Module Replacement (HMR) and highly optimized roll-up builds, facilitating rapid development cycles.
*   **Where it's used:**
    *   Configured in [vite.config.js](file:///f:/internship/IITG/RAG_Chatbot/frontend/vite.config.js) to bundle and build the application.
    *   Scripts defined in [package.json](file:///f:/internship/IITG/RAG_Chatbot/frontend/package.json) (`npm run dev`, `npm run build`).

### Vanilla CSS (Modern CSS Custom Properties & Glassmorphism)
*   **Why it's used:** Tailored design system for styling the UI using modern CSS features (variables, flexbox/grid, glassmorphic backdrops, custom HSL color palettes, and micro-animations) without adding extra framework/Tailwind dependency overhead.
*   **Where it's used:**
    *   Root stylesheet: [index.css](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/index.css) (defines the HSL color variables, fonts, glassmorphism templates, animations, and component styling).

### Chart.js (v4) & react-chartjs-2
*   **Why it's used:** Offers rich, responsive canvas-based visualizations to render model performance benchmarking metrics (speed, word counts, groundedness scores, and cumulative evaluation ratings).
*   **Where it's used:**
    *   Dashboard metric graphs in [frontend/src/components/Charts/](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/) (such as [ScoreChart.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/ScoreChart.jsx), [LatencyChart.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/LatencyChart.jsx), [GroundedChart.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/GroundedChart.jsx), and [LengthChart.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/LengthChart.jsx)).

### Axios & File-Saver
*   **Why it's used:** **Axios** simplifies promise-based HTTP communication to handle multi-part file uploads and request/response payloads, while **File-saver** handles download streams inside the browser.
*   **Where it's used:**
    *   Within panels executing backend requests like [UploadPanel.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/UploadPanel.jsx), [ChatPanel.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/ChatPanel.jsx), and [EmbeddingBenchmark.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/EmbeddingBenchmark.jsx).
    *   For downloading CSV exports in [ExportButton.jsx](file:///f:/internship/IITG/RAG_Chatbot/frontend/src/components/ExportButton.jsx).

---

## ⚙️ Backend Stack

### FastAPI
*   **Why it's used:** A high-speed, modern ASGI framework built on top of Starlette and Pydantic. It provides automatic OpenAPI interactive docs, async concurrency support, and extremely fast JSON serialization, making it ideal for LLM microservices.
*   **Where it's used:**
    *   The entry point and router definition for all client endpoints: [app.py](file:///f:/internship/IITG/RAG_Chatbot/backend/app.py).

### Uvicorn
*   **Why it's used:** An lightning-fast ASGI web server implementation used to run and serve the FastAPI application in development and production settings.
*   **Where it's used:**
    *   Configured as the backend web host (runs on port `8000`).

### Pydantic (v2)
*   **Why it's used:** Provides data validation, structure coercion, and schema parsing for JSON payloads sent from the React client to FastAPI.
*   **Where it's used:**
    *   Models defined in [app.py](file:///f:/internship/IITG/RAG_Chatbot/backend/app.py) (`ChatRequest`, `EmbeddingConfigRequest`, `BenchmarkRequest`, `ImageChatRequest`).

### Pandas
*   **Why it's used:** Essential library to quickly load, parse, normalize, and append benchmark data logs into CSV formats, as well as serve the records for historical visualization.
*   **Where it's used:**
    *   Retrieving dashboard history: `get_analytics()` in [app.py](file:///f:/internship/IITG/RAG_Chatbot/backend/app.py).
    *   Appending metrics: [export.py](file:///f:/internship/IITG/RAG_Chatbot/backend/export.py).
    *   Converting runs into printable tables: [pdf_export.py](file:///f:/internship/IITG/RAG_Chatbot/backend/pdf_export.py).

### Requests & python-dotenv
*   **Why it's used:** **Requests** manages synchronous HTTP communication to public cloud APIs (Gemini, Groq, DeepSeek, OpenRouter) and the local Ollama backend. **python-dotenv** safely loads private API keys into environment variables.
*   **Where it's used:**
    *   Retrieving keys and invoking cloud APIs: [chat.py](file:///f:/internship/IITG/RAG_Chatbot/backend/chat.py).
    *   Connecting to Ollama embed / generation nodes: [embeddings.py](file:///f:/internship/IITG/RAG_Chatbot/backend/embeddings.py) and [image_analysis.py](file:///f:/internship/IITG/RAG_Chatbot/backend/image_analysis.py).

---

## 🗄️ Database & Ingestion Layer

### ChromaDB
*   **Why it's used:** A native AI vector database optimized for storing embedded text chunks and executing fast semantic similarity lookup queries (e.g. Cosine Distance) without setting up heavy cloud-based databases.
*   **Where it's used:**
    *   Initialized with persistent storage under `vector_db/` folder: [rag.py](file:///f:/internship/IITG/RAG_Chatbot/backend/rag.py).
    *   Routines to query context chunks: `retrieve_chunks()` and `process_document()` in [rag.py](file:///f:/internship/IITG/RAG_Chatbot/backend/rag.py).

### PyPDF & Python-docx
*   **Why it's used:** Light, dependency-free Python modules to open and read raw text layers from PDF (`.pdf`) and Microsoft Word (`.docx`) file documents uploaded by the user.
*   **Where it's used:**
    *   Text extraction utilities: [utils.py](file:///f:/internship/IITG/RAG_Chatbot/backend/utils.py).
    *   Document ingestion routing: [rag.py](file:///f:/internship/IITG/RAG_Chatbot/backend/rag.py).

### MoviePy & OpenAI Whisper (Local "base" model)
*   **Why it's used:** **MoviePy** parses and extracts audio tracks from video files (`.mp4`), while **Whisper** performs accurate automatic speech recognition (ASR) to convert audio files into indexed text.
*   **Where it's used:**
    *   Extracting video audio streams: [video_analysis.py](file:///f:/internship/IITG/RAG_Chatbot/backend/video_analysis.py).
    *   Local transcribing: [audio_analysis.py](file:///f:/internship/IITG/RAG_Chatbot/backend/audio_analysis.py).
    *   FastAPI endpoints: `audio_upload` and `video_upload` in [app.py](file:///f:/internship/IITG/RAG_Chatbot/backend/app.py).

### ReportLab
*   **Why it's used:** A robust PDF generation engine used to compile programmatic tabular PDF sheets summarizing benchmark metrics on demand.
*   **Where it's used:**
    *   Generating historical analytics PDF reports: [pdf_export.py](file:///f:/internship/IITG/RAG_Chatbot/backend/pdf_export.py).

---

## 🤖 LLM & Inference Engine

### Ollama (Local Server)
*   **Why it's used:** A containerized local runtime that compiles and optimizes model execution, allowing free offline embedding generation (`nomic-embed-text`), text generation (`qwen3`, `phi`, `gemma`, `llama3.2`), and visual/multimodal analysis (`minicpm-v`).
*   **Where it's used:**
    *   Creating vector embeddings: [embeddings.py](file:///f:/internship/IITG/RAG_Chatbot/backend/embeddings.py).
    *   Vision and multimodal ingestion: [image_analysis.py](file:///f:/internship/IITG/RAG_Chatbot/backend/image_analysis.py).
    *   Local chat response generation: [chat.py](file:///f:/internship/IITG/RAG_Chatbot/backend/chat.py).

### Sentence-Transformers (Hugging Face)
*   **Why it's used:** Python library for state-of-the-art sentence, text, and image embeddings, used as a direct alternative for local text embedding generations using Hugging Face models.
*   **Where it's used:**
    *   Loading sentence models locally: [embeddings.py](file:///f:/internship/IITG/RAG_Chatbot/backend/embeddings.py).

### Cloud APIs (Gemini, Groq, DeepSeek, OpenRouter)
*   **Why it's used:** Configured as benchmark options to compare local model generations side-by-side with high-capability cloud systems.
*   **Where it's used:**
    *   Cloud API response pipelines: [chat.py](file:///f:/internship/IITG/RAG_Chatbot/backend/chat.py).
