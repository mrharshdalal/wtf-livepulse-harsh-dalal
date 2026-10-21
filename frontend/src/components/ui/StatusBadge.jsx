/** variant: 'warning' | 'critical' | 'resolved' */
export default function StatusBadge({ variant, children }) {
  return <span className={`status-badge ${variant}`}>{children}</span>;
}
