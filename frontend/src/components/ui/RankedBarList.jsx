/** items: [{ rank, label, displayValue, pct (0-100), color? }] */
export default function RankedBarList({ items, color = 'var(--accent)' }) {
  return (
    <>
      {items.map((item) => (
        <div className="hbar-row" key={item.rank}>
          <span className="hbar-rank">{item.rank}</span>
          <span className="hbar-label" title={item.label}>
            {item.label}
          </span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${item.pct}%`, background: item.color || color }} />
          </div>
          <span className="hbar-value">{item.displayValue}</span>
        </div>
      ))}
    </>
  );
}
