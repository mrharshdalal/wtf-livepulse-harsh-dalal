export default function Modal({
  icon,
  iconVariant = 'accent',
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {icon && <div className={`modal-icon att-icon ${iconVariant}`}>{icon}</div>}
        <div className="modal-title">{title}</div>
        {description && <div className="modal-desc">{description}</div>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn filled" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
