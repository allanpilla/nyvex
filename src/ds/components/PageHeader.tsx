import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';

type Props = { title: string; description?: string; actions?: ReactNode; icon?: IconName };

/** Faixa do topo de toda tela: título, descrição curta e ações principais (CTAs) à direita. */
export function PageHeader({ title, description, actions, icon }: Props) {
  return (
    <header className="nx-ph-head">
      {icon && <span className="nx-ph-head__icon"><Icon name={icon} size={20} /></span>}
      <div className="nx-ph-head__text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="nx-ph-head__actions">{actions}</div>}
    </header>
  );
}
