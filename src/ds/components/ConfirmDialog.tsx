import type { IconName } from '../icons/icons';
import { StatusModal, type StatusType } from './StatusModal';

type Props = { title: string; text: string; confirm: string; type?: StatusType; /** @deprecated o ícone vem do tipo do Status Modal */ icon?: IconName; onConfirm: () => void; onCancel: () => void };

/** Confirmação de ação destrutiva: um Status Modal do tipo erro. Foco começa em Cancelar; Esc cancela. */
export function ConfirmDialog({ title, text, confirm, type = 'error', onConfirm, onCancel }: Props) {
  return <StatusModal type={type} title={title} description={text} confirm={confirm} onConfirm={() => onConfirm()} onCancel={onCancel} />;
}
