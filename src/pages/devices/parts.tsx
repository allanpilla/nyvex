import { Badge } from '../../ds/components';
import { storage } from '../../lib/storage';
import { DEFAULT_MURAL } from '../mural/data';
import { CONN_LABEL, SIT_LABEL, type Device, type Situacao } from './data';

/* ───────────── utilidades ───────────── */

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function ago(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 5) return 'agora';
  if (sec < 60) return `há ${Math.round(sec)} s`;
  if (sec < 3600) return `há ${Math.round(sec / 60)} min`;
  if (sec < 86400) return `há ${Math.round(sec / 3600)} h`;
  return `há ${Math.round(sec / 86400)} d`;
}
export const latTone = (ms: number | null) => (ms == null ? '' : ms >= 300 ? 'is-bad' : ms >= 120 ? 'is-warn' : 'is-ok');

export function copy(text: string, toast: (m: string) => void, what = 'Copiado') {
  navigator.clipboard?.writeText(text).catch(() => {});
  toast(`${what}: ${text}`);
}

/** Leva uma câmera para o mural (primeira posição livre) e abre o Mural. */
export function sendToMural(camId: string) {
  let mural: (string | null)[] = [...DEFAULT_MURAL];
  try { const saved = JSON.parse(storage.get('nx-mural') ?? 'null'); if (Array.isArray(saved)) mural = saved; } catch { /* usa o padrão */ }
  if (!mural.includes(camId)) {
    const free = mural.indexOf(null);
    if (free >= 0) mural[free] = camId; else mural.push(camId);
    storage.set('nx-mural', JSON.stringify(mural));
  }
}

export function ConnPill({ d }: { d: Device }) {
  if (d.situacao === 'inativo') return <span className="dv-conn is-na"><i />Não monitorado</span>;
  return <span className={`dv-conn is-${d.conn}`}><i />{CONN_LABEL[d.conn]}</span>;
}
export function SitBadge({ s }: { s: Situacao }) {
  return <Badge tone={s === 'ativo' ? 'success' : s === 'manutencao' ? 'warning' : 'neutral'}>{SIT_LABEL[s]}</Badge>;
}

