import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = { anchor: HTMLElement; onClose: () => void; align?: 'left' | 'right'; className?: string; children: ReactNode };

/** Menu/popover suspenso preso a um botão. Fecha com Esc ou clique fora. Abre para cima se faltar espaço. */
export function Menu({ anchor, onClose, align = 'right', className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const r = anchor.getBoundingClientRect();
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [anchor, onClose]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.offsetHeight;
    if (r.bottom + 6 + h > window.innerHeight - 8 && r.top - 6 - h > 8) { el.style.top = `${r.top - 6 - h}px`; el.classList.add('is-up'); }
  });
  const style = align === 'right' ? { top: r.bottom + 6, right: window.innerWidth - r.right } : { top: r.bottom + 6, left: r.left };
  return createPortal(<div ref={ref} className={['nx-menu', className].filter(Boolean).join(' ')} role="menu" style={style}>{children}</div>, document.body);
}
