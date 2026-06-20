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

    ext=os.path.splitext(path)[1]

    if ext==".pdf":

        text=read_pdf(path)

    elif ext==".docx":

        text=read_docx(path)

    else:

        text=read_txt(path)

    chunks=[]

    size=500

    for i in range(0,len(text),size):

        chunks.append(text[i:i+size])

    for i,c in enumerate(chunks):

        emb=create_embedding(c)

        collection.add(

            ids=[str(i)+path],

            embeddings=[emb],

            documents=[c]
        )


def retrieve_chunks(question):

    embedding=create_embedding(question)

    result=collection.query(

        query_embeddings=[embedding],

        n_results=3

    )

    return result["documents"][0]

def process_text(text, source_name="transcription"):
    chunks=[]
    size=500
    for i in range(0,len(text),size):
        chunks.append(text[i:i+size])
    for i,c in enumerate(chunks):
        emb=create_embedding(c)
        collection.add(
            ids=[str(i) + "_" + source_name],
            embeddings=[emb],
            documents=[c]
        )