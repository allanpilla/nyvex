type Props = { checked: boolean; onChange: (v: boolean) => void; label: string; size?: 'sm' | 'md'; disabled?: boolean };

/** Interruptor liga/desliga. `label` é lido por leitores de tela. */
export function Switch({ checked, onChange, label, size = 'md', disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`nx-switch nx-switch--${size}${checked ? ' is-on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    >
      <span className="nx-switch__knob" />
    </button>
  );
}
