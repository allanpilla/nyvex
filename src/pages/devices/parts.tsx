import { Badge } from '../../ds/components';
import { storage } from '../../lib/storage';
import { DEFAULT_MURAL } from '../mural/data';
import { CONN_LABEL, SIT_LABEL, STATUS_LABEL, statusOf, type Device, type Situacao } from './data';

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
/** Situação única do dispositivo: Online, Offline ou Em manutenção. */
export function StatusPill({ d }: { d: Device }) {
  const st = statusOf(d);
  return <span className={`dv-conn is-${st === 'manutencao' ? 'maint' : st}`}><i />{STATUS_LABEL[st]}</span>;
}
export function SitBadge({ s }: { s: Situacao }) {
  return <Badge tone={s === 'ativo' ? 'success' : s === 'manutencao' ? 'warning' : 'neutral'}>{SIT_LABEL[s]}</Badge>;
}


/* ───────────── saúde (mesmas medidas da tela atual) ───────────── */

export type Reliab = 'confiavel' | 'instavel' | 'nao';
export const RELIAB_LABEL: Record<Reliab, string> = { confiavel: 'Confiável', instavel: 'Instável', nao: 'Não confiável' };
const seed = (s: string) => { let h = 7; for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return ((h >>> 0) % 1000) / 1000; };

/** Ambiente do local (como no filtro “Environment” da tela atual). */
export const envOf = (local: string) => (local === 'Estacionamento' ? 'Estacionamento' : local === 'Portarias' ? 'Perímetro' : local === 'Ginásio' ? 'Esportivo' : 'Predial');
export function reliability(d: Device): Reliab | null {
  if (d.situacao === 'inativo') return null;
  if (d.conn === 'offline' || d.uptime < 95) return 'nao';
  if (d.conn === 'instavel' || d.uptime < 99) return 'instavel';
  return 'confiavel';
}
/** Saúde 0–100 reportada pelo dispositivo/gateway. */
export function healthScore(d: Device): number | null {
  if (d.situacao === 'inativo') return null;
  const r = seed(d.id);
  return d.conn === 'offline' ? Math.round(12 + r * 18) : d.conn === 'instavel' ? Math.round(52 + r * 16) : Math.round(88 + r * 11);
}
export function errorRate(d: Device): number | null {
  if (d.situacao === 'inativo' || d.conn === 'offline') return null;
  const r = seed(d.id + 'e');
  return d.conn === 'instavel' ? Math.round((2 + r * 4) * 10) / 10 : Math.round(r * 4) / 10;
}
/** Transmissão em kbps (só fontes de vídeo ao vivo). */
export function bitrate(d: Device): number | null {
  if (d.stream !== 'live' || d.situacao === 'inativo') return null;
  return Math.round((1800 + seed(d.id + 'b') * 2400) / 10) * 10;
}
export function ReliabPill({ d }: { d: Device }) {
  const r = reliability(d);
  if (!r) return <span className="dv-rel is-na">—</span>;
  return <span className={`dv-rel is-${r}`}>{RELIAB_LABEL[r]}</span>;
}
