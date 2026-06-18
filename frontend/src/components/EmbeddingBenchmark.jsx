import React, { useState, useEffect } from "react";
import axios from "axios";
import { Scatter, Bar } from "react-chartjs-2";

const EMBEDDING_MODELS_DATA = [
  { name: "BAAI/bge-large-en-v1.5", dim: 1024, rating: 5, label: "Highest accuracy", desc: "Top-tier retrieval accuracy, high computing cost." },
  { name: "BAAI/bge-base-en-v1.5", dim: 768, rating: 5, label: "Best balance", desc: "Optimal tradeoff between speed and performance." },
  { name: "BAAI/bge-small-en-v1.5", dim: 384, rating: 4, label: "Fast CPUs", desc: "Highly optimized for lightweight CPU hosting." },
  { name: "intfloat/e5-large-v2", dim: 1024, rating: 5, label: "Semantic search", desc: "Designed specifically for semantic document search." },
  { name: "intfloat/e5-base-v2", dim: 768, rating: 5, label: "RAG systems", desc: "Optimized RAG query-to-context vector mapping." },
  { name: "sentence-transformers/all-mpnet-base-v2", dim: 768, rating: 4, label: "General purpose", desc: "Broad semantic coverage across domains." },
  { name: "sentence-transformers/all-MiniLM-L6-v2", dim: 384, rating: 4, label: "Very fast", desc: "Super high-speed, tiny memory footprint." },
  { name: "nomic-ai/nomic-embed-text-v1.5", dim: 768, rating: 5, label: "Long documents", desc: "Extremely long context window support." },
  { name: "jinaai/jina-embeddings-v3", dim: 1024, rating: 5, label: "State-of-art retrieval", desc: "Bilingual, code-aware, state-of-the-art embedding." }
];

function EmbeddingBenchmark() {
  const [activeModel, setActiveModel] = useState("nomic-embed-text");
  const [benchmarkQuery, setBenchmarkQuery] = useState("what is quantum key distribution");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchActiveConfig();
  }, []);

  const fetchActiveConfig = () => {
    axios
      .get("http://127.0.0.1:8000/embedding-config")
      .then((res) => {
        if (res.data && res.data.active_model) {
          setActiveModel(res.data.active_model);
        }
      })
      .catch(() => {});
  };

  const handleSetActive = (modelName) => {
    setUpdating(true);
    axios
      .post("http://127.0.0.1:8000/embedding-config", { embedding_model: modelName })
      .then((res) => {
        if (res.data && res.data.status === "success") {
          setActiveModel(modelName);
          setMessage(`Successfully set '${modelName}' as the active RAG embedding model!`);
          setTimeout(() => setMessage(""), 5000);
        }
        setUpdating(false);
      })
      .catch(() => {
        setUpdating(false);
      });
  };

  const runAnalysis = (e) => {
    e.preventDefault();
    if (!benchmarkQuery.trim()) return;

    setLoading(true);
    axios
      .post("http://127.0.0.1:8000/benchmark-embeddings", { query: benchmarkQuery })
      .then((res) => {
        if (res.data && res.data.results) {
          setResults(res.data.results);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  // Build the Quality Comparison Bar Chart
  const barData = {
    labels: EMBEDDING_MODELS_DATA.map((x) => x.name.split("/").pop()),
    datasets: [
      {
        label: "Semantic Representation Score (0-100)",
        data: EMBEDDING_MODELS_DATA.map((m) => {
          const res = results[m.name];
          return res ? res.quality_score : 0;
        }),
        backgroundColor: "rgba(59, 130, 246, 0.65)",
        borderColor: "#3b82f6",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { family: "Outfit" },
        bodyFont: { family: "Plus Jakarta Sans" }
      }
    },
    scales: {
      x: { ticks: { color: "#94a3b8" } },
      y: { ticks: { color: "#94a3b8" }, suggestedMax: 100 }
    }
  };

  // Helper to generate Scatter chart data for a specific model
  const getScatterData = (modelName) => {
    const res = results[modelName];
    if (!res || !res.chunk_coords || !res.query_coord) return null;

    return {
      datasets: [
        {
          label: "Query Vector",
          data: [{ x: res.query_coord[0], y: res.query_coord[1] }],
          backgroundColor: "#ef4444",
          borderColor: "#f87171",
          pointStyle: "rectRot",
          pointRadius: 10,
          pointHoverRadius: 12
        },
        {
          label: "Document Chunks",
          data: res.chunk_coords.map((c, i) => ({
            x: c[0],
            y: c[1],
            similarity: res.similarities[i],
            text: res.chunks[i]
          })),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "#60a5fa",
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    };
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 0) {
              return "Query Target";
            }
            const raw = ctx.raw;
            const textSummary = raw.text.length > 60 ? raw.text.substring(0, 60) + "..." : raw.text;
            return [
              `Similarity: ${Math.round(raw.similarity * 100)}%`,
              `Text: ${textSummary}`
            ];
          }
        }
      }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  return (
    <div className="embedding-workspace">
      {message && <div className="alert alert-success">{message}</div>}

      <div className="compare-input-card glass-card">
        <h3 className="card-title">Embedding Vector Space Analysis</h3>
        <p className="card-subtitle">
          Test semantic separation of document chunks. This will compute multi-model vectors and project them using 2D SVD.
        </p>

        <form onSubmit={runAnalysis} className="compare-form">
          <input
            type="text"
            className="compare-input"
            placeholder="Enter search phrase (e.g. quantum key distribution...)"
            value={benchmarkQuery}
            onChange={(e) => setBenchmarkQuery(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !benchmarkQuery.trim()}>
            {loading ? (
              <span className="loading-spinner-btn">
                <span className="spinner-small"></span> Mapping Space...
              </span>
            ) : (
              "Analyze Semantic Space"
            )}
          </button>
        </form>
      </div>

      {loading && (
        <div className="comparison-loading glass-card" style={{ marginTop: "1.5rem" }}>
          <div className="spinner-large"></div>
          <h4>Mapping High-Dimensional Text Vectors</h4>
          <p>Downloading model components, encoding text chunks, and running Singular Value Decomposition (SVD) projection...</p>
        </div>
      )}

      {!loading && Object.keys(results).length > 0 && (
        <div className="embedding-charts-container" style={{ marginTop: "1.5rem" }}>
          <div className="glass-card chart-card-large" style={{ marginBottom: "1.5rem" }}>
            <h4 className="chart-title">Embedding Quality Separation Ratings</h4>
            <p className="chart-subtitle">Higher score indicates superior query-to-context contrast separation</p>
            <div className="chart-wrapper" style={{ height: "260px", marginTop: "1rem" }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          <h3 className="card-title" style={{ marginBottom: "1rem" }}>2D Semantic Clustering Projections</h3>
          <div className="scatter-plots-grid">
            {EMBEDDING_MODELS_DATA.map((m) => {
              const scatterData = getScatterData(m.name);
              const modelRes = results[m.name];
              if (!scatterData || modelRes.error) return null;

              return (
                <div key={m.name} className="scatter-card glass-card">
                  <div className="scatter-card-header">
                    <span className="scatter-model-title">{m.name.split("/").pop()}</span>
                    <span className="scatter-model-score">Score: {modelRes.quality_score}/100</span>
                  </div>
                  <div className="scatter-canvas-wrapper" style={{ height: "180px", margin: "1rem 0" }}>
                    <Scatter data={scatterData} options={scatterOptions} />
                  </div>
                  <div className="scatter-card-meta">
                    <span>Dim: {m.dim}</span>
                    <span>Top Match: {Math.round(modelRes.top_similarity * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="table-container glass-card" style={{ marginTop: "1.5rem" }}>
        <h3 className="card-title">Embedding Models Directory</h3>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Model Name</th>
              <th>Dimensions</th>
              <th>Best For</th>
              <th>Accuracy Rating</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {EMBEDDING_MODELS_DATA.map((m) => {
              const isActive = activeModel === m.name;
              return (
                <tr key={m.name} className={isActive ? "row-winner" : ""}>
                  <td className="col-model" style={{ paddingBottom: "0.5rem" }}>
                    <div>{m.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "normal", marginTop: "0.15rem" }}>
                      {m.desc}
                    </div>
                  </td>
                  <td>{m.dim}</td>
                  <td>
                    <span className="profile-badge">{m.label}</span>
                  </td>
                  <td style={{ color: "#f59e0b", fontSize: "1rem" }}>
                    {"⭐".repeat(m.rating)}
                  </td>
                  <td>
                    {isActive ? (
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>● Active</span>
                    ) : (
                      <span style={{ color: "var(--text-dark)" }}>Idle</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`btn ${isActive ? "btn-secondary" : "btn-primary"}`}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                      disabled={isActive || updating}
                      onClick={() => handleSetActive(m.name)}
                    >
                      {isActive ? "Activated" : "Set Active"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmbeddingBenchmark;
