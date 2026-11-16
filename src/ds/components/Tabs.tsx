import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

type Opt<T extends string> = { value: T; label: ReactNode; icon?: string; count?: number };
type Props<T extends string> = { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; className?: string };

/** Tab Menu horizontal do DS: título, ícone e contador opcionais; a aba ativa ganha o sublinhado azul. */
export function Tabs<T extends string>({ value, options, onChange, label, className }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = options.findIndex((o) => o.value === value);
    const n = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
    onChange(n.value);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.nx-tab.is-on')?.focus());
  };
  return (
    <div ref={ref} className={`nx-tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} className={`nx-tab${on ? ' is-on' : ''}`} onClick={() => onChange(o.value)}>
            {o.icon && <Icon name={o.icon as never} size={16} />}
            <span>{o.label}</span>
            {o.count != null && <span className="nx-tab__n">{o.count.toLocaleString('pt-BR')}</span>}
          </button>
        );
      })}
    </div>
  );
}
