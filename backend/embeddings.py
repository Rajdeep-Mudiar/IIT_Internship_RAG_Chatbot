import json
import os
import requests
from sentence_transformers import SentenceTransformer

CONFIG_PATH = "config.json"
_cached_encoder = None
_cached_model_name = None

def get_active_model() -> str:
    if not os.path.exists(CONFIG_PATH):
        return "nomic-embed-text"
    try:
        with open(CONFIG_PATH, "r") as f:
            data = json.load(f)
            return data.get("embedding_model", "nomic-embed-text")
    except Exception:
        return "nomic-embed-text"

def create_embedding(text: str) -> list:
    global _cached_encoder, _cached_model_name
    model_name = get_active_model()

    # If the model has a slash, it's a HuggingFace sentence-transformers model
    if "/" in model_name:
        if _cached_model_name != model_name:
            trust_remote = "jina" in model_name.lower()
            _cached_encoder = SentenceTransformer(model_name, trust_remote_code=trust_remote)
            _cached_model_name = model_name
        
        # sentence-transformers returns numpy arrays, convert to list of floats for ChromaDB
        emb = _cached_encoder.encode([text])[0]
        return [float(x) for x in emb]
    else:
        # Otherwise route to local Ollama embed API
        response = requests.post(
            "http://localhost:11434/api/embed",
            json={
                "model": model_name,
                "input": text
            }
        )
        response.raise_for_status()
        return response.json()["embeddings"][0]