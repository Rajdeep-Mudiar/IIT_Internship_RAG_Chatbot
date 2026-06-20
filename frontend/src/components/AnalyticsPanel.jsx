import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";

function AnalyticsPanel() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-Time Broadcast Analysis state
  const [analyzeQuery, setAnalyzeQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [metricsResult, setMetricsResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    axios
      .get("http://127.0.0.1:8000/analytics")
      .then((res) => {
        setHistory(res.data.results || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load historical analytics. Make sure backend port 8000 is open.");
        setLoading(false);
      });
  };

  const runAnalysis = (e) => {
    e.preventDefault();
    if (!analyzeQuery.trim()) return;

    setAnalyzing(true);
    setAnalyzeError("");
    setMetricsResult(null);

    axios
      .post("http://127.0.0.1:8000/metrics", {
        question: analyzeQuery,
      })
      .then((res) => {
        setMetricsResult(res.data);
        setAnalyzing(false);
      })
      .catch((err) => {
        setAnalyzeError("Failed to fetch broadcast metrics. Make sure RAG has documents indexed.");
        setAnalyzing(false);
      });
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Loading historical analytics database...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  // Calculate aggregate stats per model
  const stats = {};
  history.forEach((row) => {
    const model = row.model;
    if (!stats[model]) {
      stats[model] = {
        name: model,
        runs: 0,
        totalLatency: 0,
        totalGrounded: 0,
        totalScore: 0,
      };
    }
    stats[model].runs += 1;
    stats[model].totalLatency += parseFloat(row.latency || 0);
    stats[model].totalGrounded += parseFloat(row.grounded || 0);
    stats[model].totalScore += parseFloat(row.score || 0);
  });

  const aggregateData = Object.values(stats).map((m) => ({
    model: m.name,
    runs: m.runs,
    avgLatency: (m.totalLatency / m.runs).toFixed(2),
    avgGrounded: Math.round((m.totalGrounded / m.runs) * 100),
    avgScore: (m.totalScore / m.runs).toFixed(1),
  }));

  const chartLabels = Array.from({ length: Math.ceil(history.length / 4) }, (_, i) => `Query #${i + 1}`);

  const modelTimelines = {};
  history.forEach((row) => {
    if (!modelTimelines[row.model]) {
      modelTimelines[row.model] = [];
    }
    modelTimelines[row.model].push(row.score);
  });

  const lineColors = {
    "qwen3:latest": "#3b82f6",
    "phi:latest": "#10b981",
    "gemma:2b": "#f59e0b",
    "llama3.2:1b": "#8b5cf6",
  };

  const chartDatasets = Object.keys(modelTimelines).map((model) => ({
    label: model,
    data: modelTimelines[model],
    borderColor: lineColors[model] || "#ec4899",
    backgroundColor: (lineColors[model] || "#ec4899") + "20",
    tension: 0.3,
    fill: false,
    borderWidth: 2,
    pointRadius: 4,
  }));

  const chartData = {
    labels: chartLabels,
    datasets: chartDatasets,
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#94a3b8",
          font: { family: "Outfit, system-ui" },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#94a3b8" },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#94a3b8" },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  };

  return (
    <div className="historical-dashboard">
      {history.length > 0 && (
        <div className="stats-strip">
          {aggregateData.map((m) => (
            <div key={m.model} className="stat-card glass-card">
              <h4 className="stat-card-title">{m.model}</h4>
              <div className="stat-grid-inner">
                <div className="metric-box">
                  <span className="metric-val">{m.avgScore}</span>
                  <span className="metric-lbl">Avg Score</span>
                </div>
                <div className="metric-box">
                  <span className="metric-val">{m.avgLatency}s</span>
                  <span className="metric-lbl">Avg Latency</span>
                </div>
                <div className="metric-box">
                  <span className="metric-val">{m.avgGrounded}%</span>
                  <span className="metric-lbl">Avg Grounded</span>
                </div>
              </div>
              <div className="run-count">Based on {m.runs} comparison runs</div>
            </div>
          ))}
        </div>
      )}

      {/* Real-Time Broadcast Analyzer Section */}
      <div className="broadcast-analyzer-section glass-card" style={{ marginBottom: "2rem" }}>
        <h3 className="card-title">Real-Time Broadcast Context Analyzer</h3>
        <p className="card-subtitle">
          Query relevant parts of the indexed document/audio context to extract rich speaking speed, named entities, topic tag, sentiment, readability index, emotion, and toxicity metrics.
        </p>
        
        <form onSubmit={runAnalysis} className="compare-form" style={{ marginTop: "1.2rem", display: "flex", gap: "1rem" }}>
          <input
            type="text"
            className="compare-input"
            placeholder="Enter search prompt or topic to pull context and analyze (e.g. quantum cryptography, transmission channel)..."
            value={analyzeQuery}
            onChange={(e) => setAnalyzeQuery(e.target.value)}
            disabled={analyzing}
            style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
          />
          <button type="submit" className="btn btn-primary" disabled={analyzing || !analyzeQuery.trim()}>
            {analyzing ? "Analyzing..." : "Analyze Broadcast"}
          </button>
        </form>

        {analyzeError && <div className="alert alert-danger" style={{ marginTop: "1rem" }}>{analyzeError}</div>}

        {metricsResult && (
          <div className="metrics-results-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem", marginTop: "1.8rem" }}>
            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Broadcasting Topic</span>
              <h4 style={{ margin: "0.5rem 0 0 0", color: "#a855f7", fontSize: "1.1rem", fontWeight: 600 }}>{metricsResult.topic}</h4>
            </div>
            
            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Volume & Delivery Speed</span>
              <h4 style={{ margin: "0.5rem 0 0 0", color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>{metricsResult.total_words} words ({metricsResult.speaking_speed})</h4>
            </div>

            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Readability & Time</span>
              <h4 style={{ margin: "0.5rem 0 0 0", color: "#10b981", fontSize: "1.1rem", fontWeight: 600 }}>{metricsResult.readability} ({metricsResult.reading_time})</h4>
            </div>

            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sentiment & Tone</span>
              <h4 style={{ margin: "0.5rem 0 0 0", fontSize: "1.1rem", fontWeight: 600 }}>
                <span style={{ color: metricsResult.sentiment === "Positive" ? "#10b981" : metricsResult.sentiment === "Negative" ? "#f87171" : "#fbbf24" }}>{metricsResult.sentiment}</span>
                {" / "}
                <span style={{ color: "#ec4899" }}>{metricsResult.emotion}</span>
              </h4>
            </div>

            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Toxicity Risk</span>
              <h4 style={{ margin: "0.5rem 0 0 0", color: metricsResult.toxicity === "High" ? "#f87171" : metricsResult.toxicity === "Medium" ? "#fbbf24" : "#10b981", fontSize: "1.1rem", fontWeight: 600 }}>{metricsResult.toxicity} Risk</h4>
            </div>

            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", gridColumn: "span 2", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Entities & Key Keywords</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.6rem" }}>
                {metricsResult.keywords.map(kw => (
                  <span key={kw} style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(59,130,246,0.2)" }}>#{kw}</span>
                ))}
                {metricsResult.named_entities.map(ne => (
                  <span key={ne} style={{ background: "rgba(168,85,247,0.15)", color: "#d8b4fe", fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(168,85,247,0.2)" }}>@{ne}</span>
                ))}
                {metricsResult.keywords.length === 0 && metricsResult.named_entities.length === 0 && (
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>No active markers identified</span>
                )}
              </div>
            </div>

            <div className="metric-result-card" style={{ background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", gridColumn: "span 3", backdropFilter: "blur(5px)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Broadcast Summary Description</span>
              <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.95rem", color: "#cbd5e1", lineHeight: "1.5", fontStyle: "italic" }}>
                "{metricsResult.summary || "No contextual sentences available for automatic compilation."}"
              </p>
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <>
          <div className="timeline-chart-section glass-card" style={{ marginBottom: "2rem" }}>
            <h3 className="card-title">Model Score Evolution Timeline</h3>
            <p className="card-subtitle">Tracking composite score changes across historical comparison logs</p>
            <div className="chart-canvas-wrapper" style={{ height: "320px", marginTop: "1.5rem" }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="table-container glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "1rem", paddingRight: "1rem" }}>
              <div>
                <h3 className="card-title" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>Complete Historical Comparison Log</h3>
                <p className="card-subtitle" style={{ margin: 0 }}>Export logs generated during Multi-LLM evaluations</p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.open("http://127.0.0.1:8000/download-csv")}
                  style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", height: "fit-content" }}
                >
                  📥 Export CSV
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => window.open("http://127.0.0.1:8000/download-pdf")}
                  style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", height: "fit-content" }}
                >
                  📄 Download PDF Report
                </button>
              </div>
            </div>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Model</th>
                  <th>Embedding Model</th>
                  <th>Latency</th>
                  <th>Groundedness</th>
                  <th>Words</th>
                  <th>Score</th>
                  <th>Snippet Summary</th>
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().map((item, idx) => (
                  <tr key={idx}>
                    <td>#{history.length - idx}</td>
                    <td className="col-model">{item.model}</td>
                    <td className="col-embed" title={item.embed_model}>
                      {item.embed_model ? item.embed_model.split('/').pop() : "Unknown"}
                    </td>
                    <td>{item.latency}s</td>
                    <td>{Math.round(item.grounded * 100)}%</td>
                    <td>{item.words}</td>
                    <td className="col-score">{item.score}</td>
                    <td className="col-answer" title={item.answer}>
                      {item.answer.length > 50 ? item.answer.substring(0, 50) + "..." : item.answer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsPanel;
