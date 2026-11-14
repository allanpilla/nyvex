import type { ReactNode } from 'react';

type Props = { title: string; description?: string; actions?: ReactNode };

/** Faixa do topo de toda tela: título, descrição curta e ações principais (CTAs) à direita. */
export function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="nx-ph-head">
      <div className="nx-ph-head__text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="nx-ph-head__actions">{actions}</div>}
    </header>
  );
}
