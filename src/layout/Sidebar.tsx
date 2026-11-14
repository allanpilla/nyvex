import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Icon, IconButton, NavItem, useTooltip, useTooltipApi } from '../ds/components';
import { MAPS, NAV, type Screen } from '../navigation';
import { isNarrow, useUi } from '../lib/useUi';
import { UserMenu } from './UserMenu';
import { useState } from 'react';

function SideItem({ screen, active }: { screen: Screen; active: boolean }) {
  const { collapsed, setCollapsed } = useUi();
  const navigate = useNavigate();
  const tip = useTooltip(screen.label, undefined, collapsed);
  return (
    <NavItem
      icon={screen.icon}
      label={screen.label}
      count={screen.count}
      active={active}
      {...tip}
      onClick={() => {
        navigate(screen.path);
        if (isNarrow()) setCollapsed(true);
      }}
    />
  );
}

export function Sidebar() {
  const { collapsed, setCollapsed, theme, toggleTheme, setPaletteOpen } = useUi();
  const { pathname } = useLocation();
  const { hide } = useTooltipApi();
  const [userOpen, setUserOpen] = useState(false);
  const themeLabel = theme === 'light' ? 'Tema claro' : 'Tema escuro';
  const cmdTip = useTooltip('Comando', '⌘K', collapsed);
  const themeTip = useTooltip(themeLabel, undefined, collapsed);
  const userTip = useTooltip('Nome do usuário', undefined, collapsed && !userOpen);

  const toggle = (c: boolean) => {
    hide();
    setCollapsed(c);
  };

  return (
    <aside className="nx-sb" aria-label="Menu principal">
      <div className="nx-sb__hdr">
        <Icon name="brand" className="nx-sb__logo" size={null} />
        <IconButton icon="fold" label="Recolher menu" shortcut="[" className="nx-sb__fold" onClick={() => toggle(true)} />
        <IconButton icon="unfold" label="Expandir menu" shortcut="[" className="nx-sb__unfold" onClick={() => toggle(false)} />
      </div>

      <nav className="nx-sb__scroll" onScroll={hide}>
        {NAV.map((g, i) => (
          <div className={`nx-sb__grp${g.title ? '' : ' nx-sb__grp--first'}`} key={g.title ?? i}>
            {g.title && <div className="nx-sb__grp-title">{g.title}</div>}
            {g.items.map((it) => (
              <SideItem key={it.id} screen={it} active={pathname === it.path} />
            ))}
          </div>
        ))}
      </nav>

      <div className="nx-sb__foot">
        <SideItem screen={MAPS} active={pathname === MAPS.path} />
        <NavItem icon="cmd" label="Comando" trailing={<span className="nx-count">⌘K</span>} {...cmdTip} onClick={() => { hide(); setPaletteOpen(true); }} className="nx-sb__cmd" />
        <NavItem icon={theme === 'light' ? 'sun' : 'moon'} label={themeLabel} {...themeTip} onClick={toggleTheme} />
        <div className="nx-sb__div" />
        <div className="nx-sb__user-wrap">
          <button
            type="button"
            className="nx-sb__user"
            aria-haspopup="menu"
            aria-expanded={userOpen}
            {...userTip}
            onClick={(e) => { e.stopPropagation(); hide(); setUserOpen((o) => !o); }}
          >
            <Avatar initials="AF" online />
            <span className="nx-sb__who">
              <b>Nome do usuário</b>
              <span>Administrador · Operacional</span>
            </span>
            <Icon name="updown" className="nx-sb__updown" />
          </button>
          {userOpen && <UserMenu onClose={() => setUserOpen(false)} />}
        </div>
      </div>
    </aside>
  );
}
