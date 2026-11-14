import type { ReactNode } from 'react';

type Opt<T extends string> = { value: T; label: ReactNode; title?: string };
type Props<T extends string> = { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' };

/** Controle segmentado: escolha única entre poucas opções. */
export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: Props<T>) {
  return (
    <div className={`nx-seg nx-seg--${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.title} className={`nx-seg__opt${value === o.value ? ' is-on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
