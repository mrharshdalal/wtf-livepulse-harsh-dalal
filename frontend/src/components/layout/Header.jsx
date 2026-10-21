import { useWebSocketContext } from '../../hooks/WebSocketProvider';

/** Shared breadcrumb + title + subtitle + right-aligned content header,
 * used identically across Dashboard/Analytics/Anomalies. Always ends
 * with a live-connection indicator on the right. */
export default function Header({ breadcrumb, title, subtitle, children }) {
  const { connected } = useWebSocketContext();

  return (
    <>
      <div className="breadcrumb">
        Home &gt; <b>{breadcrumb}</b>
      </div>
      <div className="header-row">
        <div className="header-left">
          <h1>{title}</h1>
          {subtitle && <div className="header-sub">{subtitle}</div>}
        </div>
        <div className="header-right">
          {children}
          <div className="live-chip">
            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </div>
    </>
  );
}
