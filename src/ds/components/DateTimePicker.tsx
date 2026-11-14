import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/** Valor no formato "AAAA-MM-DDTHH:mm" (o mesmo do input datetime-local). */
type Props = { label: string; value: string; onChange: (v: string) => void; max?: string };

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const parse = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? new Date() : d; };
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Seletor de data e hora do DS: calendário + colunas de hora e minuto. */
export function DateTimePicker({ label, value, onChange, max }: Props) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const d = parse(value);
  return (
    <div className="nx-dtp">
      <span className="nx-dtp__label">{label}</span>
      <button ref={btn} type="button" className={`nx-dtp__field${open ? ' is-open' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="calendar" size={16} />
        <span>{pad(d.getDate())}/{pad(d.getMonth() + 1)}/{d.getFullYear()}</span>
        <span className="nx-dtp__sep" />
        <span>{pad(d.getHours())}:{pad(d.getMinutes())}</span>
      </button>
      {open && btn.current && <Pop anchor={btn.current} value={d} max={max ? parse(max) : undefined} onChange={(n) => onChange(fmt(n))} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Pop({ anchor, value, max, onChange, onClose }: { anchor: HTMLElement; value: Date; max?: Date; onChange: (d: Date) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const r = anchor.getBoundingClientRect();
  const today = new Date();
  const hRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [anchor, onClose]);

  // Centraliza hora e minuto escolhidos nas colunas ao abrir.
  useLayoutEffect(() => {
    for (const el of [hRef.current, mRef.current]) {
      const on = el?.querySelector<HTMLElement>('.is-on');
      if (el && on) el.scrollTop = on.offsetTop - el.clientHeight / 2 + on.clientHeight / 2;
    }
  }, []);

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x; });
  const set = (fn: (n: Date) => void) => { const n = new Date(value); fn(n); onChange(max && n > max ? max : n); };
  const shift = (m: number) => setView(new Date(view.getFullYear(), view.getMonth() + m, 1));

  return createPortal(
    <div ref={ref} className="nx-dtp__pop" role="dialog" aria-label="Escolher data e hora" style={{ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 420) }}>
      <div className="nx-dtp__cal">
        <div className="nx-dtp__head">
          <b>{MONTHS[view.getMonth()][0].toUpperCase() + MONTHS[view.getMonth()].slice(1)} de {view.getFullYear()}</b>
          <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)}><Icon name="arrowLeft" size={16} /></button>
          <button type="button" aria-label="Próximo mês" onClick={() => shift(1)}><Icon name="arrowRight" size={16} /></button>
        </div>
        <div className="nx-dtp__grid">
          {WEEK.map((w, i) => <span key={i} className="nx-dtp__wd">{w}</span>)}
          {days.map((x) => {
            const out = x.getMonth() !== view.getMonth();
            const dis = !!max && x > new Date(max.getFullYear(), max.getMonth(), max.getDate(), 23, 59);
            return (
              <button key={x.toISOString()} type="button" disabled={dis}
                className={['nx-dtp__day', out && 'is-out', sameDay(x, today) && 'is-today', sameDay(x, value) && 'is-on'].filter(Boolean).join(' ')}
                onClick={() => { set((n) => n.setFullYear(x.getFullYear(), x.getMonth(), x.getDate())); if (out) setView(new Date(x.getFullYear(), x.getMonth(), 1)); }}>
                {x.getDate()}
              </button>
            );
          })}
        </div>
        <div className="nx-dtp__foot">
          <button type="button" onClick={() => { const n = max && today > max ? max : today; onChange(n); setView(new Date(n.getFullYear(), n.getMonth(), 1)); }}>Agora</button>
          <button type="button" className="is-primary" onClick={onClose}>Pronto</button>
        </div>
      </div>
      <div className="nx-dtp__time">
        <span className="nx-dtp__tl">Hora</span>
        <span className="nx-dtp__tl">Min</span>
        <div className="nx-dtp__col" ref={hRef}>
          {Array.from({ length: 24 }, (_, h) => (
            <button key={h} type="button" className={value.getHours() === h ? 'is-on' : ''} onClick={() => set((n) => n.setHours(h))}>{pad(h)}</button>
          ))}
        </div>
        <div className="nx-dtp__col" ref={mRef}>
          {Array.from({ length: 60 }, (_, m) => (
            <button key={m} type="button" className={value.getMinutes() === m ? 'is-on' : ''} onClick={() => set((n) => n.setMinutes(m))}>{pad(m)}</button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
