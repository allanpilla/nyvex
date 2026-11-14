import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';

type Props = {
  icon: IconName;
  label: string;
  active?: boolean;
  count?: string;
  trailing?: ReactNode;
  selected?: boolean;
  as?: 'button' | 'div';
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>;

/** Item compacto de 32px usado no menu, na paleta de comando e em menus suspensos. */
export function NavItem({ icon, label, active, count, trailing, selected, className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={['nx-item', selected && 'is-sel', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon name={icon} className="nx-item__ic" />
      <span className="nx-item__lbl">{label}</span>
      {count && (
        <>
          <span className="nx-count">{count}</span>
          <span className="nx-item__dot" />
        </>
      )}
      {trailing}
    </button>
  );
}
