from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
import pandas as pd
import requests
import time
from pydantic import BaseModel
from dotenv import load_dotenv

# Load keys
load_dotenv()

from rag import retrieve_chunks, collection, process_text
from chat import ask_model
from rag import process_document
from export import save_csv
from pdf_export import create_pdf
from compare_models import compare_models
from ranking import rank_models
from embeddings import get_active_model
from benchmark_embeddings import benchmark_models
from database import (
    get_evaluation_records,
    sync_csv_to_mongodb,
    get_chat_sessions,
    create_chat_session,
    save_chat_message,
    get_chat_messages,
    delete_chat_session,
    save_asset,
    get_assets,
    get_asset,
    update_asset,
    delete_asset_record
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    sync_csv_to_mongodb()

os.makedirs("uploads", exist_ok=True)

class ChatRequest(BaseModel):
    question: str
    model: str = "auto-select"
    session_id: str = None

class EmbeddingConfigRequest(BaseModel):
    embedding_model: str

class BenchmarkRequest(BaseModel):
    query: str

class ImageChatRequest(BaseModel):
    question: str
    image: str
    session_id: str = None

class AssetUpdateRequest(BaseModel):
    filename: str
    text_content: str

class URLUploadRequest(BaseModel):
    url: str


@app.get("/")
def home():
    return {"status": "success", "message": "Backend Running"}

@app.get("/chat/sessions")
def list_sessions():
    return {"sessions": get_chat_sessions()}

@app.post("/chat/sessions")
def create_session(data: dict = None):
    title = data.get("title") if data else None
    session_id = create_chat_session(title)
    return {"status": "success", "session_id": session_id}

@app.get("/chat/sessions/{session_id}/messages")
def get_session_messages(session_id: str):
    return {"messages": get_chat_messages(session_id)}

@app.delete("/chat/sessions/{session_id}")
def remove_session(session_id: str):
    success = delete_chat_session(session_id)
    if success:
        return {"status": "success", "message": "Session deleted"}
    return {"status": "error", "message": "Failed to delete session"}

@app.get("/assets")
def list_assets():
    return {"assets": get_assets()}

@app.get("/assets/{asset_id}")
def view_asset(asset_id: str):
    asset = get_asset(asset_id)
    if asset:
        return {"status": "success", "asset": asset}
    return {"status": "error", "message": "Asset not found"}

@app.put("/assets/{asset_id}")
def modify_asset(asset_id: str, data: AssetUpdateRequest):
    asset = get_asset(asset_id)
    if not asset:
        return {"status": "error", "message": "Asset not found"}
    
    # 1. Delete old chunks from ChromaDB
    old_ids = asset.get("chroma_ids", [])
    if old_ids:
        try:
            collection.delete(ids=old_ids)
        except Exception as e:
            print(f"ChromaDB deletion failed during asset update: {e}")
            
    # 2. Re-index new text_content in ChromaDB
    new_text = data.text_content
    chunks = []
    size = 500
    for i in range(0, len(new_text), size):
        chunks.append(new_text[i:i+size])
        
    import uuid
    from embeddings import create_embedding
    new_ids = []
    for i, c in enumerate(chunks):
        try:
            emb = create_embedding(c)
            chunk_id = f"{i}_{uuid.uuid4().hex[:8]}_{data.filename}"
            collection.add(
                ids=[chunk_id],
                embeddings=[emb],
                documents=[c]
            )
            new_ids.append(chunk_id)
        except Exception as e:
            print(f"Failed to index chunk during asset update: {e}")
            
    # 3. Save updated fields in MongoDB
    success = update_asset(asset_id, data.filename, new_text, new_ids)
    if success:
        return {"status": "success", "message": "Asset updated successfully"}
    return {"status": "error", "message": "Failed to update asset metadata"}

@app.delete("/assets/{asset_id}")
def remove_asset(asset_id: str):
    result = delete_asset_record(asset_id)
    if not result:
        return {"status": "error", "message": "Asset not found in database"}
    
    # 1. Delete from ChromaDB
    chroma_ids = result.get("chroma_ids", [])
    if chroma_ids:
        try:
            collection.delete(ids=chroma_ids)
        except Exception as e:
            print(f"Failed to delete chroma IDs for asset {asset_id}: {e}")
            
    # 2. Delete physical file
    file_path = result.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete physical file {file_path}: {e}")
            
    return {"status": "success", "message": "Asset deleted successfully"}

@app.get("/models")
def get_models():
    models = ["auto-select"]
    
    # 1. Fetch local Ollama models
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            data = response.json()
            models.extend([m["name"] for m in data.get("models", [])])
    except Exception:
        # Fallback local models
        models.extend(["qwen3:latest", "phi:latest", "gemma:2b", "llama3.2:1b"])
        
    # 2. Append cloud LLM models if configured
    if os.getenv("GEMINI_KEYS") or os.getenv("GEMINI_KEY"):
        models.append("gemini/gemini-2.5-flash")
        models.append("gemini/gemini-1.5-pro")
    if os.getenv("GROQ_KEYS") or os.getenv("GROQ_KEY"):
        models.append("groq/llama-3.3-70b-versatile")
        models.append("groq/mixtral-8x7b-32768")
    if os.getenv("DEEPSEEK_KEYS") or os.getenv("DEEPSEEK_KEY"):
        models.append("deepseek/deepseek-chat")
    if os.getenv("OPENROUTER_KEYS") or os.getenv("OPENROUTER_KEY"):
        models.append("openrouter/meta-llama/llama-3.3-70b-instruct")
        models.append("openrouter/google/gemini-2.5-flash")
        
    return {"models": models}

@app.get("/analytics")
def get_analytics():
    # Try fetching from MongoDB first
    records = get_evaluation_records()
    if records is not None:
        return {"results": records}

    # Fallback to CSV
    csv_path = "analytics.csv"
    if not os.path.exists(csv_path):
        return {"results": []}
    try:
        df = pd.read_csv(
            csv_path,
            names=["model", "answer", "latency", "words", "length", "grounded", "retrieval", "embed_model", "score"]
        )
        # Handle legacy 8-column rows where score is missing/NaN
        df["embed_model"] = df["embed_model"].astype(str)
        df["score"] = df["score"].astype(float)
        
        legacy = df["score"].isna()
        if legacy.any():
            df.loc[legacy, "score"] = df.loc[legacy, "embed_model"].astype(float)
            df.loc[legacy, "embed_model"] = "Unknown"
            
        df = df.fillna("")
        records = df.to_dict(orient="records")
        return {"results": records}
    except Exception as e:
        return {"status": "error", "message": str(e), "results": []}

@app.get("/embedding-config")
def get_embedding_config():
    return {"active_model": get_active_model()}

@app.post("/embedding-config")
def update_embedding_config(data: EmbeddingConfigRequest):
    try:
        with open("config.json", "w") as f:
            json.dump({"embedding_model": data.embedding_model}, f)
        return {"status": "success", "message": f"Embedding model updated to {data.embedding_model}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/benchmark-embeddings")
def run_benchmark_embeddings(data: BenchmarkRequest):
    try:
        # Try to pull doc chunks from ChromaDB
        doc_data = collection.get()
        chunks = doc_data.get("documents", [])
        
        # Limit to 5 chunks for faster benchmarking execution
        if chunks:
            chunks = chunks[:5]
            
        benchmark_results = benchmark_models(data.query, chunks)
        return {"status": "success", "results": benchmark_results}
    except Exception as e:
        return {"status": "error", "message": str(e), "results": {}}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    path = os.path.join("uploads", file.filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text, chroma_ids = process_document(path)
        save_asset({
            "filename": file.filename,
            "file_type": "document",
            "file_path": path,
            "file_size": os.path.getsize(path),
            "text_content": text,
            "chroma_ids": chroma_ids
        })
    except Exception as e:
        return {"status": "error", "message": f"File uploaded but RAG indexing failed: {str(e)}"}

    return {"status": "success", "message": "Uploaded Successfully"}

@app.post("/chat")
def chat(data: ChatRequest):
    session_id = data.session_id or create_chat_session()
    
    # Save the user query first
    save_chat_message(session_id, sender="user", text=data.question)

    try:
        doc_data = collection.get()
        chunks = doc_data.get("documents", [])
    except Exception:
        chunks = []

    # Dual-routing self-selection mode (routes both embedder and LLM model)
    if data.model == "auto-select":
        try:
            # 1. Run embedding benchmark on document chunks
            emb_results = benchmark_models(data.question, chunks[:5] if chunks else None)
            
            # Find highest-scoring embedding model
            valid_emb_results = [r for r in emb_results.values() if "error" not in r]
            if not valid_emb_results:
                raise ValueError("All embedding model benchmarks failed.")
                
            best_emb = max(valid_emb_results, key=lambda x: x["quality_score"])
            best_emb_name = best_emb["model"]

            # 2. Retrieve Top 3 chunks from the entire ChromaDB collection
            top_chunks = retrieve_chunks(data.question)
            
            context = "\n".join(top_chunks)
            prompt = f"""
You are an AI Assistant.

Answer ONLY using the context.

If unavailable say
"I don't know based on the document."

Context:
{context}

Question:
{data.question}
"""
            # 3. Benchmark the LLM response using this optimized context prompt
            llm_results = compare_models(prompt, context)
            llm_results = rank_models(llm_results)
            
            if not llm_results:
                raise ValueError("No LLM responses were generated.")
                
            best_llm = llm_results[0]
            
            save_chat_message(
                session_id=session_id,
                sender="assistant",
                text=best_llm["answer"],
                model=best_llm["model"],
                embedModel=best_emb_name,
                score=best_llm["score"],
                latency=best_llm["latency"],
                sources=top_chunks
            )
            return {
                "answer": best_llm["answer"],
                "retrieved_chunks": top_chunks,
                "selected_model": best_llm["model"],
                "selected_embed_model": best_emb_name,
                "score": best_llm["score"],
                "latency": best_llm["latency"],
                "session_id": session_id
            }
        except Exception as e:
            err_answer = f"Error running dual-routing auto-selection: {str(e)}"
            save_chat_message(
                session_id=session_id,
                sender="assistant",
                text=err_answer,
                model="None",
                embedModel="None",
                score=0.0,
                latency=0.0,
                sources=chunks[:3] if chunks else []
            )
            return {
                "answer": err_answer,
                "retrieved_chunks": chunks[:3] if chunks else [],
                "selected_model": "None",
                "selected_embed_model": "None",
                "score": 0.0,
                "latency": 0.0,
                "session_id": session_id
            }
    # Direct model selection mode (uses currently active embedding config)
    else:
        try:
            docs = retrieve_chunks(data.question)
        except Exception:
            docs = []

        context = "\n".join(docs)

        prompt = f"""
You are an AI Assistant.

Answer ONLY using the context.

If unavailable say
"I don't know based on the document."

Context:
{context}

Question:
{data.question}
"""
        try:
            start_time = time.time()
            answer = ask_model(data.model, prompt)
            latency = time.time() - start_time
            save_chat_message(
                session_id=session_id,
                sender="assistant",
                text=answer,
                model=data.model,
                embedModel=get_active_model(),
                score=0.0,
                latency=round(latency, 2),
                sources=docs
            )
            return {
                "answer": answer,
                "retrieved_chunks": docs,
                "selected_model": data.model,
                "selected_embed_model": get_active_model(),
                "score": 0.0,
                "latency": round(latency, 2),
                "session_id": session_id
            }
        except Exception as e:
            err_answer = f"Error communicating with model '{data.model}': {str(e)}"
            save_chat_message(
                session_id=session_id,
                sender="assistant",
                text=err_answer,
                model=data.model,
                embedModel=get_active_model(),
                score=0.0,
                latency=0.0,
                sources=docs
            )
            return {
                "answer": err_answer,
                "retrieved_chunks": docs,
                "selected_model": data.model,
                "selected_embed_model": get_active_model(),
                "score": 0.0,
                "latency": 0.0,
                "session_id": session_id
            }

@app.post("/compare")
def compare(data: ChatRequest):
    try:
        docs = retrieve_chunks(data.question)
    except Exception:
        docs = []

    context = "\n".join(docs)

    prompt = f"""
Context:
{context}

Question:
{data.question}
"""
    try:
        results = compare_models(prompt, context)
        save_csv(results)
        results = rank_models(results)
        winner = results[0]["model"] if results else "None"
        return {
            "results": results,
            "winner": winner
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "results": [],
            "winner": "None"
        }

@app.post("/metrics")
def metrics(data: ChatRequest):
    try:
        docs = retrieve_chunks(data.question)
    except Exception:
        docs = []
    text = " ".join(docs)
    from broadcast_metrics import analyze_broadcast_text
    return analyze_broadcast_text(text)

@app.get("/download-csv")
def download_csv():
    return FileResponse(
        "analytics.csv",
        filename="analytics.csv"
    )

@app.get("/download-pdf")
def pdf():
    create_pdf()
    return FileResponse(
        "analytics.pdf"
    )

@app.post("/audio-upload")
async def audio_upload(
    file: UploadFile = File(...)
):
    os.makedirs("uploads", exist_ok=True)
    path = f"uploads/{file.filename}"
    with open(path, "wb") as f:
        f.write(
            await file.read()
        )
    from audio_analysis import transcribe
    text = transcribe(path)
    
    chroma_ids = process_text(text, source_name=file.filename)
    save_asset({
        "filename": file.filename,
        "file_type": "audio",
        "file_path": path,
        "file_size": os.path.getsize(path),
        "text_content": text,
        "chroma_ids": chroma_ids
    })
    return {
        "message": "Audio Indexed"
    }

@app.post("/video-upload")
async def upload_video(
    file: UploadFile = File(...)
):
    os.makedirs("uploads", exist_ok=True)
    path = f"uploads/{file.filename}"
    with open(path, "wb") as f:
        f.write(
            await file.read()
        )
    from video_analysis import extract_audio
    extract_audio(
        path,
        "uploads/temp.wav"
    )
    from audio_analysis import transcribe
    text = transcribe(
        "uploads/temp.wav"
    )
    
    chroma_ids = process_text(text, source_name=file.filename)
    save_asset({
        "filename": file.filename,
        "file_type": "video",
        "file_path": path,
        "file_size": os.path.getsize(path),
        "text_content": text,
        "chroma_ids": chroma_ids
    })
    return {
        "message": "Video Indexed"
    }

@app.post("/image-upload")
async def image_upload(
    file: UploadFile = File(...)
):
    os.makedirs("uploads", exist_ok=True)
    path = f"uploads/{file.filename}"
    with open(path, "wb") as f:
        f.write(
            await file.read()
        )
    from image_analysis import analyze_image
    text = analyze_image(path)
    
    chroma_ids = process_text(text, source_name=file.filename)
    save_asset({
        "filename": file.filename,
        "file_type": "image",
        "file_path": path,
        "file_size": os.path.getsize(path),
        "text_content": text,
        "chroma_ids": chroma_ids
    })
    return {
        "message": "Image Indexed"
    }

@app.post("/url-upload")
def url_upload(data: URLUploadRequest):
    url = data.url
    try:
        from bs4 import BeautifulSoup
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove navigation/footer/styles/scripts elements to keep it clean
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.decompose()
            
        title = soup.title.string.strip() if soup.title else url
        if not title:
            title = url
            
        text = soup.get_text()
        
        # Clean whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        cleaned_text = "\n".join(chunk for chunk in chunks if chunk)
        
        if not cleaned_text.strip():
            raise ValueError("No readable text could be extracted from the webpage.")
            
        # Index in ChromaDB
        chroma_ids = process_text(cleaned_text, source_name=title)
        
        # Save in MongoDB
        save_asset({
            "filename": title,
            "file_type": "url",
            "file_path": url,
            "file_size": len(cleaned_text.encode('utf-8')),
            "text_content": cleaned_text,
            "chroma_ids": chroma_ids
        })
        
        return {"status": "success", "message": f"Website indexed successfully: {title}"}
        
    except Exception as e:
        return {"status": "error", "message": f"Failed to crawl/index website: {str(e)}"}

@app.post("/image-chat")
def image_chat(data: ImageChatRequest):
    session_id = data.session_id or create_chat_session()
    
    # Save the user query (including image preview)
    save_chat_message(session_id, sender="user", text=data.question, image=data.image)

    try:
        b64_data = data.image
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
            
        payload = {
            "model": "minicpm-v",
            "prompt": data.question,
            "images": [b64_data],
            "stream": False
        }
        
        start_time = time.time()
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        res_data = response.json()
        answer = res_data.get("response", "")
        latency = time.time() - start_time
        
        save_chat_message(
            session_id=session_id,
            sender="assistant",
            text=answer,
            model="minicpm-v",
            embedModel="None",
            score=0.0,
            latency=round(latency, 2)
        )
        return {
            "status": "success",
            "answer": answer,
            "selected_model": "minicpm-v",
            "selected_embed_model": "None",
            "retrieved_chunks": [],
            "score": 0.0,
            "latency": round(latency, 2),
            "session_id": session_id
        }
    except Exception as e:
        err_answer = f"Vision analysis failed: {str(e)}"
        save_chat_message(
            session_id=session_id,
            sender="assistant",
            text=err_answer,
            model="minicpm-v",
            embedModel="None",
            score=0.0,
            latency=0.0
        )
        return {
            "status": "error",
            "message": err_answer,
            "session_id": session_id
        }