/**
 * segments: [{ width: number (0-100), color: string }]
 * legend: [{ label: string, color: string }]
 */
export default function SegmentedBar({ segments, legend }) {
  return (
    <>
      <div className="seg-track">
        {segments.map((s, i) => (
          <div key={i} className="seg" style={{ width: `${s.width}%`, background: s.color }} />
        ))}
      </div>
      {legend && (
        <div className="seg-legend">
          {legend.map((l, i) => (
            <span key={i} className="sw">
              <span className="dot" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
