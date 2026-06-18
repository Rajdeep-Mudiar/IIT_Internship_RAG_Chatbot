import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import UploadBox from "../components/UploadBox";
import ChatBox from "../components/ChatBox";
import ModelTable from "../components/ModelTable";
import HistoryLogs from "../components/HistoryLogs";
import ScoreChart from "../components/ScoreChart";
import LatencyChart from "../components/LatencyChart";
import GroundedChart from "../components/GroundedChart";
import LengthChart from "../components/LengthChart";
import EmbeddingBenchmark from "../components/EmbeddingBenchmark";
import axios from "axios";

function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const [compareQuery, setCompareQuery] = useState("");
  const [results, setResults] = useState([]);
  const [winner, setWinner] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const triggerCompare = (e) => {
    e.preventDefault();
    if (!compareQuery.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);
    setWinner("");

    axios
      .post("http://127.0.0.1:8000/compare", {
        question: compareQuery,
      })
      .then((res) => {
        if (res.data.status === "error") {
          setError(res.data.message || "Failed to complete model comparison.");
          setLoading(false);
        } else {
          setResults(res.data.results || []);
          setWinner(res.data.winner || "");
          setLoading(false);
        }
      })
      .catch((err) => {
        setError("Failed to communicate with backend. Check if port 8000 is running and active.");
        setLoading(false);
      });
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "chat":
        return "RAG Search Terminal";
      case "compare":
        return "Model Benchmarking Workbench";
      case "embedding":
        return "Vector Space & Embedding Benchmark";
      case "history":
        return "Historical Analytics Hub";
      default:
        return "Dashboard";
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <header className="main-header">
          <div className="header-meta">
            <h1 className="page-title">{getTabTitle()}</h1>
            <p className="page-subtitle">
              {activeTab === "chat" && "Upload local source documents and query knowledge through ChromaDB vectors."}
              {activeTab === "compare" && "Compare responses, latencies, and word counts of multiple local LLMs."}
              {activeTab === "embedding" && "Benchmark 9 semantic embedding models and project their vector clustering maps in 2D."}
              {activeTab === "history" && "Examine historical scoring logs, timeline evolutions, and model metrics."}
            </p>
          </div>
          <div className="user-profile">
            <span className="profile-badge">Admin Panel</span>
          </div>
        </header>

        <div className="content-container">
          {activeTab === "chat" && (
            <div className="grid-two-columns">
              <UploadBox />
              <ChatBox />
            </div>
          )}

          {activeTab === "compare" && (
            <div className="compare-workspace">
              <div className="compare-input-card glass-card">
                <h3 className="card-title">Run Benchmark Query</h3>
                <p className="card-subtitle">
                  This action triggers parallel model querying across Qwen3, Phi, Gemma, and Llama, logging results into the analytics database.
                </p>

                <form onSubmit={triggerCompare} className="compare-form">
                  <input
                    type="text"
                    className="compare-input"
                    placeholder="Enter benchmark prompt (e.g., Explain the core message of the document in one sentence...)"
                    value={compareQuery}
                    onChange={(e) => setCompareQuery(e.target.value)}
                    disabled={loading}
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading || !compareQuery.trim()}>
                    {loading ? (
                      <span className="loading-spinner-btn">
                        <span className="spinner-small"></span> Benchmarking...
                      </span>
                    ) : (
                      "Compare Models"
                    )}
                  </button>
                </form>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading && (
                <div className="comparison-loading glass-card">
                  <div className="spinner-large"></div>
                  <h4>Benchmarking Active Models</h4>
                  <p>Querying local LLMs through Ollama, evaluating groundedness, and compiling leaderboard scores...</p>
                </div>
              )}

              {!loading && results.length > 0 && (
                <>
                  <ModelTable results={results} winner={winner} />

                  <div className="charts-grid">
                    <ScoreChart results={results} />
                    <LatencyChart results={results} />
                    <GroundedChart results={results} />
                    <LengthChart results={results} />
                  </div>
                </>
              )}

              {!loading && results.length === 0 && !error && (
                <div className="compare-empty-state glass-card">
                  <svg className="compare-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <p>Enter a prompt above to compile real-time latency and accuracy charts.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "embedding" && <EmbeddingBenchmark />}

          {activeTab === "history" && <HistoryLogs />}
        </div>
      </main>
    </div>
  );
}

export default Home;
