function ScoreTable({ results }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Model</th>

          <th>Latency</th>

          <th>Grounded</th>

          <th>Words</th>

          <th>Score</th>
        </tr>
      </thead>

      <tbody>
        {results.map((item, index) => (
          <tr key={index}>
            <td>{item.model}</td>

            <td>{item.latency}</td>

            <td>{item.grounded}</td>

            <td>{item.words}</td>

            <td>{item.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ScoreTable;
