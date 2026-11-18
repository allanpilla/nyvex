/**
 * Busca de veículos por característica: tipo, cor, marca, modelo e placa.
 * As passagens abaixo são INVENTADAS para o protótipo (placas no padrão Mercosul geradas, horários sorteados).
 */
import { CAMS, camOf, range, type Filters } from './data';

export type VType = 'carro' | 'sedan' | 'suv' | 'onibus' | 'moto' | 'bicicleta';
export type VColor = 'preto' | 'branco' | 'prata' | 'cinza' | 'vermelho' | 'azul' | 'verde' | 'amarelo' | 'marrom';

export const VTYPES: { id: VType; label: string }[] = [
  { id: 'carro', label: 'Carro (hatch)' }, { id: 'sedan', label: 'Sedan' }, { id: 'suv', label: 'SUV' },
  { id: 'onibus', label: 'Ônibus' }, { id: 'moto', label: 'Moto' }, { id: 'bicicleta', label: 'Bicicleta' },
];
export const VTYPE_LABEL = Object.fromEntries(VTYPES.map((t) => [t.id, t.label])) as Record<VType, string>;
export const VTYPE_SHORT: Record<VType, string> = { carro: 'Carro', sedan: 'Sedan', suv: 'SUV', onibus: 'Ônibus', moto: 'Moto', bicicleta: 'Bicicleta' };

export const VCOLORS: { id: VColor; label: string; hex: string }[] = [
  { id: 'preto', label: 'Preto', hex: '#1b1d22' }, { id: 'branco', label: 'Branco', hex: '#eef0f3' },
  { id: 'prata', label: 'Prata', hex: '#b7bcc4' }, { id: 'cinza', label: 'Cinza', hex: '#6d727c' },
  { id: 'vermelho', label: 'Vermelho', hex: '#c8303f' }, { id: 'azul', label: 'Azul', hex: '#2f63c8' },
  { id: 'verde', label: 'Verde', hex: '#2f8a5a' }, { id: 'amarelo', label: 'Amarelo', hex: '#e8b62c' },
  { id: 'marrom', label: 'Marrom', hex: '#6e4a30' },
];
export const VCOLOR = Object.fromEntries(VCOLORS.map((c) => [c.id, c])) as Record<VColor, (typeof VCOLORS)[number]>;

/** Marcas e modelos que o motor reconhece, por tipo. */
export const CATALOG: Record<VType, [string, string[]][]> = {
  carro: [['Volkswagen', ['Gol', 'Polo']], ['Fiat', ['Mobi', 'Argo']], ['Hyundai', ['HB20']], ['Chevrolet', ['Onix']], ['Renault', ['Kwid']]],
  sedan: [['Toyota', ['Corolla']], ['Honda', ['Civic', 'City']], ['Chevrolet', ['Onix Plus']], ['Volkswagen', ['Virtus']], ['Nissan', ['Versa']]],
  suv: [['Jeep', ['Compass', 'Renegade']], ['Hyundai', ['Creta']], ['Volkswagen', ['T-Cross', 'Nivus']], ['Toyota', ['SW4']], ['Chevrolet', ['Tracker']]],
  onibus: [['Mercedes-Benz', ['O 500']], ['Volkswagen', ['Volksbus 17.230']], ['Marcopolo', ['Torino']]],
  moto: [['Honda', ['CG 160', 'Biz 125', 'XRE 300']], ['Yamaha', ['Fazer 250', 'Factor 150']]],
  bicicleta: [['Caloi', ['Elite', 'Explorer']], ['Sense', ['Fun']], ['Specialized', ['Rockhopper']]],
};
export const BRANDS = [...new Set(Object.values(CATALOG).flatMap((l) => l.map(([b]) => b)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
export const modelsOf = (types: VType[], brands: string[]) => [...new Set((types.length ? types : (Object.keys(CATALOG) as VType[]))
  .flatMap((t) => CATALOG[t].filter(([b]) => !brands.length || brands.includes(b)).flatMap(([b, ms]) => ms.map((m) => `${b} ${m}`))))]
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));
export const brandsOf = (types: VType[]) => [...new Set((types.length ? types : (Object.keys(CATALOG) as VType[])).flatMap((t) => CATALOG[t].map(([b]) => b)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
export const hasPlate = (t: VType) => t !== 'bicicleta';

export type VObs = {
  id: string; vehicle: number; src: string; at: number; track: number;
  type: VType; brand: string; model: string; color: VColor; plate: string | null;
  conf: { type: number; color: number; brand: number; model: number; plate: number };
};

export type VFilters = Pick<Filters, 'locais' | 'period' | 'from' | 'to'> & {
  types: VType[]; colors: VColor[]; brands: string[]; models: string[]; plate: string;
};
export const VEMPTY: VFilters = { types: [], colors: [], brands: [], models: [], plate: '', locais: [], period: '7d', from: '', to: '' };

export type VKey = 'types' | 'colors' | 'brands' | 'models' | 'plate';
export const VKEYS: VKey[] = ['types', 'brands', 'models', 'colors', 'plate'];
export const vIsSet = (f: VFilters, k: VKey) => (k === 'plate' ? f.plate.trim() !== '' : f[k].length > 0);
export const vTraits = (f: VFilters) => VKEYS.filter((k) => vIsSet(f, k)).length;

/** Placa: só letras e números, maiúsculas. “?” vale qualquer caractere; basta um trecho. */
export const plateNorm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9?]/g, '');
export function plateMatch(plate: string | null, q: string) {
  const n = plateNorm(q);
  if (!n) return true;
  if (!plate) return false;
  const re = new RegExp(n.replace(/\?/g, '.'));
  return re.test(plate);
}

export function vOk(o: VObs, f: VFilters, k: VKey) {
  switch (k) {
    case 'types': return !f.types.length || f.types.includes(o.type);
    case 'colors': return !f.colors.length || f.colors.includes(o.color);
    case 'brands': return !f.brands.length || f.brands.includes(o.brand);
    case 'models': return !f.models.length || f.models.includes(`${o.brand} ${o.model}`);
    case 'plate': return plateMatch(o.plate, f.plate);
  }
}
export function vLabel(f: VFilters, k: VKey) {
  const list = (a: string[]) => a.join(' ou ');
  switch (k) {
    case 'types': return list(f.types.map((t) => VTYPE_SHORT[t]));
    case 'colors': return `Cor ${list(f.colors.map((c) => VCOLOR[c].label.toLowerCase()))}`;
    case 'brands': return list(f.brands);
    case 'models': return list(f.models);
    case 'plate': return `Placa ${plateNorm(f.plate)}`;
  }
}
export const vDescribe = (f: VFilters) => VKEYS.filter((k) => vIsSet(f, k)).map((k) => vLabel(f, k)).join(' · ') || 'Qualquer veículo';
export function vScore(o: VObs, f: VFilters) {
  const ks: (keyof VObs['conf'])[] = [];
  if (f.types.length) ks.push('type');
  if (f.colors.length) ks.push('color');
  if (f.brands.length) ks.push('brand');
  if (f.models.length) ks.push('model');
  if (f.plate.trim()) ks.push('plate');
  if (!ks.length) return Math.round((o.conf.type + o.conf.color) / 2);
  return Math.round(ks.reduce((s, k) => s + o.conf[k], 0) / ks.length);
}

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickW = <T,>(r: () => number, w: [T, number][]) => { let x = r() * w.reduce((s, [, n]) => s + n, 0); for (const [v, n] of w) { x -= n; if (x < 0) return v; } return w[0][0]; };
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** ~600 passagens dos últimos 7 dias: 110 veículos, cada um visto de 1 a 12 vezes (quem estuda ou trabalha volta todo dia). */
export function buildVehicles(now: number): VObs[] {
  const r = rng(7331);
  const out: VObs[] = [];
  let track = 88100;
  // Câmeras de acesso e área externa veem mais veículos.
  const cams = CAMS.filter((c) => c.outdoor).length >= 3 ? CAMS.filter((c) => c.outdoor) : CAMS;
  for (let v = 0; v < 110; v++) {
    const type = pickW<VType>(r, [['carro', 30], ['sedan', 20], ['suv', 20], ['moto', 15], ['bicicleta', 9], ['onibus', 6]]);
    const [brand, models] = CATALOG[type][Math.floor(r() * CATALOG[type].length)];
    const model = models[Math.floor(r() * models.length)];
    const color = type === 'onibus' ? pickW<VColor>(r, [['branco', 60], ['azul', 20], ['amarelo', 20]])
      : pickW<VColor>(r, [['branco', 22], ['prata', 20], ['preto', 20], ['cinza', 16], ['vermelho', 9], ['azul', 6], ['verde', 2], ['amarelo', 2], ['marrom', 3]]);
    const plate = hasPlate(type) ? `${L[Math.floor(r() * 26)]}${L[Math.floor(r() * 26)]}${L[Math.floor(r() * 26)]}${Math.floor(r() * 10)}${L[Math.floor(r() * 26)]}${Math.floor(r() * 10)}${Math.floor(r() * 10)}` : null;
    const visits = type === 'onibus' ? 6 + Math.floor(r() * 7) : 1 + Math.floor(r() * r() * 10);
    const home = cams[Math.floor(r() * cams.length)];
    for (let i = 0; i < visits; i++) {
      const cam = r() < 0.6 ? home : cams[Math.floor(r() * cams.length)];
      const base = new Date(now); base.setHours(0, 0, 0, 0);
      const d = Math.floor(r() * 7);
      const hour = 6 + Math.floor(r() * 16);
      let at = base.getTime() - d * 86400e3 + hour * 3600e3 + Math.floor(r() * 3600e3);
      if (at > now - 60e3) at = now - Math.floor(60e3 + r() * 5 * 3600e3);
      const c = (lo: number, hi: number) => Math.round(lo + r() * (hi - lo));
      const night = camOf(cam.id).night;
      out.push({
        id: `v${v}-${i}`, vehicle: v, src: cam.id, at, track: ++track, type, brand, model, color, plate,
        conf: { type: c(86, 99), color: night ? c(55, 80) : c(78, 96), brand: c(70, 94), model: c(58, 88), plate: plate ? c(night ? 62 : 82, 99) : 0 },
      });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

export type VResult = { exact: VObs[]; cams: [string, number][]; vehicles: number };
export function runVehicleSearch(all: VObs[], f: VFilters, at: number): VResult {
  const [a, b] = range({ period: f.period, from: f.from, to: f.to } as Filters, at);
  const keys = VKEYS.filter((k) => vIsSet(f, k));
  const exact = all.filter((o) => o.at >= a && o.at <= b && (!f.locais.length || f.locais.includes(camOf(o.src).local)) && keys.every((k) => vOk(o, f, k)));
  const byCam = new Map<string, number>();
  for (const o of exact) byCam.set(o.src, (byCam.get(o.src) ?? 0) + 1);
  return { exact, cams: [...byCam.entries()].sort((x, y) => y[1] - x[1]), vehicles: new Set(exact.map((o) => o.vehicle)).size };
}

/** Buscas de veículo já feitas (INVENTADAS). A placa parcial vem de um veículo da base, para a busca ter resultado. */
export function seedVehicleSearches(all: VObs[], now: number, ME: string) {
  const H = 3600e3;
  const sedan = all.find((o) => o.type === 'sedan' && o.plate)!;
  const rows: [string, string, number, Partial<VFilters>][] = [
    [ME, 'Veículo parado por muito tempo na área externa do Bloco 06', 1.3, { types: ['suv'], colors: ['preto', 'cinza'] }],
    ['Juliana Alves', 'Batida no estacionamento: a vítima anotou só parte da placa', 9, { types: ['sedan'], plate: `${sedan.plate!.slice(0, 3)}?${sedan.plate!.slice(4, 5)}` }],
    ['Rafael Souza', 'Moto em alta velocidade na via interna', 52, { types: ['moto'], brands: ['Honda'] }],
  ];
  return rows.map(([by, purpose, h, p]) => {
    const vf = { ...VEMPTY, ...p };
    const at = now - h * H;
    const r = runVehicleSearch(all, vf, at);
    return { vf, purpose, by, me: by === ME, at, n: r.exact.length, people: r.vehicles };
  });
}
