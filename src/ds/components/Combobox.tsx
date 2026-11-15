import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Menu } from './Menu';

export type ComboOption = { value: string; label: string; meta?: string; group?: string };
type Props = { value: string | null; options: ComboOption[]; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string; label: string; invalid?: boolean; disabled?: boolean; render?: (o: ComboOption) => ReactNode };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Seleção com busca (listas longas: tipos, modelos, locais). Setas navegam, Enter escolhe. */
export function Combobox({ value, options, onChange, placeholder = 'Selecione…', searchPlaceholder = 'Buscar…', label, invalid, disabled, render }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const cur = options.find((o) => o.value === value);
  const list = useMemo(() => options.filter((o) => !q || norm(`${o.label} ${o.meta ?? ''}`).includes(norm(q))), [options, q]);
  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); btn.current?.focus(); };
  return (
    <>
      <button ref={btn} type="button" className={`nx-combo${invalid ? ' is-err' : ''}${open ? ' is-open' : ''}`} aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled}
        onClick={() => { setOpen(!open); setHi(0); }}>
        <span className={cur ? 'nx-combo__v' : 'nx-combo__ph'}>{cur ? cur.label : placeholder}</span>
        <Icon name="search" size={16} />
      </button>
      {open && btn.current && (
        <Menu anchor={btn.current} align="left" onClose={() => { setOpen(false); setQ(''); }} className="nx-combo__menu" width={btn.current.offsetWidth}>
          <label className="nx-input nx-combo__search">
            <input autoFocus value={q} placeholder={searchPlaceholder} aria-label={searchPlaceholder} onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
                if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi].value); }
              }} />
          </label>
          <div className="nx-combo__list" role="listbox" aria-label={label}>
            {list.map((o, i) => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value} className={`nx-combo__opt${i === hi ? ' is-hi' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}>
                {render ? render(o) : <><span>{o.label}</span>{o.meta && <em>{o.meta}</em>}</>}
                {o.value === value && <Icon name="check" size={14} />}
              </button>
            ))}
            {list.length === 0 && <span className="nx-combo__none">Nada encontrado</span>}
          </div>
        </Menu>
      )}
    </>
  );
}
