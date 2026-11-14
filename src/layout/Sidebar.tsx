import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Icon, IconButton, NavItem, useTooltip, useTooltipApi } from '../ds/components';
import { MAPS, NAV, type NavGroup, type Screen } from '../navigation';
import { isNarrow, useUi } from '../lib/useUi';
import { UserMenu } from './UserMenu';
import { useEffect, useRef, useState } from 'react';

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

/** Grupo em accordeon (menu aberto). */
function GroupSection({ group, open, onToggle, pathname }: { group: NavGroup; open: boolean; onToggle: () => void; pathname: string }) {
  const hasActive = group.items.some((i) => i.path === pathname);
  return (
    <div className={`nx-sb__grp${open ? ' is-open' : ''}`}>
      <button type="button" className={`nx-sb__grp-title${hasActive && !open ? ' has-active' : ''}`} aria-expanded={open} onClick={onToggle}>
        <span>{group.title}</span>
        <Icon name="chevron" size={16} className="nx-sb__chev" />
      </button>
      <div className="nx-sb__grp-items" hidden={!open}>
        {group.items.map((it) => (
          <SideItem key={it.id} screen={it} active={pathname === it.path} />
        ))}
      </div>
    </div>
  );
}

/** Ícone do grupo (menu fechado). Ao clicar, abre o submenu flutuante ao lado. */
function GroupIcon({ group, pathname, openId, setOpenId }: { group: NavGroup; pathname: string; openId: string | null; setOpenId: (id: string | null) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const isOpen = openId === group.id;
  const tip = useTooltip(group.title, undefined, !isOpen);
  const { hide } = useTooltipApi();
  const active = group.items.some((i) => i.path === pathname);
  const alert = group.items.find((i) => i.count);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const r = ref.current!.getBoundingClientRect();
    const maxY = window.innerHeight - (group.items.length * 33 + 52) - 8;
    setPos({ x: r.right + 10, y: Math.max(8, Math.min(r.top - 4, maxY)) });
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !document.querySelector('.nx-flyout')?.contains(t)) setOpenId(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [isOpen, group.items.length, setOpenId]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`nx-item nx-sb__gicon${isOpen ? ' is-sel' : ''}`}
        aria-current={active ? 'page' : undefined}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={group.title}
        {...tip}
        onClick={() => { hide(); setOpenId(isOpen ? null : group.id); }}
      >
        <Icon name={group.icon} className="nx-item__ic" />
        {alert && <span className="nx-item__dot" />}
      </button>
      {isOpen && pos && (
        <div className="nx-flyout" role="menu" aria-label={group.title} style={{ left: pos.x, top: pos.y }}>
          <div className="nx-flyout__title">{group.title}</div>
          {group.items.map((it) => (
            <NavItem
              key={it.id}
              role="menuitem"
              icon={it.icon}
              label={it.label}
              count={it.count}
              active={pathname === it.path}
              onClick={() => { navigate(it.path); setOpenId(null); }}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function Sidebar() {
  const { collapsed, setCollapsed, theme, toggleTheme, setPaletteOpen } = useUi();
  const { pathname } = useLocation();
  const { hide } = useTooltipApi();
  const [userOpen, setUserOpen] = useState(false);
  // Accordeon: grupos abertos (começa pelo padrão de cada grupo; o grupo da tela atual sempre abre).
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(NAV.filter((g) => g.defaultOpen).map((g) => g.id)));
  const [flyout, setFlyout] = useState<string | null>(null);
  useEffect(() => {
    const g = NAV.find((x) => x.items.some((i) => i.path === pathname));
    if (g) setOpenGroups((prev) => (prev.has(g.id) ? prev : new Set(prev).add(g.id)));
  }, [pathname]);
  useEffect(() => { if (!collapsed) setFlyout(null); }, [collapsed]);
  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const themeLabel = theme === 'light' ? 'Tema claro' : 'Tema escuro';
  const searchTip = useTooltip('Buscar', '⌘K', collapsed);
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

      <div className="nx-sb__search">
        <NavItem icon="search" label="Buscar" trailing={<span className="nx-count">⌘K</span>} {...searchTip} onClick={() => { hide(); setPaletteOpen(true); }} />
      </div>

      <nav className="nx-sb__scroll" onScroll={hide}>
        {collapsed
          ? NAV.map((g) => <GroupIcon key={g.id} group={g} pathname={pathname} openId={flyout} setOpenId={setFlyout} />)
          : NAV.map((g) => (
              <GroupSection key={g.id} group={g} pathname={pathname} open={openGroups.has(g.id)} onToggle={() => toggleGroup(g.id)} />
            ))}
      </nav>

      <div className="nx-sb__foot">
        <SideItem screen={MAPS} active={pathname === MAPS.path} />
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
