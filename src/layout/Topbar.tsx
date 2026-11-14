import { Fragment } from 'react';
import { Kbd } from '../ds/components';
import { CLIENT_NAME, type Screen } from '../navigation';
import { useUi } from '../lib/useUi';

export function Topbar({ screen }: { screen: Screen }) {
  const { setPaletteOpen } = useUi();
  const crumbs = [CLIENT_NAME, screen.group].filter(Boolean) as string[];
  return (
    <div className="nx-top">
      <div className="nx-crumb">
        {crumbs.map((c) => (
          <Fragment key={c}><span>{c}</span><span>/</span></Fragment>
        ))}
        <b>{screen.label}</b>
      </div>
      <button type="button" className="nx-search" onClick={() => setPaletteOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18.03 16.62l4.28 4.28-1.41 1.41-4.28-4.28A9 9 0 1 1 18.03 16.62zm-2-.74A7 7 0 1 0 6.1 15.88a7 7 0 0 0 9.93 0z" fill="currentColor" /></svg>
        <span>Ir para…</span>
        <Kbd>⌘K</Kbd>
      </button>
    </div>
  );
}
