/**
 * Matriz de relacionamento (antigas “Rede de placas” e “Teia de relacionamento”).
 * Conta quantas vezes pessoas e/ou veículos SEM cadastro no campus foram vistos juntos.
 * “Juntos” = detectados pela mesma câmera com até 2 minutos de diferença.
 * Dados sintéticos e fixos (semente), com os blocos e andares do cadastro de Locais.
 */
export const NOW = new Date('2026-11-18T08:00:00-03:00').getTime();
export const WINDOW_TXT = 'mesma câmera, até 2 min de diferença';

export type Kind = 'pessoa' | 'veiculo';
export type Entity = {
  id: string; kind: Kind;
  /** Pessoa: código provisório do rastreio. Veículo: placa. */
  label: string;
  /** Pessoa: descrição visual. Veículo: modelo · cor. */
  sub: string;
  seed?: number;
  /** Vezes que foi detectado no campus no período (sozinho ou acompanhado). */
  seen: number;
  first: string;
};
export type Encounter = { id: string; at: string; place: string; floor: string | null; camera: string; gap: number };
export type Pair = { id: string; a: string; b: string; enc: Encounter[] };
export type PairType = 'pp' | 'pv' | 'vv';

const iso = (h: number) => new Date(NOW - h * 3600e3).toISOString();

export const ENTITIES: Entity[] = [
  { id: 'p1', kind: 'pessoa', label: 'Pessoa #A71F', sub: 'Homem, 25–35 anos · moletom cinza', seed: 12, seen: 41, first: iso(24 * 29) },
  { id: 'p2', kind: 'pessoa', label: 'Pessoa #3C08', sub: 'Mulher, 18–25 anos · jaqueta jeans', seed: 47, seen: 33, first: iso(24 * 27) },
  { id: 'p3', kind: 'pessoa', label: 'Pessoa #B2E4', sub: 'Homem, 35–45 anos · camisa social', seed: 88, seen: 26, first: iso(24 * 26) },
  { id: 'p4', kind: 'pessoa', label: 'Pessoa #19DA', sub: 'Mulher, 25–35 anos · vestido preto', seed: 131, seen: 19, first: iso(24 * 21) },
  { id: 'p5', kind: 'pessoa', label: 'Pessoa #F05C', sub: 'Homem, 18–25 anos · capacete na mão', seed: 64, seen: 22, first: iso(24 * 24) },
  { id: 'p6', kind: 'pessoa', label: 'Pessoa #7E31', sub: 'Homem, 45–60 anos · boné azul', seed: 150, seen: 14, first: iso(24 * 18) },
  { id: 'p7', kind: 'pessoa', label: 'Pessoa #C4A0', sub: 'Mulher, 35–45 anos · bolsa vermelha', seed: 103, seen: 12, first: iso(24 * 16) },
  { id: 'p8', kind: 'pessoa', label: 'Pessoa #2B9E', sub: 'Homem, 18–25 anos · mochila preta', seed: 176, seen: 11, first: iso(24 * 14) },
  { id: 'p9', kind: 'pessoa', label: 'Pessoa #D86B', sub: 'Mulher, 45–60 anos · casaco bege', seed: 29, seen: 9, first: iso(24 * 12) },
  { id: 'p10', kind: 'pessoa', label: 'Pessoa #6F12', sub: 'Homem, 25–35 anos · bermuda e chinelo', seed: 191, seen: 7, first: iso(24 * 9) },
  { id: 'v1', kind: 'veiculo', label: 'RHC4E21', sub: 'Chevrolet Onix · prata', seen: 38, first: iso(24 * 29) },
  { id: 'v2', kind: 'veiculo', label: 'BEE7J63', sub: 'Toyota Hilux · preta', seen: 17, first: iso(24 * 25) },
  { id: 'v3', kind: 'veiculo', label: 'QTP2A09', sub: 'Honda CG 160 (moto) · vermelha', seen: 21, first: iso(24 * 23) },
  { id: 'v4', kind: 'veiculo', label: 'FJK1C77', sub: 'Toyota Corolla · cinza', seen: 15, first: iso(24 * 25) },
  { id: 'v5', kind: 'veiculo', label: 'AYX5D40', sub: 'Renault Kwid · branco', seen: 10, first: iso(24 * 13) },
  { id: 'v6', kind: 'veiculo', label: 'MNB8G12', sub: 'Fiat Strada · branca', seen: 6, first: iso(24 * 10) },
  { id: 'v7', kind: 'veiculo', label: 'GHT3F58', sub: 'VW Saveiro · branca', seen: 5, first: iso(24 * 10) },
  { id: 'v8', kind: 'veiculo', label: 'KLP9B33', sub: 'Hyundai HB20 · azul', seen: 8, first: iso(24 * 11) },
];
export const ENT: Record<string, Entity> = Object.fromEntries(ENTITIES.map((e) => [e.id, e]));

/** Locais do campus: blocos com andares e áreas externas (sem andar). */
export const PLACES: { name: string; floors: string[] | null }[] = [
  { name: 'Bloco 1', floors: ['Térreo', '1º andar', '2º andar', '3º andar'] },
  { name: 'Bloco 2', floors: ['Térreo', '1º andar', '2º andar', '3º andar'] },
  { name: 'Bloco 3', floors: ['Térreo', '1º andar', '2º andar'] },
  { name: 'Bloco 4', floors: ['Térreo', '1º andar', '2º andar'] },
  { name: 'Bloco 5', floors: ['Térreo', '1º andar', '2º andar'] },
  { name: 'Bloco 6', floors: ['Térreo', '1º andar'] },
  { name: 'Bloco 7', floors: ['Térreo', '1º andar'] },
  { name: 'Bloco 8', floors: ['Térreo', '1º andar', '2º andar'] },
  { name: 'Bloco 9', floors: ['Térreo', '1º andar'] },
  { name: 'Estacionamento Alunos', floors: null },
  { name: 'Estacionamento Professores', floors: null },
  { name: 'Portaria 1 (Pedestres)', floors: null },
  { name: 'Portaria 2 (Veículos)', floors: null },
  { name: 'Portaria 3 (Serviços)', floors: null },
  { name: 'Ginásio de Esportes', floors: null },
];
export const placeText = (place: string, floor: string | null) => (floor ? `${place} · ${floor}` : place);

const CAM: Record<string, string[]> = {
  'Estacionamento Alunos': ['Estacionamento · Setor A', 'Estacionamento · Setor B', 'Cancela Norte (LPR)'],
  'Estacionamento Professores': ['Estacionamento · Setor C', 'Cancela Sul (LPR)'],
  'Portaria 1 (Pedestres)': ['Portaria 1 · Catraca', 'Portaria 1 · Externa'],
  'Portaria 2 (Veículos)': ['Portaria 2 · LPR entrada', 'Portaria 2 · LPR saída', 'Guarita · Externa'],
  'Portaria 3 (Serviços)': ['Portaria 3 · Portão', 'Portaria 3 · LPR'],
  'Ginásio de Esportes': ['Ginásio · Entrada', 'Ginásio · Quadra'],
};
const camOf = (place: string, floor: string | null, r: number) => {
  const list = CAM[place];
  if (list) return list[Math.floor(r * list.length)];
  const n = place.replace('Bloco ', '').padStart(2, '0');
  const spot = ['Corredor', 'Escada', 'Hall', 'Elevadores', 'Convivência'][Math.floor(r * 5)];
  return `Bloco ${n} ${spot} ${floor === 'Térreo' ? 'TE' : (floor ?? '').replace('º andar', 'º')}`;
};

// Gerador determinístico (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** [a, b, encontros em 30 dias, locais preferidos [local, andar, peso], horas desde o último encontro] */
type Spec = [string, string, number, [string, string | null, number][], number];
const SPECS: Spec[] = [
  ['p1', 'v1', 18, [['Estacionamento Alunos', null, 6], ['Portaria 2 (Veículos)', null, 3], ['Bloco 3', 'Térreo', 1]], 3],
  ['p1', 'p2', 14, [['Bloco 3', 'Térreo', 5], ['Bloco 3', '1º andar', 3], ['Bloco 6', 'Térreo', 2], ['Estacionamento Alunos', null, 1]], 5],
  ['p2', 'v1', 11, [['Estacionamento Alunos', null, 5], ['Portaria 2 (Veículos)', null, 2]], 3],
  ['p3', 'p4', 9, [['Bloco 6', 'Térreo', 4], ['Bloco 6', '1º andar', 3], ['Bloco 5', '2º andar', 1]], 20],
  ['p5', 'v3', 8, [['Portaria 3 (Serviços)', null, 4], ['Estacionamento Alunos', null, 2]], 30],
  ['v2', 'v4', 7, [['Estacionamento Professores', null, 4], ['Portaria 2 (Veículos)', null, 3]], 26],
  ['p6', 'p7', 6, [['Bloco 1', '2º andar', 4], ['Bloco 1', 'Térreo', 2]], 50],
  ['p3', 'p8', 5, [['Bloco 6', 'Térreo', 3], ['Bloco 5', '1º andar', 2]], 44],
  ['p4', 'p8', 4, [['Bloco 6', '1º andar', 3], ['Bloco 6', 'Térreo', 1]], 70],
  ['p9', 'v5', 4, [['Estacionamento Professores', null, 3], ['Bloco 8', 'Térreo', 1]], 96],
  ['p1', 'p5', 3, [['Portaria 1 (Pedestres)', null, 2], ['Ginásio de Esportes', null, 1]], 120],
  ['p10', 'p6', 3, [['Bloco 2', '1º andar', 2], ['Bloco 2', 'Térreo', 1]], 150],
  ['p7', 'v8', 3, [['Estacionamento Alunos', null, 2], ['Bloco 4', 'Térreo', 1]], 60],
  ['v6', 'v7', 2, [['Portaria 3 (Serviços)', null, 2]], 210],
  ['p2', 'p3', 2, [['Bloco 3', '2º andar', 1], ['Bloco 6', 'Térreo', 1]], 330],
  ['p9', 'p10', 1, [['Bloco 9', 'Térreo', 1]], 400],
  ['p5', 'v1', 1, [['Estacionamento Alunos', null, 1]], 500],
  ['p8', 'v3', 1, [['Portaria 3 (Serviços)', null, 1]], 600],
];

export const PAIRS: Pair[] = SPECS.map(([a, b, n, places, last], i) => {
  const r = rng(1000 + i * 7919);
  const total = places.reduce((s, p) => s + p[2], 0);
  const pick = () => { let x = r() * total; for (const p of places) { x -= p[2]; if (x <= 0) return p; } return places[0]; };
  const enc: Encounter[] = Array.from({ length: n }, (_, k) => {
    // o 1º é o mais recente; os demais se espalham pelos 30 dias, em horário de aula (7h–22h)
    const d0 = Math.ceil(last / 24);
    const day = d0 + Math.floor(r() * Math.max(1, 29 - d0));
    const base = k === 0 ? NOW - last * 3600e3 : new Date(new Date(NOW - (day + 1) * 86400e3).setHours(7 + Math.floor(r() * 15), Math.floor(r() * 60), 0, 0)).getTime();
    const [place, floor] = pick();
    return { id: `${a}-${b}-${k}`, at: new Date(base).toISOString(), place, floor, camera: camOf(place, floor, r()), gap: 3 + Math.floor(r() * 100) };
  }).sort((x, y) => y.at.localeCompare(x.at));
  return { id: `${a}-${b}`, a, b, enc };
});

export const pairType = (p: Pair): PairType => {
  const k = [ENT[p.a].kind, ENT[p.b].kind];
  return k[0] === 'pessoa' && k[1] === 'pessoa' ? 'pp' : k[0] === 'veiculo' && k[1] === 'veiculo' ? 'vv' : 'pv';
};
export const TYPE_LABEL: Record<PairType, string> = { pp: 'Pessoa + pessoa', pv: 'Pessoa + veículo', vv: 'Veículo + veículo' };

export const PERIODS = [
  { value: '24h', label: 'Últimas 24 horas', hours: 24 },
  { value: '7d', label: 'Últimos 7 dias', hours: 24 * 7 },
  { value: '30d', label: 'Últimos 30 dias', hours: 24 * 30 },
] as const;
export type Period = (typeof PERIODS)[number]['value'];

export const fmtDT = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');
export const ageText = (s: string) => {
  const m = (NOW - new Date(s).getTime()) / 60000;
  if (m < 60) return `há ${Math.max(1, Math.round(m))} min`;
  if (m < 1440) return `há ${Math.round(m / 60)} h`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'ontem' : `há ${d} dias`;
};
export const gapText = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`);
