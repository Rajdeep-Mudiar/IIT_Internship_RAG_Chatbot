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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

class ChatRequest(BaseModel):
    question: str
    model: str = "auto-select"

class EmbeddingConfigRequest(BaseModel):
    embedding_model: str

class BenchmarkRequest(BaseModel):
    query: str

class ImageChatRequest(BaseModel):
    question: str
    image: str


@app.get("/")
def home():
    return {"status": "success", "message": "Backend Running"}

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
        # Clear existing ChromaDB collection elements to re-index fresh document
        try:
            doc_data = collection.get()
            if doc_data and doc_data.get("ids"):
                collection.delete(ids=doc_data["ids"])
        except Exception:
            pass

        process_document(path)
    except Exception as e:
        return {"status": "error", "message": f"File uploaded but RAG indexing failed: {str(e)}"}

    return {"status": "success", "message": "Uploaded Successfully"}

@app.post("/chat")
def chat(data: ChatRequest):
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
            
            return {
                "answer": best_llm["answer"],
                "retrieved_chunks": top_chunks,
                "selected_model": best_llm["model"],
                "selected_embed_model": best_emb_name,
                "score": best_llm["score"],
                "latency": best_llm["latency"]
            }
        except Exception as e:
            return {
                "answer": f"Error running dual-routing auto-selection: {str(e)}",
                "retrieved_chunks": chunks[:3] if chunks else [],
                "selected_model": "None",
                "selected_embed_model": "None",
                "score": 0.0,
                "latency": 0.0
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
            return {
                "answer": answer,
                "retrieved_chunks": docs,
                "selected_model": data.model,
                "selected_embed_model": get_active_model(),
                "score": 0.0,
                "latency": round(latency, 2)
            }
        except Exception as e:
            return {
                "answer": f"Error communicating with model '{data.model}': {str(e)}",
                "retrieved_chunks": docs,
                "selected_model": data.model,
                "selected_embed_model": get_active_model(),
                "score": 0.0,
                "latency": 0.0
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
    
    # Re-index: Clear existing collection
    try:
        doc_data = collection.get()
        if doc_data and doc_data.get("ids"):
            collection.delete(ids=doc_data["ids"])
    except Exception:
        pass
        
    process_text(text)
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
    
    # Re-index: Clear existing collection
    try:
        doc_data = collection.get()
        if doc_data and doc_data.get("ids"):
            collection.delete(ids=doc_data["ids"])
    except Exception:
        pass
        
    process_text(text)
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
    
    # Re-index: Clear existing collection
    try:
        doc_data = collection.get()
        if doc_data and doc_data.get("ids"):
            collection.delete(ids=doc_data["ids"])
    except Exception:
        pass
        
    process_text(text)
    return {
        "message": "Image Indexed"
    }

@app.post("/image-chat")
def image_chat(data: ImageChatRequest):
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
        
        return {
            "status": "success",
            "answer": answer,
            "selected_model": "minicpm-v",
            "selected_embed_model": "None",
            "retrieved_chunks": [],
            "score": 0.0,
            "latency": round(latency, 2)
        }
    except Exception as e:
        return {"status": "error", "message": f"Vision analysis failed: {str(e)}"}