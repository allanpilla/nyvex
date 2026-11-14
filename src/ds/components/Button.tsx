import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  icon?: IconName;
};

/** Botão de ação (32px). Primary para a ação principal da tela, secondary para as demais. */
export function Button({ variant = 'secondary', icon, className, children, ...rest }: Props) {
  return (
    <button type="button" className={['nx-btn', `nx-btn--${variant}`, className].filter(Boolean).join(' ')} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
