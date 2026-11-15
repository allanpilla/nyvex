import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';

type Props = { title: string; text: string; confirm: string; icon?: IconName; onConfirm: () => void; onCancel: () => void };

/** Confirmação de ação destrutiva. Foco começa em Cancelar; Esc cancela. */
export function ConfirmDialog({ title, text, confirm, icon = 'trash', onConfirm, onCancel }: Props) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onCancel]);
  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="nx-confirm" role="alertdialog" aria-modal="true" aria-labelledby="nx-confirm-t">
        <span className="nx-confirm__ic"><Icon name={icon} size={20} /></span>
        <h2 id="nx-confirm-t">{title}</h2>
        <p>{text}</p>
        <div className="nx-confirm__btns">
          <Button autoFocus onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" className="is-danger" onClick={onConfirm}>{confirm}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
