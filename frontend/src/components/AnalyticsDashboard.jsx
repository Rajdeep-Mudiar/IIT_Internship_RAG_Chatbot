import { Bar } from "react-chartjs-2";

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  CategoryScale,

  LinearScale,

  BarElement,

  Title,

  Tooltip,

  Legend,
);

function AnalyticsDashboard({ results }) {
  if (results.length === 0) {
    return null;
  }

  const data = {
    labels: results.map((r) => r.model),

    datasets: [
      {
        label: "Latency (s)",

        data: results.map((r) => r.latency),
      },
    ],
  };

  return (
    <div>
      <h2>Latency Comparison</h2>

      <Bar data={data} />
    </div>
  );
}

export default AnalyticsDashboard;
