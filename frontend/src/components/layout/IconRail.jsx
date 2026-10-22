import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import useStore from '../../store/useStore';
import { HomeIcon, GridIcon, AlertIcon, GearIcon } from './icons';

function railClass({ isActive }) {
  return `rail-icon ${isActive ? 'active' : ''}`.trim();
}

const FLASH_MS = 700;

export default function IconRail() {
  const anomalyCount = useStore((s) => s.anomalyCount);
  const [flashing, setFlashing] = useState(false);
  const prevCount = useRef(anomalyCount);

  useEffect(() => {
    // Flash on increase only (assignment S6.2: "Flash badge count") -- a
    // resolve-driven decrease shouldn't draw the same attention.
    if (anomalyCount > prevCount.current) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), FLASH_MS);
      prevCount.current = anomalyCount;
      return () => clearTimeout(timer);
    }
    prevCount.current = anomalyCount;
  }, [anomalyCount]);

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
          {anomalyCount > 0 && (
            <span className={`badge${flashing ? ' flash' : ''}`}>{anomalyCount > 99 ? '99+' : anomalyCount}</span>
          )}
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
