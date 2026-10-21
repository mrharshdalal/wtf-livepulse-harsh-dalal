/**
 * The recurring "icon chip + title + description + pill + action" row
 * pattern -- shared by the Dashboard Activity Feed and the Anomalies list.
 * variant: 'ok' | 'neutral' | 'accent' | 'warn' | 'crit' (icon chip color)
 * action: { label, onClick, disabled } -- if present, replaces the time column.
 */
export default function AttentionRow({ icon, variant = 'neutral', title, desc, pill, time, action }) {
  return (
    <div className="att-row">
      <div className={`att-icon ${variant}`}>{icon}</div>
      <div className="att-main">
        <div className="att-title">{title}</div>
        {desc && <div className="att-desc">{desc}</div>}
      </div>
      {pill && <div className="att-pill">{pill}</div>}
      {action ? (
        <button type="button" className="att-action" onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </button>
      ) : (
        time && <div className="att-time">{time}</div>
      )}
    </div>
  );
}
