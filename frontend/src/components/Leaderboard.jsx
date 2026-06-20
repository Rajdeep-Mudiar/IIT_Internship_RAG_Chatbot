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

  // Sort by score descending (highest score is winner), then by latency ascending in case of a tie
  const sorted = [...results].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return parseFloat(a.latency) - parseFloat(b.latency);
  });

  const winner = sorted[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Dynamic Battle Winner Announcement Banner */}
      <div
        className="winner-card glass-card"
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          padding: "1.5rem",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#10b981",
              fontWeight: "bold",
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.25rem"
            }}
          >
            🏆 Battle Winner Declared
          </div>
          <h2 style={{ fontSize: "1.8rem", margin: 0, fontWeight: "800", color: "#ffffff" }}>
            {winner.model}
          </h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
            Leading the leaderboard with a composite score of <strong>{winner.score}</strong> and response time of <strong>{winner.latency}s</strong>.
          </p>
        </div>
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            padding: "1rem 1.5rem",
            borderRadius: "10px",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            textAlign: "center",
            minWidth: "120px",
            zIndex: 1
          }}
        >
          <span style={{ display: "block", fontSize: "0.75rem", color: "#a7f3d0", textTransform: "uppercase" }}>Grounded Score</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "#10b981" }}>{winner.score}</span>
        </div>
      </div>

      {/* AI Model Battle Matrix Table */}
      <div className="table-container glass-card" style={{ padding: "1.5rem", borderRadius: "12px" }}>
        <h3 className="card-title" style={{ padding: "0 0 1rem 0", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-light)", fontSize: "1.2rem", fontWeight: "700" }}>
          🤖 AI Model Battle Matrix
        </h3>
        <table className="comparison-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontWeight: "600" }}>Rank</th>
              <th style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontWeight: "600" }}>Model</th>
              <th style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontWeight: "600" }}>Latency</th>
              <th style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontWeight: "600" }}>Score</th>
              <th style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontWeight: "600", textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, index) => {
              const isWinner = index === 0;
              return (
                <tr
                  key={index}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: isWinner ? "rgba(16, 185, 129, 0.05)" : "transparent",
                    transition: "background 0.2s ease"
                  }}
                >
                  <td style={{ padding: "1rem", fontWeight: "700", color: isWinner ? "#10b981" : "#64748b" }}>
                    #{index + 1}
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "600", color: "#ffffff" }}>
                    {item.model}
                  </td>
                  <td style={{ padding: "1rem", color: "#cbd5e1" }}>
                    {item.latency}s
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "700", color: isWinner ? "#10b981" : "#3b82f6" }}>
                    {item.score}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right" }}>
                    {isWinner ? (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "4px",
                          fontWeight: "bold",
                          letterSpacing: "0.05em"
                        }}
                      >
                        Winner
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          background: "rgba(255,255,255,0.05)",
                          color: "#94a3b8",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "4px",
                          fontWeight: "bold"
                        }}
                      >
                        Contender
                      </span>
                    )}
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

export default Leaderboard;
