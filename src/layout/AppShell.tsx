import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { findScreen, SCREENS } from '../navigation';
import { useUi } from '../lib/useUi';

/** Casca do app: menu lateral + painel de conteúdo da rota atual. */
export function AppShell() {
  const { collapsed } = useUi();
  const { pathname } = useLocation();
  const screen = findScreen(pathname) ?? SCREENS[1];
  return (
    <div className={`nx-app${collapsed ? ' is-collapsed' : ''}`}>
      <Sidebar />
      <main className="nx-main">
        <section className="nx-panel">
          <Topbar screen={screen} />
          <Outlet />
        </section>
      </main>
      <CommandPalette />
    </div>
  );
}
