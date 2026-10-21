import { NavLink } from 'react-router-dom';
import useStore from '../../store/useStore';
import { HomeIcon, GridIcon, AlertIcon, GearIcon } from './icons';

function railClass({ isActive }) {
  return `rail-icon ${isActive ? 'active' : ''}`.trim();
}

export default function IconRail() {
  const anomalyCount = useStore((s) => s.anomalyCount);

  return (
    <nav className="rail">
      <NavLink to="/" className="rail-logo" aria-label="WTF LivePulse">
        W
      </NavLink>
      <div className="rail-icons">
        <NavLink to="/" end className={railClass} title="Dashboard">
          <HomeIcon />
        </NavLink>
        <NavLink to="/analytics" className={railClass} title="Analytics">
          <GridIcon />
        </NavLink>
        <NavLink to="/anomalies" className={railClass} title="Anomalies">
          <AlertIcon />
          {anomalyCount > 0 && <span className="badge">{anomalyCount > 99 ? '99+' : anomalyCount}</span>}
        </NavLink>
      </div>
      <div className="rail-bottom">
        <div className="rail-icon" style={{ width: 34, height: 34 }} title="Settings">
          <GearIcon />
        </div>
        <div className="rail-avatar" title="Account" />
      </div>
    </nav>
  );
}
