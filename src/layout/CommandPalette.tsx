import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Kbd, NavItem } from '../ds/components';
import { CLIENT_NAME, SCREENS } from '../navigation';
import { useUi } from '../lib/useUi';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUi();
  if (!paletteOpen) return null;
  return <Palette onClose={() => setPaletteOpen(false)} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const n = norm(q.trim());
    return SCREENS.filter((i) => !n || norm(`${i.label} ${i.group ?? ''}`).includes(n));
  }, [q]);

  useEffect(() => {
    listRef.current?.querySelector('.is-sel')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    navigate(r.path);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') go(sel);
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="nx-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nx-pal" role="dialog" aria-label="Comando">
        <div className="nx-pal__in">
          <Icon name="cmd" />
          <input
            autoFocus
            placeholder="Ir para uma tela…"
            autoComplete="off"
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKey}
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="nx-pal__list" ref={listRef}>
          {results.length === 0 ? (
            <div className="nx-pal__empty">Nenhuma tela com “{q}”</div>
          ) : (
            <>
              <div className="nx-pal__sec">Ir para · {CLIENT_NAME} Campus Seguro</div>
              {results.map((r, k) => (
                <NavItem
                  key={r.id}
                  icon={r.icon}
                  label={r.label}
                  selected={k === sel}
                  onMouseMove={() => k !== sel && setSel(k)}
                  onClick={() => go(k)}
                  trailing={r.group ? <span className="nx-pal__grp">{r.group}</span> : undefined}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
