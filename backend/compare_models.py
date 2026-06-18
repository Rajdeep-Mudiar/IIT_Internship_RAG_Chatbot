import time
import os
from chat import ask_model
from evaluation import groundedness
from ranking import calculate_score
from dotenv import load_dotenv
from embeddings import get_active_model

# Load env variables
load_dotenv()

def get_comparison_models():
    # Base local models
    models = [
        "qwen3:latest",
        "phi:latest",
        "gemma:2b",
        "llama3.2:1b"
    ]
    
    # Check for cloud LLM API keys in backend/.env and append benchmark candidates
    if os.getenv("GEMINI_KEYS") or os.getenv("GEMINI_KEY"):
        models.append("gemini/gemini-2.5-flash")
    if os.getenv("GROQ_KEYS") or os.getenv("GROQ_KEY"):
        models.append("groq/llama-3.3-70b-versatile")
    if os.getenv("DEEPSEEK_KEYS") or os.getenv("DEEPSEEK_KEY"):
        models.append("deepseek/deepseek-chat")
    if os.getenv("OPENROUTER_KEYS") or os.getenv("OPENROUTER_KEY"):
        models.append("openrouter/meta-llama/llama-3.3-70b-instruct")
        
    return models

def compare_models(prompt, context):
    results = []
    models_to_test = get_comparison_models()
    active_emb = get_active_model()

    for model in models_to_test:
        try:
            start = time.time()
            answer = ask_model(model, prompt)
            latency = time.time() - start
            
            retrieval = 1.0
            ground = groundedness(answer, context)
            words = len(answer.split())
            
            item = {
                "model": model,
                "answer": answer,
                "latency": round(latency, 2),
                "words": words,
                "length": words,
                "grounded": ground,
                "retrieval": retrieval,
                "embed_model": active_emb
            }
            
            item["score"] = calculate_score(item)
            results.append(item)
        except Exception as e:
            item = {
                "model": model,
                "answer": f"Benchmarking failed for '{model}': {str(e)}",
                "latency": 99.99,
                "words": 0,
                "length": 0,
                "grounded": 0.0,
                "retrieval": 0.0,
                "embed_model": active_emb,
                "score": 0.0
            }
            results.append(item)

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results