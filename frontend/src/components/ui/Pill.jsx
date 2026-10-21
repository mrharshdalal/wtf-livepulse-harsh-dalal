export default function Pill({ active, onClick, children }) {
  return (
    <button type="button" className={`pill ${active ? 'active' : ''}`.trim()} onClick={onClick}>
      {children}
    </button>
  );
}
