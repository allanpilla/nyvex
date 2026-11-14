import type { ReactNode } from 'react';

type Props = { children: ReactNode; tone?: 'neutral' | 'success' };

export function Badge({ children, tone = 'neutral' }: Props) {
  return <span className={`nx-badge nx-badge--${tone}`}>{children}</span>;
}
