// TODO: wire up to /api/anomalies via useAnomalies and support dismiss action.
const COLUMNS = ['Gym Name', 'Anomaly Type', 'Severity', 'Time Detected', 'Status'];

export default function Anomalies() {
  return (
    <div>
      <h1>Anomalies</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col} style={{ textAlign: 'left', color: 'var(--text-muted)', padding: 8 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={COLUMNS.length} className="skeleton-card" style={{ display: 'table-cell' }}>
              Loading anomalies…
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
