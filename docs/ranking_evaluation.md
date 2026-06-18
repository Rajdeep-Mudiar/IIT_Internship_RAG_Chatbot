# LLM & Embedding Performance Ranking Algorithms

This document details the mathematical models, weighting systems, and dimensionality reduction techniques used to rank local Large Language Models (LLMs) and evaluate embedding spaces.

---

## 📊 1. Multi-LLM Evaluation Score

Calculated for each compared LLM response. The composite score scales from **0 to 100** points and is computed using four distinct performance criteria:

$$\text{Score} = (R \times 40) + (G \times 30) + \left(\frac{10}{L + 1}\right) \times 20 + \min\left(\frac{W}{100}, 1\right) \times 10$$

### 🛠️ Variable Breakdown & Weights

1.  **Retrieval Relevance ($R$ - Weight: 40%):**
    *   Grades whether context was successfully queried from vector stores. Defaults to $1.0$ (maximum 40 points) when chunks are successfully retrieved.
    
2.  **Groundedness Ratio ($G$ - Weight: 30%):**
    *   Measures faithfulness to the reference source text. Evaluated using a word overlap ratio between the model's generated answer words ($W_{\text{answer}}$) and the context chunk words ($W_{\text{context}}$):
        $$G = \frac{|W_{\text{answer}} \cap W_{\text{context}}|}{|W_{\text{answer}}|}$$
    *   A high word intersection ratio yields up to 30 points.

3.  **Response Latency ($L$ - Weight: 20%):**
    *   Measures time elapsed in seconds from query dispatch to final completion response. Evaluated using a decaying curve:
        $$\text{Speed Points} = \left(\frac{10}{L + 1}\right) \times 20$$
    *   Very fast responses ($L \to 0$) receive up to 20 points, while extremely slow responses are penalized (e.g., $L = 9\text{s} \to 2$ points). If an API call fails or times out, latency defaults to $99.99\text{s}$ and the score is forced to $0.0$.

4.  **Verbosity ($W$ - Weight: 10%):**
    *   Prevents extremely short answers (e.g., "I don't know") from scoring high on speed and groundedness by rewarding detailed responses up to a cap of 100 words:
        $$\text{Verbosity Factor} = \min\left(\frac{W}{100}, 1\right) \times 10$$

---

## 📈 2. Embedding Model Benchmarking & SVD Projection

When evaluating the quality of embedding models, we map multi-dimensional vector matrices into a 2D coordinate plane for visualization.

### Singular Value Decomposition (SVD)

Let $\mathbf{X} \in \mathbb{R}^{M \times D}$ be the matrix containing $M$ document text chunks and query embeddings, where $D$ represents the vector dimensions (e.g., 768 or 1024). We compute SVD to reduce the dimension to $d=2$:

$$\mathbf{X} = \mathbf{U} \mathbf{\Sigma} \mathbf{V}^T$$

Where:
*   $\mathbf{U} \in \mathbb{R}^{M \times M}$ contains the left singular vectors.
*   $\mathbf{\Sigma} \in \mathbb{R}^{M \times D}$ contains the singular values in descending order.
*   $\mathbf{V} \in \mathbb{R}^{D \times D}$ contains the right singular vectors (principal axes).

We extract the coordinates on the two dimensions corresponding to the largest singular values to project the vectors into the 2D coordinate space:

$$\mathbf{X}_{2D} = \mathbf{X} \mathbf{V}_{2} \in \mathbb{R}^{M \times 2}$$

Where $\mathbf{V}_{2} \in \mathbb{R}^{D \times 2}$ represents the first two columns of the orthogonal matrix $\mathbf{V}$.

### Semantic Spacing Separability

The quality rating of an embedding model is determined by calculating the distance between the query vector projection ($\mathbf{q}_{2D}$) and context chunk projections ($\mathbf{c}_{i, 2D}$):

$$\text{Separation Quality} = \frac{1}{M} \sum_{i=1}^M \|\mathbf{q}_{2D} - \mathbf{c}_{i, 2D}\|_2$$
