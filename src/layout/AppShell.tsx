import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SearchPalette } from '../search/SearchPalette';
import { useUi } from '../lib/useUi';

/** Casca do app: menu lateral + painel de conteúdo da rota atual. */
export function AppShell() {
  const { collapsed } = useUi();
  return (
    <div className={`nx-app${collapsed ? ' is-collapsed' : ''}`}>
      <Sidebar />
      <main className="nx-main">
        <section className="nx-panel">
          <Outlet />
        </section>
      </main>
      <SearchPalette />
    </div>
  );
}
