// Locais fictícios do protótipo, no mesmo modelo do sistema atual:
// internos (instalações: prédios, portarias, áreas) e externos (via pública: cidade → bairro → via).
import { DEVICES, type Device } from '../devices/data';
import type { IconName } from '../../ds/icons/icons';

export type Env = 'indoor' | 'outdoor';
export type Exposure = 'abrigado' | 'exposto';
export type Kind = 'instalacao' | 'territorio';

export type Perimeter = { kind: 'caminho' | 'area'; vertices: number; areaKm2?: number; color: string; opacity: number; source: 'OpenStreetMap' | 'KML' | 'Desenho'; updated: string; reference?: boolean };

export type Loc = {
  id: string;
  name: string;
  /** nome gerado a partir do endereço */
  autoName: boolean;
  kind: Kind;
  env: Env;
  exposure: Exposure;
  zone: string;
  placeType?: string;
  parentId: string | null;
  // interno
  building?: string;
  floor?: string;
  sector?: string;
  // externo
  uf?: string;
  city?: string;
  district?: string;
  street?: string;
  streetType?: string;
  number?: string;
  lane?: string;
  flow?: string;
  reference?: string;
  lat: number;
  lng: number;
  perimeter?: Perimeter;
  people: string[];
  created: string;
  updated: string;
};

export const ZONES = ['Acesso', 'Bairro', 'Campus', 'Cidade', 'Estacionamento', 'Predial', 'Saúde', 'Via'];
export const PLACE_TYPES = ['Banco', 'Bar', 'Cemitério', 'Clube', 'Escola', 'Estádio', 'Hospital', 'Igreja', 'Mercado', 'Órgão público', 'Outro', 'Posto de combustível', 'Praça', 'Presídio', 'Shopping', 'Terminal'];
export const STREET_TYPES = ['Avenida', 'Rua', 'Rodovia', 'Praça', 'Viaduto', 'Estrada'];
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
export const LAYERS = ['Área monitorada (KML)', 'Câmeras', 'Dispositivos', 'Portões', 'Cercas virtuais', 'Sensores'];
export const PEOPLE = ['Elisa Santos', 'Teste QA perfil', 'Carla Mendes', 'Rafael Souza', 'Juliana Prado', 'Marcos Lima', 'Patrícia Rocha', 'André Kowalski', 'Bruno Tavares', 'Fernanda Okada'];

export const ENV_LABEL: Record<Env, string> = { indoor: 'Interno', outdoor: 'Externo' };
export const KIND_LABEL: Record<Kind, string> = { instalacao: 'Instalação', territorio: 'Território' };
export const EXPO_LABEL: Record<Exposure, string> = { abrigado: 'Abrigado', exposto: 'Exposto' };
export const ENV_ICON: Record<Env, IconName> = { indoor: 'stack', outdoor: 'map' };

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const rnd = (s: string) => ((hash(s) >>> 0) % 10000) / 10000;
const BASE = { lat: -25.4244, lng: -49.2132 };
const stamp = (s: string, d0: number) => { const d = new Date(2026, 8, 14 + Math.floor(rnd(s) * d0), 19 + Math.floor(rnd(s + 'h') * 4), Math.floor(rnd(s + 'm') * 59)); return d.toISOString(); };

function indoor(name: string, zone: string, extra: Partial<Loc> = {}): Loc {
  const id = slug(name);
  return {
    id, name, autoName: false, kind: 'instalacao', env: 'indoor', exposure: 'abrigado', zone, parentId: null,
    lat: +(BASE.lat + (rnd(id) - 0.5) * 0.004).toFixed(6), lng: +(BASE.lng + (rnd(id + 'g') - 0.5) * 0.004).toFixed(6),
    people: [], created: stamp(id, 1), updated: stamp(id + 'u', 50), ...extra,
  };
}

const CAMPUS: Loc[] = [
  indoor('Bloco 1 — Reitoria & Administrativo', 'Predial', { building: 'Bloco 1', floor: 'Térreo ao 3º', placeType: 'Escola' }),
  indoor('Bloco 2 — Ciências Jurídicas & Negócios', 'Predial', { building: 'Bloco 2', floor: 'Térreo ao 3º', placeType: 'Escola' }),
  indoor('Bloco 3 — Engenharias & Exatas', 'Predial', { building: 'Bloco 3', placeType: 'Escola' }),
  indoor('Bloco 4 — Saúde & Biológicas', 'Predial', { building: 'Bloco 4', placeType: 'Escola' }),
  indoor('Bloco 5 — Humanas & Comunicação', 'Predial', { building: 'Bloco 5', placeType: 'Escola' }),
  indoor('Bloco 6 — Biblioteca Central & Auditório', 'Predial', { building: 'Bloco 6', sector: 'Biblioteca' }),
  indoor('Bloco 7', 'Predial', { building: 'Bloco 7', people: ['Elisa Santos', 'Teste QA perfil'] }),
  indoor('Bloco 8 — Administrativo', 'Predial', { building: 'Bloco 8', sector: 'Tesouraria' }),
  indoor('Bloco 9 — Tecnologia & Data center', 'Predial', { building: 'Bloco 9', sector: 'Data center', people: ['André Kowalski'] }),
  indoor('Ginásio de Esportes', 'Campus', { exposure: 'abrigado', placeType: 'Clube' }),
  indoor('Campus Tarumã — Geral', 'Campus', { exposure: 'exposto' }),
  indoor('Clínicas Integradas de Saúde (Área LGPD)', 'Saúde', { placeType: 'Hospital', sector: 'Recepção' }),
  indoor('Portaria 1 — Konrad Adenauer (Pedestres)', 'Acesso', { exposure: 'exposto', people: ['Carla Mendes'] }),
  indoor('Portaria 2 — Konrad Adenauer (Veículos)', 'Acesso', { exposure: 'exposto' }),
  indoor('Portaria 3 — Acesso Secundário / Serviços', 'Acesso', { exposure: 'exposto' }),
  { ...indoor('Estacionamento Alunos', 'Estacionamento'), env: 'outdoor', exposure: 'exposto', perimeter: { kind: 'area', vertices: 14, areaKm2: 0.021, color: '#2f8cff', opacity: 60, source: 'Desenho', updated: stamp('ea', 20) } },
  { ...indoor('Estacionamento Professores & Funcionários', 'Estacionamento'), env: 'outdoor', exposure: 'exposto' },
];
// O bloco 7 tem área monitorada (KML) importada.
CAMPUS[6].perimeter = { kind: 'area', vertices: 9, areaKm2: 0.004, color: '#2f8cff', opacity: 60, source: 'KML', updated: stamp('b7', 40) };

/** Território: cidade → bairros → vias, gerados a partir do endereço. */
const DISTRICTS: [string, string[]][] = [
  ['Tarumã', ['Rua Konrad Adenauer', 'Avenida Victor Ferreira do Amaral', 'Rua Guilherme Ihlenfeldt', 'Rua Paulo Kissula']],
  ['Abranches', ['Rua Abílio Sebastião da Silva', 'Rodovia dos Minérios', 'Marginal da Rodovia dos Minérios', 'Praça Irmã Tereza', 'Condomínio Ilha do Arvoredo', 'Rua Adelírio da Veiga']],
  ['Bacacheri', ['Avenida Erasto Gaertner', 'Rua Rio Jari', 'Rua Costa Rica']],
  ['Cabral', ['Rua Mateus Leme', 'Avenida Paraná', 'Rua Chichorro Júnior']],
  ['Centro', ['Rua XV de Novembro', 'Praça Tiradentes', 'Avenida Marechal Floriano Peixoto', 'Terminal Guadalupe']],
  ['Jardim Social', ['Rua Ivo Leão', 'Avenida Nossa Senhora da Luz']],
];
const city: Loc = {
  id: 'curitiba', name: 'Curitiba', autoName: true, kind: 'territorio', env: 'outdoor', exposure: 'exposto', zone: 'Cidade', parentId: null,
  uf: 'PR', city: 'Curitiba', lat: -25.4284, lng: -49.2733, people: [], created: stamp('cwb', 1), updated: stamp('cwb', 1),
  perimeter: { kind: 'area', vertices: 3120, areaKm2: 435.5, color: '#2f8cff', opacity: 60, source: 'OpenStreetMap', updated: stamp('cwb', 1), reference: true },
};
const terr: Loc[] = [city];
DISTRICTS.forEach(([d, streets], i) => {
  const did = `curitiba--${slug(d)}`;
  terr.push({
    id: did, name: d, autoName: true, kind: 'territorio', env: 'outdoor', exposure: 'exposto', zone: 'Bairro', parentId: city.id, uf: 'PR', city: 'Curitiba', district: d,
    lat: +(city.lat + (rnd(did) - 0.5) * 0.08).toFixed(6), lng: +(city.lng + (rnd(did + 'g') - 0.5) * 0.08).toFixed(6), people: [], created: city.created, updated: city.updated,
    perimeter: { kind: 'area', vertices: 180 + Math.floor(rnd(did) * 400), areaKm2: +(2 + rnd(did + 'a') * 6).toFixed(1), color: '#2f8cff', opacity: 60, source: 'OpenStreetMap', updated: city.updated, reference: true },
  });
  streets.forEach((s) => {
    const sid = `${did}--${slug(s)}`;
    const st = STREET_TYPES.find((t) => s.startsWith(t)) ?? (s.startsWith('Terminal') ? 'Rua' : s.startsWith('Condomínio') || s.startsWith('Marginal') ? 'Rua' : 'Rua');
    terr.push({
      id: sid, name: s, autoName: true, kind: 'territorio', env: 'outdoor', exposure: 'exposto', zone: 'Via', parentId: did, uf: 'PR', city: 'Curitiba', district: d, street: s, streetType: st,
      placeType: s.startsWith('Praça') ? 'Praça' : s.startsWith('Terminal') ? 'Terminal' : undefined,
      lane: i % 2 ? undefined : 'Faixa 2 de 3', flow: i % 3 ? undefined : 'Bairro → Centro',
      lat: +(city.lat + (rnd(sid) - 0.5) * 0.09).toFixed(6), lng: +(city.lng + (rnd(sid + 'g') - 0.5) * 0.09).toFixed(6), people: [], created: city.created, updated: city.updated,
      perimeter: { kind: 'caminho', vertices: 2 + Math.floor(rnd(sid) * 30), color: '#2f8cff', opacity: 60, source: 'OpenStreetMap', updated: city.updated },
    });
  });
});

export const LOCS: Loc[] = [...CAMPUS, ...terr];

/** Onde cada dispositivo do protótipo está instalado (local do inventário → local cadastrado). */
const DEV_MAP: [RegExp, string][] = [
  [/^Bloco 02/, 'Bloco 2 — Ciências Jurídicas & Negócios'], [/^Bloco 04/, 'Bloco 4 — Saúde & Biológicas'], [/^Bloco 05/, 'Bloco 5 — Humanas & Comunicação'],
  [/^Bloco 06/, 'Bloco 6 — Biblioteca Central & Auditório'], [/^Bloco 07/, 'Bloco 7'], [/^Bloco 08/, 'Bloco 8 — Administrativo'], [/^Bloco 09/, 'Bloco 9 — Tecnologia & Data center'],
  [/^Ginásio/, 'Ginásio de Esportes'], [/^Estacionamento · Setor [AB]|^Estacionamento · Motos|^Cancela Norte|^Switch PoE/, 'Estacionamento Alunos'], [/^Estacionamento|^Cancela Sul/, 'Estacionamento Professores & Funcionários'],
  [/^Portarias · Portaria 1|^Portaria 1/, 'Portaria 1 — Konrad Adenauer (Pedestres)'], [/^Portarias · (Portaria 2|Guarita)|^Gateway/, 'Portaria 2 — Konrad Adenauer (Veículos)'], [/^Portarias|^Portaria 3/, 'Portaria 3 — Acesso Secundário / Serviços'],
  [/^NVR principal|^Servidor/, 'Bloco 9 — Tecnologia & Data center'], [/^NVR secundário/, 'Bloco 8 — Administrativo'],
];
const BY_NAME = Object.fromEntries(CAMPUS.map((l) => [l.name, l.id]));
export const locOfDevice = (d: Device) => BY_NAME[DEV_MAP.find(([re]) => re.test(d.name))?.[1] ?? ''] ?? null;

/** Dispositivos do local e dos sub-locais. */
export function devicesOf(l: Loc, all: Loc[], devs: Device[] = DEVICES): Device[] {
  const ids = new Set([l.id, ...descendants(l.id, all).map((x) => x.id)]);
  return devs.filter((d) => { const id = locOfDevice(d); return id != null && ids.has(id); });
}
export const childrenOf = (id: string, all: Loc[]) => all.filter((l) => l.parentId === id);
export function descendants(id: string, all: Loc[]): Loc[] {
  const out: Loc[] = [];
  const walk = (pid: string) => all.forEach((l) => { if (l.parentId === pid) { out.push(l); walk(l.id); } });
  walk(id);
  return out;
}
export const pathOf = (l: Loc, all: Loc[]): Loc[] => {
  const out: Loc[] = [];
  let p = l.parentId ? all.find((x) => x.id === l.parentId) : undefined;
  while (p) { out.unshift(p); p = p.parentId ? all.find((x) => x.id === p!.parentId) : undefined; }
  return out;
};
export function addressOf(l: Loc): string {
  if (l.env === 'indoor' || !l.city) return [l.building, l.floor, l.sector].filter(Boolean).join(' · ') || 'Campus Tarumã · Curitiba/PR';
  return [l.street && `${l.street}${l.number ? `, ${l.number}` : ''}`, l.district, `${l.city}/${l.uf}`].filter(Boolean).join(' · ');
}
export const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export type LocHealth = 'ok' | 'warn' | 'bad' | 'none';
/** Estado pelo pior dispositivo ativo. */
export function healthOf(devs: Device[]): LocHealth {
  const on = devs.filter((d) => d.situacao === 'ativo');
  if (!on.length) return 'none';
  if (on.some((d) => d.conn === 'offline')) return 'bad';
  if (on.some((d) => d.conn === 'instavel')) return 'warn';
  return 'ok';
}
export const HEALTH_LABEL: Record<LocHealth, string> = { ok: 'Operando', warn: 'Com instabilidade', bad: 'Com falha', none: 'Sem dispositivos' };
