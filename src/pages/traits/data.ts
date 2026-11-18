/**
 * Busca por característica. Campos, regras e textos vêm da tela de homologação (lida em 17/11/2026):
 * gênero, faixa etária, roupa superior e inferior, humor aparente (palpite), acessórios, boné, óculos,
 * mochila, período e finalidade obrigatória (3 a 500 caracteres, vai para a auditoria).
 * As observações abaixo são INVENTADAS para o protótipo: fotos geradas por IA (pessoas que não existem)
 * com gênero, faixa etária, óculos e boné anotados a partir da foto; roupas, acessórios e horários são sorteados.
 */
import { SOURCES, srcName, type Source } from '../faces/data';
import type { VFilters } from './vehicles';

export type Gender = 'M' | 'F';
export type Age = '18-24' | '25-34' | '35-44' | '45-59' | '60+';
export type Color = 'preto' | 'branco' | 'cinza' | 'azul' | 'azul-marinho' | 'vermelho' | 'verde' | 'amarelo' | 'laranja' | 'rosa' | 'roxo' | 'marrom' | 'bege' | 'jeans' | 'colorida';
export type Mood = 'neutro' | 'alegre' | 'alerta' | 'tenso';
export type Extra = 'bolsa' | 'mala' | 'guarda-chuva' | 'capacete' | 'mascara';
export type Tri = '' | 'sim' | 'nao';
/** Tipo de peça. Vestido é peça única: cobre em cima e embaixo, com a mesma cor. */
export type Top = 'camiseta' | 'manga-longa' | 'regata' | 'jaqueta' | 'vestido';
export type Bottom = 'calca' | 'bermuda' | 'saia' | 'vestido';
export const TOPS: { id: Top; label: string; word: string }[] = [
  { id: 'camiseta', label: 'Camiseta', word: 'camiseta' },
  { id: 'manga-longa', label: 'Camisa ou blusa', word: 'camisa ou blusa' },
  { id: 'regata', label: 'Regata', word: 'regata' },
  { id: 'jaqueta', label: 'Jaqueta ou moletom', word: 'jaqueta ou moletom' },
  { id: 'vestido', label: 'Vestido', word: 'vestido' },
];
export const BOTTOMS: { id: Bottom; label: string; word: string }[] = [
  { id: 'calca', label: 'Calça', word: 'calça' },
  { id: 'bermuda', label: 'Bermuda ou short', word: 'bermuda ou short' },
  { id: 'saia', label: 'Saia', word: 'saia' },
];
export const TOP_SHORT: Record<Top, string> = { camiseta: 'Camiseta', 'manga-longa': 'Camisa', regata: 'Regata', jaqueta: 'Jaqueta', vestido: 'Vestido' };
export const BOTTOM_SHORT: Record<Bottom, string> = { calca: 'Calça', bermuda: 'Bermuda', saia: 'Saia', vestido: 'Vestido' };
export const TOP_LABEL = Object.fromEntries(TOPS.map((t) => [t.id, t.label])) as Record<Top, string>;
export const BOTTOM_LABEL = { ...Object.fromEntries(BOTTOMS.map((t) => [t.id, t.label])), vestido: 'Vestido' } as Record<Bottom, string>;

export const GENDER_LABEL: Record<Gender, string> = { M: 'Masculino', F: 'Feminino' };
export const AGES: Age[] = ['18-24', '25-34', '35-44', '45-59', '60+'];
export const COLORS: { id: Color; label: string; hex: string; css?: string; lowerOnly?: boolean }[] = [
  { id: 'preto', label: 'Preto', hex: '#16181d' },
  { id: 'branco', label: 'Branco', hex: '#f4f5f7' },
  { id: 'cinza', label: 'Cinza', hex: '#8a8f99' },
  { id: 'azul', label: 'Azul', hex: '#3b82f6' },
  { id: 'azul-marinho', label: 'Azul-marinho', hex: '#1e2f5c' },
  { id: 'vermelho', label: 'Vermelho', hex: '#dc2f45' },
  { id: 'verde', label: 'Verde', hex: '#2f9e64' },
  { id: 'amarelo', label: 'Amarelo', hex: '#f2c230' },
  { id: 'laranja', label: 'Laranja', hex: '#f07a2b' },
  { id: 'rosa', label: 'Rosa', hex: '#ec7fb0' },
  { id: 'roxo', label: 'Roxo', hex: '#8b5cf6' },
  { id: 'marrom', label: 'Marrom', hex: '#7a5134' },
  { id: 'bege', label: 'Bege', hex: '#d9c3a0' },
  { id: 'jeans', label: 'Jeans', hex: '#4a6a96', lowerOnly: true },
  /** Estampada ou com várias cores: o motor não separa uma cor dominante. */
  { id: 'colorida', label: 'Colorida ou estampada', hex: '#c45ab3', css: 'conic-gradient(from 200deg, #f2556f, #f2c230, #2f9e64, #3b82f6, #8b5cf6, #f2556f)' },
];
export const COLOR = Object.fromEntries(COLORS.map((c) => [c.id, c])) as Record<Color, (typeof COLORS)[number]>;
/** Fundo CSS de uma cor (a colorida vira um gradiente). */
export const colorBg = (c: Color) => COLOR[c].css ?? COLOR[c].hex;
export const MOODS: { id: Mood; label: string }[] = [
  { id: 'neutro', label: 'Neutro' }, { id: 'alegre', label: 'Alegre' }, { id: 'alerta', label: 'Alerta' }, { id: 'tenso', label: 'Tenso' },
];
export const EXTRAS: { id: Extra; label: string }[] = [
  { id: 'bolsa', label: 'Bolsa' }, { id: 'mala', label: 'Mala' }, { id: 'guarda-chuva', label: 'Guarda-chuva' }, { id: 'capacete', label: 'Capacete' }, { id: 'mascara', label: 'Máscara' },
];
export const UPPER_WORD = 'Roupa superior';
export const LOWER_WORD = 'Roupa inferior';

export type Obs = {
  id: string;
  person: number;
  seed: number;
  src: string;
  at: number;
  track: number;
  gender: Gender;
  age: Age;
  upper: Color;
  lower: Color;
  top: Top;
  bottom: Bottom;
  hat: boolean;
  glasses: boolean;
  backpack: boolean;
  extras: Extra[];
  mood: Mood;
  /** Confiança do motor por atributo (0–100). Humor é sempre baixo: é palpite. */
  conf: { gender: number; age: number; upper: number; lower: number; top: number; bottom: number; hat: number; glasses: number; backpack: number; mood: number };
};

/**
 * Fotos 000–199 anotadas a olho: gênero, faixa etária, óculos (o) e boné/chapéu (b).
 * Crianças e rostos ambíguos ficam de fora (null).
 */
const A: Record<string, Age> = { y: '18-24', a: '25-34', m: '35-44', o: '45-59', s: '60+' };
const RAW = `Ma Fa Ma Fy Fa Fy Fy Ma Mm - Fab Fmo - My Fs Ma Mab Fa Fa Fy
Fa Fa Ma Fy Fa Ma Ma Fy Ma Ma Fy - My Fy Fa Fy Ma - Fa Ma
Fy Myo Fa Fa Fa Moo Ma Ma Fa Fyb Fa Fy Fa Mmo Fa My Fa Mm Mao Fa
- Fy Ma My My - Fy Ma Mo Fa Ma Fy Fs Fy Fa - Mmo - Fa Fa
Ma Fy Fa Fa My - - Fa Fa Fa Fy My Fa My Myb Fa Fa - Fa Ma
Fy Fa Fa Fy Mmo Mab Fa Fa Ma Ma Fy Fa Fa Fy Fy Fy Fa Mo My Fa
Fa Ma Fa Fa Fyb Fm Fa - Fy - Fy Fy My - Mo Fa Fa My Fa Ma
Fy Mo - - Fy Fa My Fy Ma Ma Fa Fy Fy - Ma Fa Fa Fa Ma Fa
Mob - Fa Fy My Fy My Fab Fo Fy My Fy Fm Fm Ma - Fy Fa Ma Fa
Mm Fy Fab My Ma Mm My Fyb Fyo Fy - Fmb Fy - Fa Fa Fa Ma Fa Fa`;
const PHOTOS = RAW.split(/\s+/).map((t, i) => (t === '-' ? null : { seed: i, gender: t[0] as Gender, age: A[t[1]], glasses: t.includes('o', 2), hat: t.includes('b', 2) }))
  .filter(Boolean) as { seed: number; gender: Gender; age: Age; glasses: boolean; hat: boolean }[];

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UPPER_W: [Color, number][] = [['preto', 22], ['branco', 14], ['cinza', 10], ['azul', 10], ['azul-marinho', 8], ['vermelho', 7], ['verde', 6], ['amarelo', 4], ['rosa', 5], ['bege', 4], ['marrom', 3], ['roxo', 3], ['laranja', 3], ['colorida', 7]];
const LOWER_W: [Color, number][] = [['jeans', 34], ['preto', 26], ['azul-marinho', 8], ['cinza', 8], ['bege', 8], ['branco', 4], ['marrom', 5], ['verde', 3], ['vermelho', 2], ['rosa', 2], ['colorida', 2]];
const pickW = <T,>(r: () => number, w: [T, number][]) => { let x = r() * w.reduce((s, [, n]) => s + n, 0); for (const [v, n] of w) { x -= n; if (x < 0) return v; } return w[0][0]; };

/** Só câmeras com nome e no ar (as fontes só com ID ficam para o Faces ao vivo). */
export const CAMS: Source[] = SOURCES.filter((s) => s.status !== 'offline' && s.name);

/** Gera ~700 observações dos últimos 7 dias: 150 pessoas, cada uma vista de 1 a 9 vezes. */
export function buildObs(now: number): Obs[] {
  const r = rng(2026);
  const out: Obs[] = [];
  let track = 41200;
  PHOTOS.forEach((p, pi) => {
    const upper = pickW(r, UPPER_W);
    let lower = pickW(r, LOWER_W);
    if (lower === upper && lower !== 'preto') lower = 'jeans';
    const top = pickW<Top>(r, p.gender === 'F' ? [['camiseta', 34], ['manga-longa', 24], ['regata', 9], ['jaqueta', 15], ['vestido', 18]] : [['camiseta', 46], ['manga-longa', 22], ['regata', 6], ['jaqueta', 26]]);
    const bottom: Bottom = top === 'vestido' ? 'vestido' : pickW<Bottom>(r, p.gender === 'F' ? [['calca', 56], ['bermuda', 18], ['saia', 26]] : [['calca', 70], ['bermuda', 30]]);
    if (top === 'vestido') lower = upper;
    else if (lower === 'jeans' && bottom === 'saia' && r() < .5) lower = 'preto';
    const backpack = r() < 0.32;
    const extras: Extra[] = [];
    if (p.gender === 'F' ? r() < 0.4 : r() < 0.08) extras.push('bolsa');
    if (r() < 0.06) extras.push('mala');
    if (r() < 0.05) extras.push('guarda-chuva');
    if (r() < 0.04) extras.push('capacete');
    if (r() < 0.07) extras.push('mascara');
    const home = CAMS.filter((c) => c.local === CAMS[Math.floor(r() * CAMS.length)].local);
    const visits = 1 + Math.floor(r() * r() * 11);
    // Algumas pessoas circulam num intervalo curto (mesmo dia), outras aparecem ao longo da semana.
    const day = Math.floor(r() * 7);
    const burst = r() < 0.55;
    for (let v = 0; v < visits; v++) {
      const cam = r() < 0.7 && home.length ? home[Math.floor(r() * home.length)] : CAMS[Math.floor(r() * CAMS.length)];
      const d = burst ? day : Math.floor(r() * 7);
      const hour = 7 + Math.floor(Math.pow(r(), 0.9) * 15);
      const base = new Date(now); base.setHours(0, 0, 0, 0);
      let at = base.getTime() - d * 86400e3 + hour * 3600e3 + Math.floor(r() * 3600e3);
      if (at > now - 60e3) at = now - Math.floor(60e3 + r() * 5 * 3600e3);
      const c = (lo: number, hi: number) => Math.round(lo + r() * (hi - lo));
      out.push({
        id: `o${pi}-${v}`, person: pi, seed: p.seed, src: cam.id, at, track: ++track,
        gender: p.gender, age: p.age, upper, lower, top, bottom, hat: p.hat, glasses: p.glasses,
        backpack: v > 0 && r() < 0.08 ? !backpack : backpack,
        extras: extras.filter(() => r() > 0.08), mood: pickW(r, [['neutro', 60], ['alegre', 18], ['alerta', 14], ['tenso', 8]] as [Mood, number][]),
        conf: { gender: c(82, 98), age: c(58, 86), upper: c(74, 97), lower: c(66, 94), top: c(70, 95), bottom: c(68, 94), hat: c(80, 97), glasses: c(70, 95), backpack: c(72, 95), mood: c(31, 58) },
      });
    }
  });
  return out.sort((a, b) => b.at - a.at);
}

/* ───────────── filtros ───────────── */

export type Filters = {
  gender: Gender | '';
  ages: Age[];
  upper: Color[];
  lower: Color[];
  tops: Top[];
  bottoms: Bottom[];
  hat: Tri;
  glasses: Tri;
  backpack: Tri;
  extras: Extra[];
  moods: Mood[];
  locais: string[];
  period: '1h' | '24h' | '7d' | 'custom';
  from: string;
  to: string;
};
export const EMPTY: Filters = { gender: '', ages: [], upper: [], lower: [], tops: [], bottoms: [], hat: '', glasses: '', backpack: '', extras: [], moods: [], locais: [], period: '7d', from: '', to: '' };

/** Atributos de descrição (sem período e local) que o filtro está pedindo. */
export type TraitKey = 'gender' | 'ages' | 'tops' | 'upper' | 'bottoms' | 'lower' | 'hat' | 'glasses' | 'backpack' | 'extras' | 'moods';
export const TRAIT_KEYS: TraitKey[] = ['gender', 'ages', 'tops', 'upper', 'bottoms', 'lower', 'hat', 'glasses', 'backpack', 'extras', 'moods'];
export const isSet = (f: Filters, k: TraitKey) => { const v = f[k]; return Array.isArray(v) ? v.length > 0 : v !== ''; };
export const nTraits = (f: Filters) => TRAIT_KEYS.filter((k) => isSet(f, k)).length;

const tri = (t: Tri, v: boolean) => t === '' || (t === 'sim') === v;
export function traitOk(o: Obs, f: Filters, k: TraitKey): boolean {
  switch (k) {
    case 'gender': return !f.gender || o.gender === f.gender;
    case 'ages': return !f.ages.length || f.ages.includes(o.age);
    case 'upper': return !f.upper.length || f.upper.includes(o.upper);
    case 'lower': return !f.lower.length || f.lower.includes(o.lower);
    case 'tops': return !f.tops.length || f.tops.includes(o.top);
    case 'bottoms': return !f.bottoms.length || f.bottoms.includes(o.bottom);
    case 'hat': return tri(f.hat, o.hat);
    case 'glasses': return tri(f.glasses, o.glasses);
    case 'backpack': return tri(f.backpack, o.backpack);
    case 'extras': return !f.extras.length || f.extras.every((x) => o.extras.includes(x));
    case 'moods': return !f.moods.length || f.moods.includes(o.mood);
  }
}

export function range(f: Filters, now: number): [number, number] {
  if (f.period === 'custom') return [f.from ? new Date(f.from).getTime() : 0, f.to ? new Date(f.to).getTime() : now];
  return [now - ({ '1h': 3600e3, '24h': 86400e3, '7d': 7 * 86400e3 } as const)[f.period], now];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Rótulo curto de um atributo pedido, para chips e “o que faltou”. */
export function traitLabel(f: Filters, k: TraitKey): string {
  const list = (a: string[]) => a.join(' ou ');
  switch (k) {
    case 'gender': return f.gender ? GENDER_LABEL[f.gender] : '';
    case 'ages': return `${list(f.ages)} anos`;
    case 'upper': return `Superior ${list(f.upper.map((c) => COLOR[c].label.toLowerCase()))}`;
    case 'lower': return `Inferior ${list(f.lower.map((c) => COLOR[c].label.toLowerCase()))}`;
    case 'tops': return cap(list(f.tops.map((t) => TOPS.find((x) => x.id === t)!.word)));
    case 'bottoms': return cap(list(f.bottoms.map((t) => BOTTOMS.find((x) => x.id === t)!.word)));
    case 'hat': return f.hat === 'sim' ? 'Com boné' : 'Sem boné';
    case 'glasses': return f.glasses === 'sim' ? 'Com óculos' : 'Sem óculos';
    case 'backpack': return f.backpack === 'sim' ? 'Com mochila' : 'Sem mochila';
    case 'extras': return f.extras.map((x) => EXTRAS.find((e) => e.id === x)!.label).join(' + ');
    case 'moods': return `Humor ${list(f.moods.map((m) => MOODS.find((x) => x.id === m)!.label.toLowerCase()))}`;
  }
}
/** O que a observação tem no lugar do atributo pedido (para “quase bate”). */
export function obsTrait(o: Obs, k: TraitKey): string {
  switch (k) {
    case 'gender': return GENDER_LABEL[o.gender];
    case 'ages': return `${o.age} anos`;
    case 'upper': return `superior ${COLOR[o.upper].label.toLowerCase()}`;
    case 'lower': return `inferior ${COLOR[o.lower].label.toLowerCase()}`;
    case 'tops': return TOP_LABEL[o.top].toLowerCase();
    case 'bottoms': return BOTTOM_LABEL[o.bottom].toLowerCase();
    case 'hat': return o.hat ? 'com boné' : 'sem boné';
    case 'glasses': return o.glasses ? 'com óculos' : 'sem óculos';
    case 'backpack': return o.backpack ? 'com mochila' : 'sem mochila';
    case 'extras': return o.extras.length ? o.extras.join(', ') : 'sem acessórios';
    case 'moods': return `humor ${o.mood}`;
  }
}

/** Correspondência: média da confiança do motor nos atributos pedidos. */
export function score(o: Obs, f: Filters): number {
  const ks: (keyof Obs['conf'])[] = [];
  if (f.gender) ks.push('gender');
  if (f.ages.length) ks.push('age');
  if (f.upper.length) ks.push('upper');
  if (f.lower.length) ks.push('lower');
  if (f.tops.length) ks.push('top');
  if (f.bottoms.length) ks.push('bottom');
  if (f.hat) ks.push('hat');
  if (f.glasses) ks.push('glasses');
  if (f.backpack) ks.push('backpack');
  if (f.moods.length) ks.push('mood');
  if (!ks.length) return Math.round((o.conf.gender + o.conf.upper + o.conf.lower) / 3);
  return Math.round(ks.reduce((s, k) => s + o.conf[k], 0) / ks.length);
}

/* ───────────── “Descreva a pessoa” ───────────── */

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const COLOR_WORDS: [RegExp, Color][] = [
  [/azul[- ]marinho|marinho/, 'azul-marinho'], [/pret[oa]s?|escur[oa]/, 'preto'], [/branc[oa]s?/, 'branco'], [/cinza|grafite/, 'cinza'],
  [/azul|azuis/, 'azul'], [/vermelh[oa]s?|vinho/, 'vermelho'], [/verde/, 'verde'], [/amarel[oa]s?/, 'amarelo'], [/laranja/, 'laranja'],
  [/rosa|pink/, 'rosa'], [/roxo|roxa|lilas/, 'roxo'], [/marrom|caqui/, 'marrom'], [/bege|creme/, 'bege'], [/jeans/, 'jeans'], [/colorid[oa]|estampad[oa]|florid[oa]|listrad[oa]|xadrez/, 'colorida'],
];
const UPPER_RE = /(camis[ae]t?a|camisa|blusa|jaqueta|casaco|moletom|regata|uniforme|colete|top|parte de cima)/;
const LOWER_RE = /(calca|bermuda|saia|short|shorts|legging|parte de baixo)/;

/** Lê uma descrição livre (“homem de camiseta vermelha, calça jeans e mochila”) e devolve os filtros entendidos. */
export function parseDescription(text: string): Partial<Filters> {
  const t = ` ${norm(text)} `;
  const f: Partial<Filters> = {};
  if (/\b(homem|homens|masculino|rapaz|senhor|garoto|cara)\b/.test(t)) f.gender = 'M';
  if (/\b(mulher|mulheres|feminino|moca|senhora|garota)\b/.test(t)) f.gender = 'F';
  const ages: Age[] = [];
  const n = t.match(/\b(\d{2})\s*(anos)?\b/);
  if (n) { const v = +n[1]; ages.push(v < 25 ? '18-24' : v < 35 ? '25-34' : v < 45 ? '35-44' : v < 60 ? '45-59' : '60+'); }
  if (/\bjovem\b/.test(t)) ages.push('18-24');
  if (/\b(idos[oa]|senhor|senhora)\b/.test(t)) ages.push('60+');
  if (/\bmeia[- ]idade\b/.test(t)) ages.push('45-59');
  if (ages.length) f.ages = [...new Set(ages)];
  // Cor logo depois da peça; sem peça, a primeira cor vale para a parte de cima.
  const upper: Color[] = [], lower: Color[] = [];
  const parts = t.split(/,| e | com | de | usando | vestindo /);
  let ctx: 'u' | 'l' | null = null;
  for (const p of parts) {
    if (UPPER_RE.test(p)) ctx = 'u';
    else if (LOWER_RE.test(p)) ctx = 'l';
    for (const [re, c] of COLOR_WORDS) {
      if (re.test(p)) {
        const where = c === 'jeans' ? 'l' : ctx ?? (upper.length ? 'l' : 'u');
        (where === 'u' ? upper : lower).push(c);
        break;
      }
    }
    if (/\bjeans\b/.test(p) && !lower.includes('jeans')) lower.push('jeans');
  }
  if (upper.length) f.upper = [...new Set(upper)];
  if (lower.length) f.lower = [...new Set(lower)];
  const yesNo = (re: RegExp): Tri | undefined => { const m = t.match(new RegExp(`(sem\\s+)?${re.source}`)); return m ? (m[1] ? 'nao' : 'sim') : undefined; };
  const hat = yesNo(/(bone|chapeu|toca|gorro)/); if (hat) f.hat = hat;
  const gl = yesNo(/oculos/); if (gl) f.glasses = gl;
  const bp = yesNo(/mochila/); if (bp) f.backpack = bp;
  const ex: Extra[] = [];
  if (/\b(bolsa|sacola)\b/.test(t)) ex.push('bolsa');
  if (/\b(mala|maleta)\b/.test(t)) ex.push('mala');
  if (/guarda[- ]chuva/.test(t)) ex.push('guarda-chuva');
  if (/capacete/.test(t)) ex.push('capacete');
  if (/mascara/.test(t)) ex.push('mascara');
  if (ex.length) f.extras = ex;
  const moods: Mood[] = [];
  if (/\b(nervos[oa]|tens[oa]|agitad[oa])\b/.test(t)) moods.push('tenso');
  if (/\b(alegre|sorrindo|feliz)\b/.test(t)) moods.push('alegre');
  if (moods.length) f.moods = moods;
  const locais = [...new Set(CAMS.map((c) => c.local))].filter((l) => l !== 'Sem local' && t.includes(` ${norm(l)} `));
  if (locais.length) f.locais = locais;
  if (/\b(ultima hora|agora ha pouco)\b/.test(t)) f.period = '1h';
  else if (/\b(hoje|24 ?h|ultimas 24)\b/.test(t)) f.period = '24h';
  else if (/\b(semana|7 dias)\b/.test(t)) f.period = '7d';
  return f;
}

export const camName = (id: string) => { const s = CAMS.find((c) => c.id === id) ?? SOURCES.find((c) => c.id === id)!; return srcName(s); };
export const camOf = (id: string) => SOURCES.find((c) => c.id === id)!;
export const LOCAIS = [...new Set(CAMS.map((c) => c.local))];
export const when = (t: number, now: number) => {
  const d = new Date(t), today = new Date(now); today.setHours(0, 0, 0, 0);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (t >= today.getTime()) return `Hoje, ${hm}`;
  if (t >= today.getTime() - 86400e3) return `Ontem, ${hm}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hm}`;
};

/** Exemplos prontos do estado inicial. */
export const EXAMPLES: { label: string; text: string }[] = [
  { label: 'Camiseta vermelha e mochila', text: 'camiseta vermelha com mochila' },
  { label: 'Mulher, 25-34, calça jeans', text: 'mulher 30 anos calça jeans' },
  { label: 'Homem de boné e roupa preta', text: 'homem de boné, camisa preta' },
  { label: 'Óculos e blusa branca', text: 'blusa branca e óculos' },
];

/* ───────────── execução e histórico de buscas ───────────── */

export type Result = {
  exact: Obs[];
  near: { o: Obs; miss: TraitKey }[];
  buckets: { from: number; to: number; n: number }[];
  cams: [string, number][];
  people: number;
};

/** Roda a busca sobre as observações, no período relativo ao momento da consulta. */
export function runSearch(all: Obs[], f: Filters, at: number): Result {
  const [a, b] = range(f, at);
  const base = all.filter((o) => o.at >= a && o.at <= b && (!f.locais.length || f.locais.includes(camOf(o.src).local)));
  const keys = TRAIT_KEYS.filter((k) => isSet(f, k));
  const exact: Obs[] = [], near: { o: Obs; miss: TraitKey }[] = [];
  for (const o of base) {
    const miss = keys.filter((k) => !traitOk(o, f, k));
    if (!miss.length) exact.push(o);
    else if (miss.length === 1 && keys.length >= 2 && miss[0] !== 'gender') near.push({ o, miss: miss[0] });
  }
  const n = f.period === '1h' ? 12 : f.period === '24h' ? 24 : 28;
  const start = f.period === 'custom' ? a || (base.length ? Math.min(...base.map((o) => o.at)) : b - 86400e3) : a;
  const size = (b - start) / n || 1;
  const buckets = Array.from({ length: n }, (_, i) => ({ from: start + i * size, to: start + (i + 1) * size, n: 0 }));
  for (const o of exact) { const i = Math.min(n - 1, Math.floor((o.at - start) / size)); if (i >= 0) buckets[i].n++; }
  const byCam = new Map<string, number>();
  for (const o of exact) byCam.set(o.src, (byCam.get(o.src) ?? 0) + 1);
  return { exact, near, buckets, cams: [...byCam.entries()].sort((x, y) => y[1] - x[1]), people: new Set(exact.map((o) => o.person)).size };
}

/** Busca feita. Com `vf`, é de veículo: `f` guarda só onde e quando, e `people` conta veículos. */
export type Search = { id: string; code: string; f: Filters; vf?: VFilters; purpose: string; by: string; me: boolean; at: number; n: number; people: number };
export const ME = 'Você';
let codeN = 418;
export const nextCode = () => `BC-${String(++codeN).padStart(4, '0')}`;

/** Buscas já feitas (INVENTADAS): autores, finalidades e horários de exemplo. */
export function seedSearches(all: Obs[], now: number): Search[] {
  const H = 3600e3;
  const rows: [string, string, number, Partial<Filters>][] = [
    [ME, 'Apuração do incidente 42 no acesso norte', 0.4, { gender: 'M', upper: ['preto'], lower: ['jeans'], backpack: 'sim' }],
    ['Marina Costa', 'Furto de bicicleta no bicicletário do Bloco 01', 2.2, { upper: ['vermelho', 'laranja'], locais: ['Bloco 01'] }],
    ['Rafael Souza', 'Aluna não localizada pela família, vista pela última vez no Bloco 03', 5.5, { gender: 'F', ages: ['18-24'], tops: ['vestido'] }],
    [ME, 'Ocorrência OC-2026-0139: dano ao patrimônio na sala de leituras', 21, { gender: 'M', ages: ['25-34'], upper: ['preto', 'cinza'], locais: ['Bloco 07'] }],
    ['Juliana Alves', 'Comportamento suspeito relatado pela portaria', 46, { upper: ['azul-marinho'], backpack: 'sim' }],
    ['Marina Costa', 'Verificação de denúncia anônima', 70, { tops: ['jaqueta'], upper: ['amarelo', 'laranja'] }],
    ['Rafael Souza', 'Objeto esquecido no Bloco 04: localizar o dono', 97, { extras: ['bolsa'], locais: ['Bloco 04'] }],
  ];
  return rows.map(([by, purpose, h, p], i) => {
    const f = { ...EMPTY, ...p };
    const at = now - h * H;
    const r = runSearch(all, f, at);
    return { id: `s${i}`, code: `BC-${String(418 - i).padStart(4, '0')}`, f, purpose, by, me: by === ME, at, n: r.exact.length, people: r.people };
  });
}
