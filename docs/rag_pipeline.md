# RAG Pipeline: Chunking, Embeddings, and ChromaDB

This document details the mathematical algorithms, data structures, and retrieval processes that power the system's local vector indexing and context retrieval framework.

---

## 🏗️ Execution Flow

```
[ Raw String Context ]
        │
        ▼ (Character-based Segmentation)
[ Text Chunks (size = 500) ]
        │
        ▼ (HuggingFace Encoder)
[ Vector Embeddings v_c ]
        │
        ▼ (Dynamic Collection Naming)
[ ChromaDB Storage (Persistent) ] ◄──(Cosine Search)── [ User Query v_q ]
```

---

## 🛠️ Mathematical Process & Formulas

### 1. Context Chunking
Let $T$ represent the contiguous text content extracted from document, audio, or video transcripts. The character sequence is divided into $M$ chunks using a sliding block width of $s = 500$ characters without character overlap:

$$C_i = T[i \cdot s : (i+1) \cdot s] \quad \text{for } i \in \left[0, \left\lfloor \frac{|T|}{s} \right\rfloor\right]$$

### 2. Dense Vector Embeddings
For each text chunk $c$, we generate a dense numerical vector representation using the active embedding model $f_{\text{embed}}$:

$$\mathbf{v}_c = f_{\text{embed}}(c) \in \mathbb{R}^D$$

Where $D$ represents the dimensionality of the vector space:
*   $D = 768$ (e.g., `nomic-embed-text-v1.5`, `BAAI/bge-base-en-v1.5`)
*   $D = 1024$ (e.g., `BAAI/bge-large-en-v1.5`, `intfloat/e5-large-v2`)
*   $D = 384$ (e.g., `sentence-transformers/all-MiniLM-L6-v2`)

### 3. Dynamic Vector Database Isolation
To prevent dimensionality collisions in ChromaDB when the active embedding model is changed, a `ChromaCollectionProxy` dynamically isolates databases:

$$\text{Collection Name} = \text{"rag\_"} + \text{sanitize}(ModelName)$$

Where the sanitize function preserves alphanumeric characters and converts spaces/slashes to underscores:

$$\text{sanitize}(s) = \left\{ x_j \in s \mid x_j \in [a-z, 0-9] \right\}$$

### 4. Semantic Similarity Retrieval
When a user asks a question $q$, it is vectorised:

$$\mathbf{v}_q = f_{\text{embed}}(q) \in \mathbb{R}^D$$

A query search is executed in ChromaDB to retrieve the top $k = 3$ chunks. The similarity metric is evaluated using **Cosine Distance**:

$$\text{Similarity}(q, c) = \frac{\mathbf{v}_q \cdot \mathbf{v}_c}{\|\mathbf{v}_q\| \|\mathbf{v}_c\|} = \frac{\sum_{j=1}^D v_{q, j} \cdot v_{c, j}}{\sqrt{\sum_{j=1}^D (v_{q, j})^2} \cdot \sqrt{\sum_{j=1}^D (v_{c, j})^2}}$$

The context chunks corresponding to the highest similarity ranks are fetched and concatenated for prompt building.

---

## ⚡ Technical Specifications

*   **Database:** `chromadb` (Persistent Client mode).
*   **Embeddings Loader:** `sentence-transformers` running HuggingFace model encoders locally on device, or Ollama embed endpoint.
*   **Time Complexity:** 
  *   Index Phase: $O(M \cdot \text{Cost}(f_{\text{embed}}))$ where $M$ is the number of text segments.
  *   Retrieve Phase: $O(M \cdot D)$ brute-force comparison, optimized via index search algorithms (HNSW inside ChromaDB).
