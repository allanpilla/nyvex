import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';

type Props = { eyebrow?: string; title: string; onClose: () => void; footer?: ReactNode; children: ReactNode; width?: number; onSubmit?: () => void };

/** Drawer lateral (à direita) para cadastros e edições. Esc fecha; Ctrl/⌘+Enter envia. */
export function Sheet({ eyebrow, title, onClose, footer, children, width = 560, onSubmit }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.nx-menu, .nx-smodal')) { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) { e.preventDefault(); onSubmit(); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onClose, onSubmit]);
  return createPortal(
    <div className="nx-sheet-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form ref={ref} className="nx-sheet" style={{ width: `min(${width}px, 100%)` }} role="dialog" aria-modal="true" aria-labelledby="nx-sheet-t" noValidate
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}>
        <header className="nx-sheet__head">
          <div>
            {eyebrow && <span className="nx-sheet__eyebrow">{eyebrow}</span>}
            <h2 id="nx-sheet-t">{title}</h2>
          </div>
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>
        <div className="nx-sheet__body">{children}</div>
        {footer && <footer className="nx-sheet__foot">{footer}</footer>}
      </form>
    </div>,
    document.body,
  );
}
