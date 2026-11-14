import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';
import { useTooltip } from './Tooltip';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  shortcut?: string;
};

/** Botão quadrado 32px só com ícone. Mostra tooltip com o rótulo e atalho. */
export function IconButton({ icon, label, shortcut, className, ...rest }: Props) {
  const tip = useTooltip(label, shortcut);
  return (
    <button
      type="button"
      aria-label={label}
      className={['nx-icon-btn', className].filter(Boolean).join(' ')}
      {...tip}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
