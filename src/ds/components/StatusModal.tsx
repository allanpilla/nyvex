import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';
import type { IconName } from '../icons/icons';

export type StatusType = 'error' | 'warning' | 'success' | 'information';
export const STATUS_ICON: Record<StatusType, IconName> = { error: 'errorFill', warning: 'warnFill', success: 'successFill', information: 'infoFill' };

type Props = {
  type?: StatusType;
  align?: 'left' | 'center';
  title: string;
  description: ReactNode;
  confirm: string;
  cancel?: string;
  /** Mostra “Não mostrar novamente” no rodapé. */
  dontAsk?: boolean;
  /** Desabilita a ação principal (ex.: campo obrigatório vazio). */
  confirmDisabled?: boolean;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
};

/** Status Modal do DS (Figma › Modal › Status Modals): ícone do tipo, título, descrição e rodapé com ações. */
export function StatusModal({ type = 'error', align = 'left', title, description, confirm, cancel = 'Cancelar', dontAsk, confirmDisabled, onConfirm, onCancel }: Props) {
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onCancel]);
  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className={`nx-smodal is-${type} is-${align}`} role="alertdialog" aria-modal="true" aria-labelledby="nx-smodal-t" aria-describedby="nx-smodal-d">
        <div className="nx-smodal__body">
          <span className="nx-smodal__ic"><Icon name={STATUS_ICON[type]} size={20} /></span>
          <div className="nx-smodal__text">
            <h2 id="nx-smodal-t">{title}</h2>
            <p id="nx-smodal-d">{description}</p>
          </div>
        </div>
        <div className="nx-smodal__foot">
          {dontAsk && <Checkbox label="Não mostrar novamente" checked={skip} onChange={setSkip}><span>Não mostrar novamente</span></Checkbox>}
          <span className="nx-smodal__sp" />
          <Button autoFocus onClick={onCancel}>{cancel}</Button>
          <Button variant="primary" className={type === 'error' ? 'is-danger' : undefined} disabled={confirmDisabled} onClick={() => onConfirm(skip)}>{confirm}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
