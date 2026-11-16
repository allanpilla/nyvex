import { useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Menu } from './Menu';

export type SelectOption<T extends string = string> = { value: T; label: ReactNode; text?: string };
type Props<T extends string> = { value: T | null | ''; options: SelectOption<T>[]; onChange: (v: T) => void; placeholder?: string; label: string; invalid?: boolean; disabled?: boolean };

/** Lista curta sem busca (tipo, relação, desfecho). Substitui o <select> nativo; setas navegam, Enter escolhe. */
export function Select<T extends string>({ value, options, onChange, placeholder = 'Selecione…', label, invalid, disabled }: Props<T>) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const cur = options.find((o) => o.value === value);
  const show = () => { setOpen(true); setHi(Math.max(0, options.findIndex((o) => o.value === value))); };
  const pick = (v: T) => { onChange(v); setOpen(false); btn.current?.focus(); };
  return (
    <>
      <button ref={btn} type="button" className={`nx-combo nx-selectbtn${invalid ? ' is-err' : ''}${open ? ' is-open' : ''}`} aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) show(); else setHi((h) => Math.min(options.length - 1, h + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          if (e.key === 'Enter' && open) { e.preventDefault(); e.stopPropagation(); if (options[hi]) pick(options[hi].value); }
        }}>
        <span className={cur ? 'nx-combo__v' : 'nx-combo__ph'}>{cur ? cur.label : placeholder}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && btn.current && (
        <Menu anchor={btn.current} align="left" onClose={() => setOpen(false)} className="nx-combo__menu" width={btn.current.offsetWidth}>
          <div className="nx-combo__list" role="listbox" aria-label={label}>
            {options.map((o, i) => (
              <button key={o.value} type="button" role="option" tabIndex={-1} aria-selected={o.value === value} className={`nx-combo__opt${i === hi ? ' is-hi' : ''}`}
                ref={i === hi ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined} onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}>
                <span>{o.label}</span>
                {o.value === value && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        </Menu>
      )}
    </>
  );
}
