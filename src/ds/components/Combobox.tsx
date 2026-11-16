import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Menu } from './Menu';

export type ComboOption = { value: string; label: string; meta?: string; group?: string };
type Props = { value: string | null; options: ComboOption[]; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string; label: string; invalid?: boolean; disabled?: boolean; render?: (o: ComboOption) => ReactNode };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Seleção com busca (listas longas: tipos, modelos, locais). O próprio campo é digitável e filtra; setas navegam, Enter escolhe. */
export function Combobox({ value, options, onChange, placeholder = 'Selecione…', label, invalid, disabled, render }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const cur = options.find((o) => o.value === value);
  const list = useMemo(() => options.filter((o) => !q || norm(`${o.label} ${o.meta ?? ''}`).includes(norm(q))), [options, q]);
  const show = () => { if (open) return; setOpen(true); setQ(''); setHi(Math.max(0, options.findIndex((o) => o.value === value))); };
  const close = () => { setOpen(false); setQ(''); };
  const pick = (v: string) => { onChange(v); close(); inp.current?.focus(); };
  return (
    <>
      <div ref={box} className={`nx-combo${invalid ? ' is-err' : ''}${open ? ' is-open' : ''}${disabled ? ' is-dis' : ''}`}
        onMouseDown={(e) => { if (e.target !== inp.current) { e.preventDefault(); inp.current?.focus(); } if (open && e.target !== inp.current) close(); else show(); }}>
        <input ref={inp} role="combobox" aria-label={label} aria-expanded={open} aria-autocomplete="list" disabled={disabled}
          value={open ? q : cur?.label ?? ''} placeholder={open && cur ? cur.label : placeholder}
          onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }}
          onBlur={() => setTimeout(() => { if (!document.activeElement?.closest('.nx-combo__menu')) close(); }, 0)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) show(); else setHi((h) => Math.min(list.length - 1, h + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
            if (e.key === 'Enter' && open) { e.preventDefault(); e.stopPropagation(); if (list[hi]) pick(list[hi].value); }
            if (e.key === 'Tab') close();
          }} />
        <Icon name={open ? 'search' : 'chevron'} size={16} />
      </div>
      {open && box.current && (
        <Menu anchor={box.current} align="left" onClose={close} className="nx-combo__menu" width={box.current.offsetWidth}>
          <div className="nx-combo__list" role="listbox" aria-label={label} onMouseDown={(e) => e.preventDefault()}>
            {list.map((o, i) => (
              <button key={o.value} type="button" role="option" tabIndex={-1} aria-selected={o.value === value} className={`nx-combo__opt${i === hi ? ' is-hi' : ''}`}
                ref={i === hi ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined} onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}>
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
