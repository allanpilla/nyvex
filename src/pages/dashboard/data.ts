// Painel operacional: dados derivados das outras telas do protótipo (mesmas câmeras, alertas,
// ocorrências e engines), mais a posição de cada câmera no campus para o mapa 3D.
import { CAMS, type Cam } from '../mural/data';
import { DEVICES, type Device } from '../devices/data';
import { ALERTS, CAMS as ALERT_CAMS, KIND, NOW0, camName, type Alert, type Kind } from '../alerts/data';
import { build as buildOcc, type Occ } from '../occurrences/data';
import { storage } from '../../lib/storage';

/** Centro do campus (R. Konrad Adenauer, 442 · Tarumã, Curitiba). */
export const CENTER: [number, number] = [-49.2142, -25.4252];

export type CamState = 'on' | 'instavel' | 'off' | 'manut';
export const STATE_LABEL: Record<CamState, string> = { on: 'No ar', instavel: 'Instável', off: 'Fora do ar', manut: 'Em manutenção' };

export type MapCam = Cam & { dev: Device; state: CamState; lng: number; lat: number; alerts24: number; alerts1h: number };

/** Âncora de cada bloco/área, em metros a partir do centro (x = leste, y = norte). */
const ANCHOR: Record<string, [number, number]> = {
  'Bloco 02': [-150, 60], 'Bloco 04': [-40, 120], 'Bloco 05': [70, 135], 'Bloco 06': [170, 70],
  'Bloco 07': [-95, -30], 'Bloco 08': [20, 10], 'Bloco 09': [140, -40], Ginásio: [-210, -110],
  Estacionamento: [60, -140], Portarias: [-60, -200],
};
const M_LAT = 1 / 111_320;
const M_LNG = 1 / (111_320 * Math.cos((CENTER[1] * Math.PI) / 180));
const toLngLat = (x: number, y: number): [number, number] => [+(CENTER[0] + x * M_LNG).toFixed(6), +(CENTER[1] + y * M_LAT).toFixed(6)];

const POS_KEY = 'nx.painel.camPos';
export const loadPos = (): Record<string, [number, number]> => {
  try { return JSON.parse(storage.get(POS_KEY) ?? '{}'); } catch { return {}; }
};
export const savePos = (p: Record<string, [number, number]>) => storage.set(POS_KEY, JSON.stringify(p));

const stateOf = (d: Device): CamState => (d.situacao === 'manutencao' ? 'manut' : d.conn === 'online' ? 'on' : d.conn === 'instavel' ? 'instavel' : 'off');

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Câmera do mapa a partir do nome usado nos alertas e ocorrências ("Bloco 08 Saguão"). */
export const camByLooseName = (name: string | undefined | null): Cam | undefined => {
  if (!name) return undefined;
  const n = norm(name);
  return CAMS.find((c) => norm(c.name) === n) ?? CAMS.find((c) => n.startsWith(norm(c.local)) && norm(c.name).split(' ').slice(-1)[0] === n.split(' ').slice(-1)[0]);
};
export const camOfAlert = (a: Alert) => camByLooseName(ALERT_CAMS[a.cam]?.name);

export const H = 3_600_000;
export const NOW = NOW0;
export const PENDING = ALERTS.filter((a) => a.status === 'pendente');
export const LAST24 = ALERTS.filter((a) => a.at > NOW - 24 * H);

/** Alertas por câmera do mapa (os sem câmera conhecida caem no bloco). */
const countBy = (list: Alert[]) => {
  const m: Record<string, number> = {};
  for (const a of list) { const c = camOfAlert(a); if (c) m[c.id] = (m[c.id] ?? 0) + 1; }
  return m;
};
const C24 = countBy(LAST24);
const C1 = countBy(ALERTS.filter((a) => a.at > NOW - H));

export function buildCams(saved: Record<string, [number, number]>): MapCam[] {
  const byLocal: Record<string, Cam[]> = {};
  CAMS.forEach((c) => (byLocal[c.local] ??= []).push(c));
  return CAMS.map((c) => {
    const dev = DEVICES.find((d) => d.camId === c.id)!;
    const sib = byLocal[c.local];
    const i = sib.indexOf(c);
    const [ax, ay] = ANCHOR[c.local] ?? [0, 0];
    const r = 16 + sib.length * 4;
    const ang = (i / sib.length) * Math.PI * 2 + (c.local.length % 5);
    const [lng, lat] = saved[c.id] ?? toLngLat(ax + Math.cos(ang) * r, ay + Math.sin(ang) * r * 0.8);
    return { ...c, dev, state: stateOf(dev), lng, lat, alerts24: C24[c.id] ?? 0, alerts1h: C1[c.id] ?? 0 };
  });
}

/** Ocorrências em aberto (mesmas da tela de Ocorrências). */
export const OCCS: Occ[] = buildOcc(NOW);

/** Alertas por hora nas últimas 24 h (índice 0 = há 23 h, 23 = hora atual). */
export function hourly(): { t: number; n: number }[] {
  const end = Math.floor(NOW / H) * H + H;
  return Array.from({ length: 24 }, (_, i) => {
    const t0 = end - (24 - i) * H;
    return { t: t0, n: LAST24.filter((a) => a.at >= t0 && a.at < t0 + H).length };
  });
}

export function byKind(): { kind: Kind; label: string; n: number }[] {
  const m: Partial<Record<Kind, number>> = {};
  LAST24.forEach((a) => (m[a.kind] = (m[a.kind] ?? 0) + 1));
  return (Object.keys(m) as Kind[]).map((k) => ({ kind: k, label: KIND[k].label, n: m[k]! })).sort((a, b) => b.n - a.n);
}

/** Alertas de prioridade alta ainda pendentes, mais recentes primeiro. */
export const HOT = PENDING.filter((a) => KIND[a.kind].prio === 'alta').sort((a, b) => b.at - a.at);
export const alertCamName = (a: Alert) => camName(ALERT_CAMS[a.cam]);
