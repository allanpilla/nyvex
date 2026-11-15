import { Icon } from './Icon';

type Props = { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string; children?: React.ReactNode };

/** Caixa de seleção 16px. Com `children` vira uma linha clicável (rótulo à direita). */
export function Checkbox({ checked, indeterminate, onChange, label, children }: Props) {
  const box = (
    <span className={`nx-check${checked || indeterminate ? ' is-on' : ''}`} aria-hidden="true">
      {indeterminate ? <i /> : checked && <Icon name="check" size={12} />}
    </span>
  );
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={children ? undefined : label}
      className={children ? 'nx-check-row' : 'nx-check-btn'}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    >
      {box}
      {children}
    </button>
  );
}
