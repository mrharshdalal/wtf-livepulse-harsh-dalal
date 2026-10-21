export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="title">{title}</div>
      {description && <div className="desc">{description}</div>}
    </div>
  );
}
