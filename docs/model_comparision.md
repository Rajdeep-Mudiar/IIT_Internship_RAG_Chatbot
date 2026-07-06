# Model Comparison Metrics

This document explains how the comparison dashboard calculates latency, groundedness, response word count, and the overall score for each model.

The implementation lives primarily in [backend/compare_models.py](../backend/compare_models.py), [backend/evaluation.py](../backend/evaluation.py), and [backend/ranking.py](../backend/ranking.py).

---

## 1. What the comparison step does

When a benchmark prompt is run, the backend tests several models one by one, captures their answers, measures response time, and assigns a score to each result.

For every model, the system stores these fields:

- `model`: model name used for the request
- `answer`: generated response text
- `latency`: time taken to produce the answer
- `words`: number of words in the answer
- `length`: same value as `words`
- `grounded`: groundedness index computed from answer-context word overlap
- `retrieval`: retrieval quality weight, currently fixed to `1.0`
- `embed_model`: active embedding model used by the RAG pipeline
- `score`: composite score used for ranking

The final result list is sorted by `score` in descending order, so the highest-scoring model appears first.

---

## 2. Latency comparison

### How latency is measured

Latency is measured as wall-clock time around the model call:

$$
\text{latency} = \text{time after response} - \text{time before request}
$$

In code, the timer starts immediately before `ask_model(...)` runs and stops right after the answer is returned.

### How latency is displayed

- The raw value is rounded to 2 decimal places.
- Lower latency means the model responded faster.
- If a model request fails, latency is set to `99.99` to mark it as a failed benchmark.

### How latency affects score

Latency contributes to the overall score through an inverse-style bonus:

$$
\text{latency contribution} = \left(\frac{10}{\text{latency} + 1}\right) \times 20
$$

This means:

- very low latency gives a larger bonus
- slower latency gives a smaller bonus
- the `+ 1` prevents division by zero

### Important note

The dashboard does not normalize latency across models. It compares the actual runtime values directly, so a smaller value is always better.

---

## 3. Groundedness index

### What groundedness means here

Groundedness is not a semantic entailment score or an LLM judge score in this implementation. It is a simple word-overlap ratio between the model answer and the supplied context.

The calculation is performed in [backend/evaluation.py](../backend/evaluation.py).

### Exact formula

Let:

- `answer_words` = unique lowercase words in the answer
- `context_words` = unique lowercase words in the context
- `overlap` = number of shared words between the two sets
- `total` = number of unique words in the answer

Then:

$$
\text{groundedness} = \frac{|\text{answer words} \cap \text{context words}|}{|\text{answer words}|}
$$

The result is rounded to 2 decimal places.

### How to interpret it

- `1.00` means every unique answer word also appears in the context.
- `0.00` means no answer words overlap with the context.
- Higher values indicate the answer stays closer to the retrieved context.

### Important caveats

- The method uses simple whitespace splitting, not tokenization or semantic similarity.
- Punctuation remains attached to words unless already separated by spaces.
- Because the comparison uses sets, repeated words do not increase the score.
- This metric is sensitive to casing and formatting only through the `.lower()` step and whitespace splitting.

---

## 4. Response word count

### How it is calculated

The response word count is computed as:

$$
\text{words} = \text{len}(\text{answer.split()})
$$

This is a simple whitespace-based split, not a tokenizer count.

The same number is also stored in `length`, so both fields currently hold the same value.

### How to interpret it

- Larger values usually mean a longer, more detailed response.
- Smaller values usually mean a shorter response.

### Important caveat

This is not a model token count. It counts space-separated chunks, so punctuation and formatting can slightly affect the result.

---

## 5. Overall score calculation

The overall score is computed in [backend/ranking.py](../backend/ranking.py) with a weighted sum of four signals.

### Exact formula

For a normal result:

$$
\text{score} = (\text{retrieval} \times 40) + (\text{grounded} \times 30) + \left(\frac{10}{\text{latency} + 1} \times 20\right) + \min\left(\frac{\text{words}}{100}, 1\right) \times 10
$$

The score is rounded to 2 decimal places.

### Weight breakdown

- Retrieval: 40 points
- Groundedness: 30 points
- Latency bonus: 20 points
- Response length bonus: 10 points

### Why the score behaves this way

- Retrieval is treated as the strongest signal in the current implementation.
- Groundedness is the next most important quality measure.
- Faster responses get extra credit, but the effect tapers off as latency grows.
- Longer answers get a small bonus up to 100 words.

### Response-length bonus

The response-length term is capped:

$$
\min\left(\frac{\text{words}}{100}, 1\right) \times 10
$$

So:

- 0 words gives 0 points
- 50 words gives 5 points
- 100 words or more gives the full 10 points

This prevents very long responses from dominating the score.

### Failed requests

If a model request fails, the system sets:

- `latency = 99.99`
- `grounded = 0.0`
- `retrieval = 0.0`
- `words = 0`
- `score = 0.0`

That makes failed runs easy to identify and keeps them at the bottom of the ranking.

---

## 6. How the models are ranked

After scoring, the results are sorted in descending order of `score`.

That means:

- the first item is the winner or top performer
- models with higher groundedness, lower latency, and longer-but-not-excessive answers usually rank higher
- a model does not need to be fastest to win if its groundedness and retrieval-related signals are strong enough

---

## 7. Practical reading guide

When you look at the leaderboard, read the metrics like this:

- `latency` answers: how fast did the model respond
- `grounded` answers: how much of the response content appears in the supplied context
- `words` answers: how verbose the response was
- `score` answers: the combined ranking value used to compare models

If two models have similar scores, the one with better grounding and slightly lower latency will usually look stronger in the comparison view.

---

## 8. Embedding evaluation for multiple models

The embedding benchmark is a separate evaluation path from the LLM comparison score. It is implemented in [backend/benchmark_embeddings.py](../backend/benchmark_embeddings.py) and exposed through the `/benchmark-embeddings` endpoint in [backend/app.py](../backend/app.py).

### What is being evaluated

The system benchmarks a fixed list of embedding models, including:

- BAAI/bge-large-en-v1.5
- BAAI/bge-base-en-v1.5
- BAAI/bge-small-en-v1.5
- intfloat/e5-large-v2
- intfloat/e5-base-v2
- sentence-transformers/all-mpnet-base-v2
- sentence-transformers/all-MiniLM-L6-v2
- nomic-ai/nomic-embed-text-v1.5
- jinaai/jina-embeddings-v3

If the user does not supply chunks, the benchmark falls back to a small default set of five short reference documents. In the normal app flow, the endpoint pulls chunks from the vector store and trims them to the first five items for speed.

### How the benchmark runs

For each embedding model, the backend performs the same sequence of steps:

1. Load the embedding model using `SentenceTransformer`.
2. Set `trust_remote_code=True` for Jina models so custom code can load correctly.
3. Encode the same document chunks and the same query into vectors.
4. Compute cosine similarity between the query vector and each chunk vector.
5. Project chunk vectors and the query vector into 2D using PCA-style SVD so the frontend can visualize the geometry.
6. Derive a quality score from separation, top similarity, and embedding speed.

This means every model is judged against the exact same input set, so the comparison is fair and repeatable.

### Metrics captured for each embedding model

Each model stores the following measurements:

- `dimensions`: embedding vector width returned by the model
- `load_time`: how long it took to initialize the model
- `embed_time`: how long it took to embed the chunks and query
- `top_similarity`: the highest cosine similarity across the chunks
- `avg_similarity`: average cosine similarity across the chunks
- `separation`: the difference between the top similarity and the average similarity
- `chunk_coords`: 2D coordinates for each chunk after projection
- `query_coord`: 2D coordinate for the query after projection
- `similarities`: raw similarity values for all chunks
- `quality_score`: final score used to compare embedding models

### Similarity calculation

Cosine similarity is calculated between the query embedding and each chunk embedding:

$$
cosine\ similarity = \frac{q \cdot d}{\|q\| \|d\|}
$$

where $q$ is the query vector and $d$ is a document chunk vector.

If either vector has zero magnitude, the similarity is treated as `0.0`.

### Separation score

The benchmark uses the gap between the best-matching chunk and the average chunk score as a rough separation measure:

$$
separation = top\ similarity - average\ similarity
$$

This is useful because a good embedding model should do more than produce high similarities everywhere. It should make the most relevant chunk stand out from the rest.

### Quality score formula

The final embedding quality score is built from three signals:

- separation, weighted by 60
- top similarity, weighted by 30
- embedding speed bonus, weighted by 10

The raw score is computed as:

$$
raw\ score = (separation \times 60) + (top\ similarity \times 30) + \left(\frac{1}{embed\ time + 1}\right) \times 10
$$

That raw score is then rescaled to a 0 to 100 range with:

$$
quality\ score = \min\left(\max\left(\frac{raw\ score \times 100}{70}, 0\right), 100\right)
$$

and rounded to 2 decimal places.

### Why the score works this way

- A larger `top_similarity` means the model better matches the query.
- A larger `separation` means the best chunk is more clearly distinguished from the others.
- A smaller `embed_time` means the model is faster to benchmark and faster to use in practice.

### How the winner is selected

After all models are evaluated, the results are compared by `quality_score`, and the highest-scoring model is selected as the embedding winner.

In background benchmark mode, that winning embedding model name is then injected into the LLM comparison results as `embed_model`, so the downstream analytics can record which embedding model was active for that run.

### What happens on failure

If an embedding model fails to load or encode, the benchmark stores an error entry and assigns `quality_score = 0.0`. This keeps failed candidates at the bottom and makes them easy to spot in the response payload.

### How this differs from the LLM score

The embedding benchmark does not use groundedness, response length, or chat latency. Those are LLM response metrics. Embedding evaluation instead focuses on vector quality, separation, and encoding speed.

---

## 9. 2D semantic clustering projections

The UI section labeled "2D Semantic Clustering Projections" is built from the coordinates produced by the embedding benchmark. In practice, this is not a clustering algorithm like k-means or DBSCAN. It is a 2D dimensionality-reduction projection that lets you see how the query vector sits relative to the document chunk vectors in semantic space.

### Why the projection exists

Embedding vectors often live in a high-dimensional space, which is impossible to inspect directly. The projection compresses those vectors down to 2D so the dashboard can show:

- where the query lands
- which chunks are closest to it
- how tightly the document set clusters around the query
- whether one model produces a cleaner semantic separation than another

### Exact projection pipeline

For each embedding model, the backend performs these steps:

1. Stack all chunk embeddings and the query embedding into one matrix.
2. Compute the column-wise mean of that combined matrix.
3. Subtract the mean from every vector so the data is centered around the origin.
4. Run Singular Value Decomposition on the centered matrix.
5. Keep the first two components and multiply them by the corresponding singular values.
6. Split the result back into `chunk_coords` and `query_coord`.

In compact form:

$$
X = \begin{bmatrix} \text{chunks} \\ \text{query} \end{bmatrix}, \quad
X_c = X - \mu, \quad
X_c = U S V^T
$$

The 2D projection is then taken from the first two singular directions:

$$
Z_{2D} = U_{[:, :2]} \cdot S_{[:2]}
$$

where the last row of $Z_{2D}$ becomes the query point and the earlier rows become the document chunk points.

### Why SVD is used

SVD acts like a PCA-style projection:

- the first component captures the strongest variance direction
- the second component captures the next strongest orthogonal direction
- centering before SVD ensures the plot reflects relative structure, not raw offsets

This gives a stable 2D map for comparing models, even when the original embeddings have hundreds or thousands of dimensions.

### How the UI draws it

The frontend reads the stored coordinates and plots them in a scatter chart:

- the query vector is shown as a highlighted red point
- the document chunks are shown as blue points
- tooltips show the chunk text and its similarity score
- chart axes are hidden so the viewer focuses on relative positions rather than numeric scale

The chart title says "Semantic Clustering" because the visual effect looks like grouped semantic regions, but the underlying math is still a deterministic 2D projection of embeddings.

### How to interpret the plot

- Chunks close to the red query point are semantically more relevant.
- A tight local group of blue points suggests similar chunks in the retrieved context.
- A chunk far away from the query usually has lower similarity.
- Different embedding models may produce different geometry even when they see the same query and chunks.

### Relationship to quality score

The projection itself does not directly create the quality score. It is a visualization of the same vectors that are already used to compute cosine similarity, separation, and final `quality_score`.

---

## 10. Summary

In short:

- Latency is the measured runtime of the model call.
- Groundedness is a unique-word overlap ratio between answer and context.
- Response word count is the number of whitespace-separated words in the answer.
- Overall score is a weighted sum of retrieval, groundedness, inverse latency, and capped response length.
- Embedding evaluation compares multiple embedding models on the same query and chunks, then ranks them by a quality score built from separation, similarity, and embed time.
- The 2D semantic clustering view is a centered SVD projection of chunk and query embeddings into two dimensions for visualization.

This is a lightweight, deterministic scoring system designed for quick model comparison rather than deep semantic evaluation.
