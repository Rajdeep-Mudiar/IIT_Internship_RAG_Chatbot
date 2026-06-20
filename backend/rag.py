import chromadb
import os

from utils import read_pdf,read_docx,read_txt
from embeddings import create_embedding

client=chromadb.PersistentClient(path="vector_db")

def get_collection():
    from embeddings import get_active_model
    model_name = get_active_model()
    # Sanitize model_name for ChromaDB collection name constraints
    sanitized = "".join(c.lower() if c.isalnum() else "_" for c in model_name)
    name = f"rag_{sanitized}"
    if len(name) > 63:
        name = name[:63]
    while name and not name[-1].isalnum():
        name = name[:-1]
    if len(name) < 3:
        name = "rag_default"
    return client.get_or_create_collection(name=name)

class ChromaCollectionProxy:
    def __getattr__(self, name):
        actual_collection = get_collection()
        return getattr(actual_collection, name)

collection = ChromaCollectionProxy()

def process_document(path):
    import uuid
    ext = os.path.splitext(path)[1]
    
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        chroma_ids = []
        text_pieces = []
        chunk_idx = 0
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if not page_text.strip():
                continue
            text_pieces.append(page_text)
            
            # Chunk page content into 500-char blocks
            size = 500
            for sub_idx in range(0, len(page_text), size):
                chunk = page_text[sub_idx : sub_idx + size]
                emb = create_embedding(chunk)
                chunk_id = f"{chunk_idx}_{uuid.uuid4().hex[:8]}_{os.path.basename(path)}"
                collection.add(
                    ids=[chunk_id],
                    embeddings=[emb],
                    documents=[chunk],
                    metadatas=[{
                        "source": os.path.basename(path),
                        "page": page_idx + 1,
                        "chunk": chunk_idx + 1
                    }]
                )
                chroma_ids.append(chunk_id)
                chunk_idx += 1
        full_text = "\n".join(text_pieces)
        return full_text, chroma_ids
    else:
        if ext == ".docx":
            text = read_docx(path)
        else:
            text = read_txt(path)

        chunks = []
        size = 500
        for i in range(0, len(text), size):
            chunks.append(text[i:i+size])

        chroma_ids = []
        for i, c in enumerate(chunks):
            emb = create_embedding(c)
            chunk_id = f"{i}_{uuid.uuid4().hex[:8]}_{os.path.basename(path)}"
            collection.add(
                ids=[chunk_id],
                embeddings=[emb],
                documents=[c],
                metadatas=[{
                    "source": os.path.basename(path),
                    "page": 1,
                    "chunk": i + 1
                }]
            )
            chroma_ids.append(chunk_id)
        return text, chroma_ids


def retrieve_chunks(question):
    embedding = create_embedding(question)
    result = collection.query(
        query_embeddings=[embedding],
        n_results=3
    )
    return result["documents"][0], result["metadatas"][0]

def process_text(text, source_name="transcription"):
    import uuid
    chunks = []
    size = 500
    for i in range(0, len(text), size):
        chunks.append(text[i:i+size])
        
    chroma_ids = []
    for i, c in enumerate(chunks):
        emb = create_embedding(c)
        chunk_id = f"{i}_{uuid.uuid4().hex[:8]}_{source_name}"
        collection.add(
            ids=[chunk_id],
            embeddings=[emb],
            documents=[c],
            metadatas=[{
                "source": source_name,
                "page": 1,
                "chunk": i + 1
            }]
        )
        chroma_ids.append(chunk_id)
    return chroma_ids