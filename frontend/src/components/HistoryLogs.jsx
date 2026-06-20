import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";

function HistoryLogs() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, []);

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

  if (history.length === 0) {
    return (
      <div className="compare-empty-state glass-card">
        <svg className="compare-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <p>No historical query records found. Use "Model Comparison" to compile historical records.</p>
      </div>
    );
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

  // Build chart datasets for score progression over time
  // To avoid cluttering, we'll label runs as Run #1, Run #2, etc.
  const chartLabels = Array.from({ length: Math.ceil(history.length / 4) }, (_, i) => `Query #${i + 1}`);

  // Separate history by model to trace timelines
  const modelTimelines = {};
  history.forEach((row) => {
    if (!modelTimelines[row.model]) {
      modelTimelines[row.model] = [];
    }
    modelTimelines[row.model].push(row.score);
  });

  const lineColors = {
    "qwen3:latest": "#3b82f6", // Blue
    "phi:latest": "#10b981", // Emerald Green
    "gemma:2b": "#f59e0b", // Amber
    "llama3.2:1b": "#8b5cf6", // Purple
  };

  const distinctPalette = [
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#ef4444", // Red
    "#84cc16", // Lime Green
    "#f97316", // Orange
    "#a855f7", // Purple/Violet
    "#14b8a6", // Teal
    "#6366f1", // Indigo
    "#eab308", // Yellow
    "#f43f5e", // Rose
  ];

  // Dynamically assign unique colors to each model
  const assignedColors = {};
  const usedColors = new Set();
  const modelNames = Object.keys(modelTimelines);

  modelNames.forEach((model) => {
    if (lineColors[model]) {
      assignedColors[model] = lineColors[model];
      usedColors.add(lineColors[model]);
    }
  });

  let paletteIdx = 0;
  modelNames.forEach((model) => {
    if (!assignedColors[model]) {
      while (paletteIdx < distinctPalette.length && usedColors.has(distinctPalette[paletteIdx])) {
        paletteIdx++;
      }
      if (paletteIdx < distinctPalette.length) {
        const selectedColor = distinctPalette[paletteIdx];
        assignedColors[model] = selectedColor;
        usedColors.add(selectedColor);
        paletteIdx++;
      } else {
        let hash = 0;
        for (let i = 0; i < model.length; i++) {
          hash = model.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        assignedColors[model] = `hsl(${hue}, 75%, 60%)`;
      }
    }
  });

  const getBackgroundColor = (color) => {
    if (color.startsWith("hsl")) {
      return color.replace("hsl", "hsla").replace(")", ", 0.12)");
    }
    return color + "20";
  };

  const chartDatasets = modelNames.map((model) => {
    const color = assignedColors[model];
    return {
      label: model,
      data: modelTimelines[model],
      borderColor: color,
      backgroundColor: getBackgroundColor(color),
      tension: 0.3,
      fill: false,
      borderWidth: 2,
      pointRadius: 4,
    };
  });

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

      <div className="timeline-chart-section glass-card">
        <h3 className="card-title">Model Score Evolution Timeline</h3>
        <p className="card-subtitle">Tracking composite score changes across historical comparison logs</p>
        <div className="chart-canvas-wrapper" style={{ height: "320px", marginTop: "1.5rem" }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="table-container glass-card">
        <h3 className="card-title">Complete Historical Comparison Log</h3>
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
    </div>
  );
}

export default HistoryLogs;
