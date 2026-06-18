import time
import os
import gc
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# List of models as requested by the user
EMBEDDING_MODELS = [
    "BAAI/bge-large-en-v1.5",
    "BAAI/bge-base-en-v1.5",
    "BAAI/bge-small-en-v1.5",
    "intfloat/e5-large-v2",
    "intfloat/e5-base-v2",
    "sentence-transformers/all-mpnet-base-v2",
    "sentence-transformers/all-MiniLM-L6-v2",
    "nomic-ai/nomic-embed-text-v1.5",
    "jinaai/jina-embeddings-v3"
]

DEFAULT_DOCS = [
    "Quantum key distribution (QKD) is a secure communication method which implements a cryptographic protocol involving components of quantum physics.",
    "It enables two parties to produce a shared random secret key known only to them, which can then be used to encrypt and decrypt message packets.",
    "An important and unique property of quantum key distribution is the ability of the two communicating parties to detect the presence of any third party eavesdropper.",
    "By using quantum superpositions or quantum entanglement and transmitting information in quantum states, any eavesdropping is immediately detected.",
    "This is because any measurement of a quantum state inherently alters the system, introducing detectable anomalies in key transmission."
]

def benchmark_models(query: str, doc_chunks: list = None) -> dict:
    if not doc_chunks or len(doc_chunks) == 0:
        doc_chunks = DEFAULT_DOCS

    results = {}
    
    for model_name in EMBEDDING_MODELS:
        try:
            # 1. Load Model with remote code trust for custom models (like Jina v3)
            start_load = time.time()
            trust_remote = "jina" in model_name.lower()
            encoder = SentenceTransformer(model_name, trust_remote_code=trust_remote)
            load_time = time.time() - start_load

            # 2. Embed Chunks and Query
            start_embed = time.time()
            chunk_embs = encoder.encode(doc_chunks) # shape (N, D)
            query_emb = encoder.encode([query])[0]   # shape (D,)
            embed_time = time.time() - start_embed

            # Convert to numpy arrays
            chunk_embs = np.array(chunk_embs)
            query_emb = np.array(query_emb)

            # 3. Calculate Cosine Similarities
            q_norm = np.linalg.norm(query_emb)
            similarities = []
            for emb in chunk_embs:
                e_norm = np.linalg.norm(emb)
                if q_norm > 0 and e_norm > 0:
                    sim = np.dot(query_emb, emb) / (q_norm * e_norm)
                else:
                    sim = 0.0
                similarities.append(float(sim))

            # 4. Dimensionality Reduction (PCA via SVD)
            # Combine chunk embeddings and query embedding to project them into the same 2D space
            combined = np.vstack([chunk_embs, query_emb]) # shape (N+1, D)
            mean = np.mean(combined, axis=0)
            centered = combined - mean
            
            U, S, Vt = np.linalg.svd(centered, full_matrices=False)
            projected = U[:, :2] * S[:2] # shape (N+1, 2)
            
            coords = projected.tolist()
            chunk_coords = coords[:-1]
            query_coord = coords[-1]

            # 5. Compile Model Metrics
            dimensions = chunk_embs.shape[1]
            top_sim = max(similarities)
            avg_sim = np.mean(similarities)
            gap = top_sim - avg_sim # represents retrieval contrast / separation

            # Score is out of 100 based on separation, max match, and embed speed
            # separation (gap) * 60 + top similarity * 30 + (1/(embed_time+1)) * 10
            quality_score = (gap * 60) + (top_sim * 30) + (1.0 / (embed_time + 1.0)) * 10
            quality_score = round(min(max(quality_score * 100 / 70, 0), 100), 2) # scale to 0-100

            results[model_name] = {
                "model": model_name,
                "dimensions": dimensions,
                "load_time": round(load_time, 2),
                "embed_time": round(embed_time, 2),
                "top_similarity": round(top_sim, 4),
                "avg_similarity": round(avg_sim, 4),
                "separation": round(gap, 4),
                "quality_score": quality_score,
                "chunk_coords": chunk_coords,
                "query_coord": query_coord,
                "similarities": similarities,
                "chunks": doc_chunks
            }

            # 6. Explicitly clean up memory
            del encoder
            gc.collect()

        except Exception as e:
            results[model_name] = {
                "model": model_name,
                "error": str(e),
                "quality_score": 0.0
            }
            gc.collect()

    return results
