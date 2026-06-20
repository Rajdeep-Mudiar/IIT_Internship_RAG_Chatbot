import React from "react";
import { Bar } from "react-chartjs-2";

function GroundedChart({ results }) {
  if (!results || results.length === 0) {
    return null;
  }

  const data = {
    labels: results.map((x) => x.model),
    datasets: [
      {
        label: "Groundedness Score (%)",
        data: results.map((x) => Math.round(x.grounded * 100)),
        backgroundColor: [
          "rgba(59, 130, 246, 0.65)",  // Blue
          "rgba(16, 185, 129, 0.65)",  // Emerald
          "rgba(245, 158, 11, 0.65)",   // Amber
          "rgba(139, 92, 246, 0.65)",   // Violet
        ],
        borderColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
        ],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        titleFont: { family: "Outfit, system-ui", weight: "bold" },
        bodyFont: { family: "Plus Jakarta Sans, system-ui" },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#94a3b8",
          font: { family: "Outfit, system-ui", size: 11 },
        },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: {
          color: "#94a3b8",
          font: { family: "Plus Jakarta Sans, system-ui" },
        },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  };

  return (
    <div className="chart-card glass-card">
      <h4 className="chart-title">Groundedness Index (%)</h4>
      <p className="chart-subtitle">Higher percentage indicates more overlap with retrieved document source</p>
      <div className="chart-wrapper" style={{ height: "240px", marginTop: "1rem" }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

export default GroundedChart;
