/**
 * Faces ao vivo. Fontes e campos vêm da tela de homologação (lida em 16/11/2026):
 * fontes com nome e fontes só com ID, “detection %”, horário, nº do track e o selo
 * “Pessoa não cadastrada · em observação”. As capturas são sintéticas.
 */
export type SrcStatus = 'online' | 'atencao' | 'offline';
export type Source = { id: string; name: string | null; local: string; status: SrcStatus; night: boolean; outdoor: boolean };
export type FaceKind = 'comum' | 'observacao' | 'watchlist';
export type Face = {
  id: string; src: string; at: number; det: number; track: number; kind: FaceKind;
  /** Semente do retrato sintético; capturas da mesma pessoa repetem a semente. */
  seed: number;
  match?: { person: string; list: string; score: number };
};

export const SOURCES: Source[] = [
  { id: '01a18cf0-0ed9-74e1-942c-682a2e13157c', name: 'Bloco 07 Entr Sala Leituras TE', local: 'Bloco 07', status: 'online', night: true, outdoor: false },
  { id: '01a18cf0-1b20-7c11-9f02-55e0b1d7a3a4', name: 'Bloco 07 Sala Leituras 2', local: 'Bloco 07', status: 'online', night: false, outdoor: false },
  { id: '01a18cf0-2c31-7a0e-8b3f-7d1e44c09e12', name: 'Bloco 01 Sala Descomp', local: 'Bloco 01', status: 'online', night: false, outdoor: false },
  { id: '01a18cf0-3d42-7b5f-a1c4-9e2f3b6d8a01', name: 'Bloco 01 Bicicletario', local: 'Bloco 01', status: 'online', night: false, outdoor: true },
  { id: '01a18cf0-4e53-7c60-b2d5-0f3a4c7e9b12', name: 'Bloco 03 Ram TE', local: 'Bloco 03', status: 'online', night: true, outdoor: false },
  { id: '01a18cf0-5f64-7d71-c3e6-1a4b5d8f0c23', name: 'Bloco 03 Area Convivencia', local: 'Bloco 03', status: 'online', night: false, outdoor: false },
  { id: '01a18cf0-6075-7e82-d4f7-2b5c6e901d34', name: 'Bloco 03 Escd TE', local: 'Bloco 03', status: 'atencao', night: true, outdoor: false },
  { id: '01a18cf0-7186-7f93-e508-3c6d7fa12e45', name: 'Bloco 04 Externa', local: 'Bloco 04', status: 'online', night: false, outdoor: true },
  { id: '01a18cf0-8297-70a4-f619-4d7e80b23f56', name: 'Bloco 06 Externa 1', local: 'Bloco 06', status: 'online', night: false, outdoor: true },
  { id: '01a18cf0-93a8-71b5-072a-5e8f91c34067', name: 'Bloco 06 Externa 2', local: 'Bloco 06', status: 'offline', night: false, outdoor: true },
  // Fontes que a homologação mostra só pelo ID (sem nome nem local cadastrados).
  ...['01a15fa3-2b65-701b-ae5e-f3429f6af505', '01a163f9-989e-72fc-80ba-9b81e0972990', '01a163f9-b205-746b-8962-223c10eef79f', '01a15fa3-2fbb-72bf-9e24-6dbf40ea7e2e',
    '01a163f9-71da-73ce-91c0-b929469acd06', '01a163f9-d346-7625-b3c6-40a22ed515ca', '01a163f9-a51c-75d4-84a1-64e2457636d4', '01a163f9-d146-74e7-8fa7-0aa2c4493b61',
    '01a163f9-b13b-775e-866d-28d68da1c4e6', '01a15fa3-2c37-723c-a6e8-fc09cc7a888f', '01a163f9-882a-7401-bcda-fd28da423a52',
  ].map((id, i) => ({ id, name: null, local: 'Sem local', status: (i === 7 ? 'offline' : 'online') as SrcStatus, night: i % 3 === 0, outdoor: i % 4 === 1 })),
];
export const SRC = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<string, Source>;
export const LOCAIS = [...new Set(SOURCES.map((s) => s.local))];
export const srcName = (s: Source) => s.name ?? `Fonte ${s.id.slice(0, 8)}`;
export const STATUS_LABEL: Record<SrcStatus, string> = { online: 'Online', atencao: 'Atenção', offline: 'Sem sinal' };
export const KIND_LABEL: Record<FaceKind, string> = { comum: 'Detecção', observacao: 'Em observação', watchlist: 'Watchlist' };

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pessoas de watchlist que aparecem no feed (lista “Acompanhamento QA Faces”); cada uma tem a sua foto. */
const WL = [
  { person: 'Andrei', list: 'Acompanhamento QA Faces', seed: 0 },
  { person: 'Elisa Santos', list: 'Acompanhamento QA Faces', seed: 1 },
];

const live = SOURCES.filter((s) => s.status !== 'offline');
let trackN = 8000;
let idN = 0;
/** Fotos 2…199 são usadas em sequência: cada captura tem uma foto diferente. */
let photoN = 1;
const nextPhoto = () => { photoN = photoN >= 199 ? 2 : photoN + 1; return photoN; };
/** Máximo de faces na tela: menor que o nº de fotos, para nenhuma imagem se repetir. */
export const FEED_MAX = 150;

/** Gera uma captura. Um match de watchlist só sai se aquela pessoa ainda não estiver na tela. */
export function makeFace(at: number, r: () => number, shown: Face[] = []): Face {
  const s = live[Math.floor(r() * live.length)];
  const x = r();
  const free = WL.filter((w) => !shown.some((f) => f.match?.person === w.person));
  const kind: FaceKind = x < 0.04 && free.length ? 'watchlist' : x < 0.42 ? 'observacao' : 'comum';
  const w = kind === 'watchlist' ? free[Math.floor(r() * free.length)] : null;
  return {
    id: `f${++idN}`, src: s.id, at, det: Math.round((64 + r() * 22 + (r() > 0.9 ? 8 : 0)) * 10) / 10,
    track: ++trackN, kind, seed: w ? w.seed : nextPhoto(),
    match: w ? { person: w.person, list: w.list, score: Math.round(72 + r() * 20) } : undefined,
  };
}

/** Capturas iniciais das últimas horas, todas com fotos diferentes. */
export function initialFaces(now: number): Face[] {
  const r = rng(42);
  const out: Face[] = [];
  let t = now - 40e3;
  while (out.length < 72) {
    out.push(makeFace(t, r, out));
    t -= 40e3 + r() * 240e3;
  }
  // garante um match de cada pessoa da watchlist na amostra inicial
  WL.forEach((w, i) => { if (!out.some((f) => f.match?.person === w.person)) { const f = out[3 + i * 9]; Object.assign(f, { kind: 'watchlist', seed: w.seed, match: { person: w.person, list: w.list, score: 84 - i * 6 } }); } });
  return out;
}
export const rand = rng(7);
export const hms = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
