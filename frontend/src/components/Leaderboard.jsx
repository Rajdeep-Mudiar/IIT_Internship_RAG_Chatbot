import React from "react";

function Leaderboard({ results }) {
  if (!results || results.length === 0) {
    return (
      <div className="compare-empty-state glass-card">
        <svg className="compare-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p>No model results compiled yet. Enter a benchmark prompt under "Model Benchmarking" tab to calculate live Leaderboard ranks.</p>
      </div>
    );
  }

  const sorted = [...results].sort((a, b) => b.score - a.score);

  return (
    <div className="table-container glass-card" style={{ padding: "1.5rem" }}>
      <h3 className="card-title" style={{ padding: "0 0 1rem 0", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-light)" }}>
        🏆 Live Performance Leaderboard
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sorted.map((item, index) => (
          <div
            key={index}
            className={`leaderboard-item glass-card ${index === 0 ? "rank-first" : ""}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              background: index === 0 ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.01)",
              border: index === 0 ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--border-light)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: index === 0 ? "#10b981" : "var(--text-muted)",
                  width: "24px"
                }}
              >
                #{index + 1}
              </span>
              <span className="col-model" style={{ fontSize: "1.05rem" }}>
                {item.model}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span
                className="col-score"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  color: index === 0 ? "#10b981" : "#3b82f6"
                }}
              >
                ⭐ {item.score}
              </span>
              {index === 0 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontWeight: "bold"
                  }}
                >
                  Winner
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Leaderboard;
