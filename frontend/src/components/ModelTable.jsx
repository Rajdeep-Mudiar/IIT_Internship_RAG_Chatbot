import React, { useState } from "react";

function ModelTable({ results, winner }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  if (!results || results.length === 0) {
    return (
      <div className="compare-empty-state">
        <svg className="compare-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p>No model comparison data yet. Enter a query above to test LLM parameters.</p>
      </div>
    );
  }

  return (
    <div className="comparison-dashboard">
      {winner && (
        <div className="winner-card glass-card">
          <div className="winner-badge">🏆 Winner Declared</div>
          <h2 className="winner-title">{winner}</h2>
          <p className="winner-desc">
            This model scored the highest based on combined metrics including groundedness, response latency, and retrieval relevance.
          </p>
        </div>
      )}

      <div className="leaderboard-grid">
        {results.map((item, index) => (
          <div key={item.model} className={`leaderboard-card glass-card ${index === 0 ? "rank-first" : ""}`}>
            <div className="card-rank">Rank #{index + 1}</div>
            <h4 className="card-model-name">{item.model}</h4>

            <div className="card-score-badge">
              <span className="score-val">{item.score}</span>
              <span className="score-lbl">Score</span>
            </div>

            <div className="card-stats">
              <div className="stat-row">
                <span className="stat-label">Latency:</span>
                <span className="stat-value">{item.latency}s</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Groundedness:</span>
                <span className="stat-value">{Math.round(item.grounded * 100)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Word Count:</span>
                <span className="stat-value">{item.words} words</span>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-view-answer"
              onClick={() => setSelectedAnswer(item)}
            >
              View Generated Answer
            </button>
          </div>
        ))}
      </div>

      <div className="table-container glass-card">
        <h3 className="card-title">Performance Leaderboard Matrix</h3>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model Name</th>
              <th>Overall Score</th>
              <th>Latency (s)</th>
              <th>Groundedness</th>
              <th>Response Length</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => (
              <tr key={item.model} className={index === 0 ? "row-winner" : ""}>
                <td className="col-rank">#{index + 1}</td>
                <td className="col-model">{item.model}</td>
                <td className="col-score">{item.score}</td>
                <td className="col-latency">{item.latency}s</td>
                <td className="col-grounded">{Math.round(item.grounded * 100)}%</td>
                <td className="col-words">{item.words} words</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedAnswer && (
        <div className="modal-overlay" onClick={() => setSelectedAnswer(null)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedAnswer.model} Response</h3>
              <button className="btn-close" onClick={() => setSelectedAnswer(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="response-text-container">
                <p>{selectedAnswer.answer}</p>
              </div>
              <div className="response-meta-grid">
                <div>
                  <span className="meta-label">Latency:</span>
                  <span className="meta-value">{selectedAnswer.latency} seconds</span>
                </div>
                <div>
                  <span className="meta-label">Groundedness:</span>
                  <span className="meta-value">{Math.round(selectedAnswer.grounded * 100)}%</span>
                </div>
                <div>
                  <span className="meta-label">Length:</span>
                  <span className="meta-value">{selectedAnswer.words} words</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelTable;
