import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';
import { useTooltip, type TipPlace } from './Tooltip';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  shortcut?: string;
  tipPlace?: TipPlace;
};

/** Botão quadrado 32px só com ícone. Mostra tooltip com o rótulo e atalho. */
export function IconButton({ icon, label, shortcut, tipPlace, className, ...rest }: Props) {
  const tip = useTooltip(label, shortcut, true, tipPlace);
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
