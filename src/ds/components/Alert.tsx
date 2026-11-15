import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { STATUS_ICON, type StatusType } from './StatusModal';

type Props = { type?: StatusType; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string };

/** Alerta em linha do DS: mesma linguagem do Status Modal (ícone preenchido + cor do estado). */
export function Alert({ type = 'information', title, children, action, className }: Props) {
  return (
    <div className={['nx-alert', `is-${type}`, className].filter(Boolean).join(' ')} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={STATUS_ICON[type]} size={16} className="nx-alert__ic" />
      <div className="nx-alert__text">
        {title && <b>{title}</b>}
        {children && <span>{children}</span>}
      </div>
      {action}
    </div>
  );
}
