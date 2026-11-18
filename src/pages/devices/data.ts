// Inventário fictício de dispositivos do protótipo. As câmeras são as mesmas do Mural de vídeo.
import { CAMS } from '../mural/data';
import type { IconName } from '../../ds/icons/icons';

export type Kind = 'camera' | 'acesso' | 'infra';
/** Situação cadastral: decide se o dispositivo é monitorado. */
export type Situacao = 'ativo' | 'manutencao' | 'inativo';
/** Conexão medida pelo heartbeat. `na` = não monitorado (inativo). */
export type Conn = 'online' | 'instavel' | 'offline' | 'na';
export type Stream = 'live' | 'sem' | 'na';

export type DevEvent = { at: number; text: string; tone: 'ok' | 'warn' | 'bad' | 'info' };

export type Device = {
  id: string;
  name: string;
  kind: Kind;
  type: string;
  vendor: string;
  model: string;
  certified: boolean;
  local: string;
  area: string;
  outdoor: boolean;
  ip: string;
  port: number;
  mac: string;
  firmware: string;
  user: string;
  situacao: Situacao;
  conn: Conn;
  stream: Stream;
  /** segundos desde o último heartbeat */
  hb: number | null;
  latency: number | null;
  uptime: number; // % em 30 dias
  note?: string;
  camId?: string;
  /** Tipo da câmera (Bullet, PTZ, Panorâmica, Térmica, LPR, FA). */
  camType?: CamType;
  added: string;
};

export type CamType = 'Bullet' | 'PTZ' | 'Panorâmica' | 'Térmica' | 'LPR' | 'FA';
export const CAM_TYPES: CamType[] = ['Bullet', 'PTZ', 'Panorâmica', 'Térmica', 'LPR', 'FA'];
/** Situação mostrada ao operador: só Online, Offline ou Em manutenção. */
export type Status = 'online' | 'offline' | 'manutencao';
export const STATUS_LABEL: Record<Status, string> = { online: 'Online', offline: 'Offline', manutencao: 'Em manutenção' };
export const statusOf = (d: Pick<Device, 'situacao' | 'conn'>): Status =>
  d.situacao === 'manutencao' ? 'manutencao' : d.situacao === 'inativo' || d.conn === 'offline' || d.conn === 'na' ? 'offline' : 'online';
/** Categoria: Câmera, Controle de acesso ou NVR (demais equipamentos de rede ficam em Infraestrutura). */
export const categoryOf = (d: Pick<Device, 'kind' | 'type'>) => (d.kind === 'camera' ? 'Câmera' : d.kind === 'acesso' ? 'Controle de acesso' : d.type === 'Gravador (NVR)' ? 'NVR' : 'Infraestrutura');
export const typeOf = (d: Pick<Device, 'kind' | 'type' | 'camType'>) => (d.kind === 'camera' ? d.camType ?? d.type : d.type);
/** Disponibilidade 30 d: ≥ 90% verde, 80–89,99% amarelo, abaixo de 80% vermelho. */
export const uptimeTone = (v: number) => (v >= 90 ? 'is-ok' : v >= 80 ? 'is-warn' : 'is-bad');
export const KIND_LABEL: Record<Kind, string> = { camera: 'Câmeras', acesso: 'Controle de acesso', infra: 'Infraestrutura' };
export const KIND_ICON: Record<Kind, IconName> = { camera: 'camera', acesso: 'door', infra: 'server' };
export const SIT_LABEL: Record<Situacao, string> = { ativo: 'Ativo', manutencao: 'Em manutenção', inativo: 'Inativo' };
export const CONN_LABEL: Record<Conn, string> = { online: 'Online', instavel: 'Instável', offline: 'Offline', na: 'Não monitorado' };
export const STREAM_LABEL: Record<Stream, string> = { live: 'Ao vivo', sem: 'Sem vídeo', na: 'Sem stream' };
export const LICENSES = 350;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const mac = (r: () => number) => ['44', '19', 'b6', ...Array.from({ length: 3 }, () => Math.floor(r() * 256).toString(16).padStart(2, '0'))].join(':').toUpperCase();
const date = (r: () => number) => { const d = new Date(2025, Math.floor(r() * 12), 1 + Math.floor(r() * 27)); return d.toISOString().slice(0, 10); };

const CAM_MODELS: [string, string, boolean, string][] = [
  ['Hikvision', 'DS-2CD2347G2-LU', true, 'V5.7.15'],
  ['Intelbras', 'VIP 3230 B', true, '2.800.0000'],
  ['Hikvision', 'DS-2CD2143G2-IS', true, 'V5.7.12'],
  ['Genérico', 'ONVIF / RTSP', false, '—'],
];
const HB_FROM_NOTE: Record<string, number> = { 'Sem sinal há 12 min': 720, 'Sem sinal há 2 h': 7200, 'Sem sinal há 35 min': 2100 };

const cams: Device[] = CAMS.map((c, i) => {
  const r = rng(hash(c.id));
  const m = CAM_MODELS[i % 7 === 3 ? 3 : Math.floor(r() * 3)];
  const conn: Conn = c.status === 'online' ? 'online' : c.status === 'atencao' ? 'instavel' : 'offline';
  const maint = c.id === 'bloco-05-laboratorios';
  return {
    id: c.id,
    name: c.name,
    kind: 'camera',
    type: /patio|quadra|setor-a|guarita/.test(c.id) ? 'Câmera PTZ' : 'Câmera fixa',
    vendor: m[0], model: m[1], certified: m[2], firmware: m[3],
    local: c.local, area: c.area, outdoor: c.outdoor,
    ip: `172.26.1.${11 + i}`, port: 554, mac: mac(r), user: 'admin',
    situacao: maint ? 'manutencao' : 'ativo',
    conn,
    stream: conn === 'offline' ? 'sem' : 'live',
    hb: conn === 'online' ? 1 + Math.floor(r() * 20) : conn === 'instavel' ? 240 + Math.floor(r() * 200) : HB_FROM_NOTE[c.note ?? ''] ?? 900,
    latency: conn === 'online' ? 12 + Math.floor(r() * 50) : conn === 'instavel' ? 320 + Math.floor(r() * 180) : null,
    uptime: conn === 'online' ? 99 + Math.round(r() * 95) / 100 : conn === 'instavel' ? 86 + Math.round(r() * 1000) / 100 : 68 + Math.round(r() * 2000) / 100,
    note: maint ? 'Troca de lente agendada · alertas silenciados' : c.note,
    camId: c.id,
    camType: /patio|quadra|setor-a|guarita/.test(c.id) ? 'PTZ' : /cancela|garagem/.test(c.id) ? 'LPR' : /portaria|recepcao/.test(c.id) ? 'FA'
      : (['Bullet', 'Bullet', 'Panorâmica', 'Bullet', 'Térmica', 'Panorâmica'] as CamType[])[Math.floor(r() * 6)],
    added: date(r),
  } satisfies Device;
});

type Extra = [name: string, kind: Kind, type: string, vendor: string, model: string, local: string, area: string, sit: Situacao, conn: Conn, note?: string];
const EXTRA: Extra[] = [
  ['Portaria 1 · Leitor facial entrada', 'acesso', 'Leitor facial', 'Control iD', 'iDFace Max', 'Portarias', 'Acessos', 'ativo', 'online'],
  ['Portaria 1 · Leitor facial saída', 'acesso', 'Leitor facial', 'Control iD', 'iDFace Max', 'Portarias', 'Acessos', 'ativo', 'online'],
  ['Portaria 3 · Catraca pedestres', 'acesso', 'Catraca', 'Control iD', 'iDBlock Next', 'Portarias', 'Acessos', 'ativo', 'online'],
  ['Cancela Norte · Leitor LPR', 'acesso', 'Leitor LPR', 'Hikvision', 'iDS-TCM403', 'Estacionamento', 'Área externa', 'ativo', 'online'],
  ['Cancela Sul · Leitor LPR', 'acesso', 'Leitor LPR', 'Hikvision', 'iDS-TCM403', 'Estacionamento', 'Área externa', 'ativo', 'instavel', 'Latência alta nas últimas 2 h'],
  ['Bloco 09 · Controladora data center', 'acesso', 'Controladora de acesso', 'Intelbras', 'CT 3000 4PB', 'Bloco 09', 'Tecnologia', 'ativo', 'online'],
  ['Bloco 07 · Catraca antiga', 'acesso', 'Catraca', 'Genérico', 'Wiegand 26', 'Bloco 07', 'Biblioteca', 'inativo', 'na', 'Substituída pela catraca nova em 03/2026'],
  ['Ginásio · Leitor facial vestiários', 'acesso', 'Leitor facial', 'Hikvision', 'DS-K1T671M', 'Ginásio', 'Esportes', 'inativo', 'na', 'Desativado durante a reforma do ginásio'],
  ['NVR principal · Data center', 'infra', 'Gravador (NVR)', 'Hikvision', 'DS-7732NI-K4', 'Bloco 09', 'Tecnologia', 'ativo', 'online'],
  ['NVR secundário · Bloco 08', 'infra', 'Gravador (NVR)', 'Intelbras', 'NVD 3332', 'Bloco 08', 'Administrativo', 'ativo', 'online'],
  ['Switch PoE · Estacionamento', 'infra', 'Switch PoE', 'Intelbras', 'SG 2404 PoE', 'Estacionamento', 'Área externa', 'ativo', 'instavel', 'Perda de pacotes de 4% na porta 7'],
  ['Gateway de vídeo · Portarias', 'infra', 'Gateway de vídeo', 'Nyvex', 'Edge G2', 'Portarias', 'Acessos', 'ativo', 'online'],
  ['Servidor de análise · Faces e placas', 'infra', 'Servidor de análise', 'Nyvex', 'Analytics A1', 'Bloco 09', 'Tecnologia', 'manutencao', 'online', 'Atualização de modelo de IA em andamento'],
];

const extras: Device[] = EXTRA.map(([name, kind, type, vendor, model, local, area, sit, conn, note], i) => {
  const r = rng(hash(name));
  const id = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    id, name, kind, type, vendor, model, certified: vendor !== 'Genérico', firmware: vendor === 'Genérico' ? '—' : `${1 + Math.floor(r() * 4)}.${Math.floor(r() * 9)}.${Math.floor(r() * 30)}`,
    local, area, outdoor: local === 'Estacionamento',
    ip: `172.26.${kind === 'acesso' ? 2 : 0}.${(kind === 'acesso' ? 20 : 2) + i}`, port: kind === 'infra' ? 8000 : 80, mac: mac(r), user: 'admin',
    situacao: sit, conn, stream: 'na',
    hb: conn === 'na' ? null : conn === 'online' ? 1 + Math.floor(r() * 25) : 300 + Math.floor(r() * 120),
    latency: conn === 'na' ? null : conn === 'online' ? 6 + Math.floor(r() * 30) : 280 + Math.floor(r() * 160),
    uptime: conn === 'na' ? 0 : conn === 'online' ? 99.4 + Math.round(r() * 59) / 100 : 95 + Math.round(r() * 300) / 100,
    note, added: date(r),
  } satisfies Device;
});

export const DEVICES: Device[] = [...cams, ...extras];
export const DEV_LOCAIS = [...new Set(DEVICES.map((d) => d.local))];

/** Histórico curto e determinístico para a aba Eventos. */
export function eventsFor(d: Device): DevEvent[] {
  const r = rng(hash(d.id + 'ev'));
  const now = Date.now();
  const ev: DevEvent[] = [];
  if (d.situacao === 'inativo') return [{ at: now - 86400e3 * 40, text: 'Dispositivo desativado', tone: 'info' }, { at: now - 86400e3 * 300, text: 'Dispositivo cadastrado', tone: 'info' }];
  if (d.conn === 'offline') ev.push({ at: now - (d.hb ?? 600) * 1000, text: 'Heartbeat perdido · dispositivo offline', tone: 'bad' });
  if (d.conn === 'instavel') ev.push({ at: now - (d.hb ?? 300) * 1000, text: d.note ?? 'Latência acima de 300 ms', tone: 'warn' });
  if (d.situacao === 'manutencao') ev.push({ at: now - 3600e3 * 5, text: 'Colocado em manutenção · alertas silenciados', tone: 'info' });
  let t = now - 3600e3 * (6 + r() * 10);
  const pool: [string, DevEvent['tone']][] = d.kind === 'camera'
    ? [['Stream reiniciado pelo operador', 'info'], ['Reconectou após queda de 2 min', 'ok'], ['Queda de conexão', 'warn'], ['Firmware verificado', 'ok'], ['Snapshot de saúde ok', 'ok']]
    : [['Reconectou após queda de 1 min', 'ok'], ['Queda de conexão', 'warn'], ['Sincronização de cadastro concluída', 'ok'], ['Configuração alterada', 'info']];
  for (let i = 0; i < 5; i++) {
    const p = pool[Math.floor(r() * pool.length)];
    ev.push({ at: t, text: p[0], tone: p[1] });
    t -= 3600e3 * (8 + r() * 40);
  }
  ev.push({ at: new Date(d.added).getTime(), text: 'Dispositivo cadastrado', tone: 'info' });
  return ev;
}

/** 48 blocos de 30 min nas últimas 24 h: true = respondeu. */
export function availability(d: Device): ('ok' | 'warn' | 'bad')[] {
  const r = rng(hash(d.id + 'av'));
  return Array.from({ length: 48 }, (_, i) => {
    if (d.conn === 'offline' && i >= 48 - Math.max(1, Math.ceil((d.hb ?? 600) / 1800))) return 'bad';
    if (d.conn === 'instavel' && i >= 44) return 'warn';
    const x = r();
    return x > 0.97 ? 'bad' : x > 0.93 ? 'warn' : 'ok';
  });
}

/** Disponibilidade (%) de cada bloco de 30 min nas últimas 24 h, derivada dos blocos acima. */
export function availabilityPct(d: Device): number[] {
  const r = rng(hash(d.id + 'ap'));
  return availability(d).map((s) => (s === 'ok' ? 93 + r() * 7 : s === 'warn' ? 80 + r() * 9.9 : r() * 72));
}

/** Latência (ms) das últimas 24 h, 48 pontos. */
export function latencySeries(d: Device): number[] {
  const r = rng(hash(d.id + 'lt'));
  const base = d.latency ?? 40;
  return Array.from({ length: 48 }, (_, i) => {
    const drift = d.conn === 'instavel' && i < 40 ? base * 0.25 : base;
    return Math.max(4, Math.round(drift * (0.7 + r() * 0.6)));
  });
}

/* ───────────── Cadastro: mesmas informações do sistema original ───────────── */

/** Tipos de dispositivo e a categoria derivada de cada um (categoria não é escolhida, vem do tipo). */
export const TYPES: { type: string; kind: Kind; category: string; tag: string; video: boolean }[] = [
  { type: 'Câmera fixa', kind: 'camera', category: 'Aquisição de imagem', tag: 'Fonte de vídeo', video: true },
  { type: 'Câmera PTZ', kind: 'camera', category: 'Aquisição de imagem', tag: 'Fonte de vídeo', video: true },
  { type: 'Leitor LPR', kind: 'acesso', category: 'Aquisição de imagem', tag: 'Fonte de vídeo', video: true },
  { type: 'Leitor facial', kind: 'acesso', category: 'Controle de acesso', tag: 'Acesso', video: false },
  { type: 'Catraca', kind: 'acesso', category: 'Controle de acesso', tag: 'Acesso', video: false },
  { type: 'Controladora de acesso', kind: 'acesso', category: 'Controle de acesso', tag: 'Acesso', video: false },
  { type: 'Gravador (NVR)', kind: 'infra', category: 'Infraestrutura', tag: 'Gravação', video: false },
  { type: 'Switch PoE', kind: 'infra', category: 'Infraestrutura', tag: 'Rede', video: false },
  { type: 'Gateway de vídeo', kind: 'infra', category: 'Infraestrutura', tag: 'Rede', video: false },
  { type: 'Servidor de análise', kind: 'infra', category: 'Infraestrutura', tag: 'Processamento', video: false },
];
export const TYPE_BY_NAME = Object.fromEntries(TYPES.map((t) => [t.type, t])) as Record<string, (typeof TYPES)[number]>;

export type CapTone = 'info' | 'warning' | 'danger' | 'feature' | 'neutral';
/** Perfil de hardware homologado pelo laboratório Nyvex (define driver, portas e capacidades). */
export type Profile = {
  id: string; types: string[]; vendor: string; model: string; name: string; driver: string;
  certified: boolean; desc: string; caps: [string, CapTone][]; rtsp?: number; http: number; path?: string;
};
export const PROFILES: Profile[] = [
  { id: 'hik-2347g2p', types: ['Câmera fixa'], vendor: 'Hikvision', model: 'DS-2CD2347G2P-LSU/SL', name: 'ColorVu Panoramic 180° AcuSense Live Guard', driver: 'hikvision_isapi', certified: true,
    desc: 'Equipamento padrão do laboratório de bancada Nyvex. Calibração milimétrica de coordenadas 0..1000 e estrobo ativo.', caps: [['IA / Perímetro', 'info'], ['ColorVu', 'warning'], ['Live Guard', 'danger'], ['Áudio 2-Way', 'feature']], rtsp: 554, http: 80, path: '/Streaming/Channels/101' },
  { id: 'hik-2347g2', types: ['Câmera fixa'], vendor: 'Hikvision', model: 'DS-2CD2347G2-LU', name: 'ColorVu 4 MP Turret', driver: 'hikvision_isapi', certified: true,
    desc: 'Câmera turret ColorVu homologada com eventos de linha e intrusão.', caps: [['IA / Perímetro', 'info'], ['ColorVu', 'warning']], rtsp: 554, http: 80, path: '/Streaming/Channels/101' },
  { id: 'hik-2143g2', types: ['Câmera fixa'], vendor: 'Hikvision', model: 'DS-2CD2143G2-IS', name: 'AcuSense 4 MP Dome', driver: 'hikvision_isapi', certified: true,
    desc: 'Dome AcuSense com classificação de pessoas e veículos.', caps: [['IA / Perímetro', 'info'], ['Áudio 2-Way', 'feature']], rtsp: 554, http: 80, path: '/Streaming/Channels/101' },
  { id: 'intel-3230', types: ['Câmera fixa'], vendor: 'Intelbras', model: 'VIP 3230 B', name: 'Bullet 2 MP IR 30 m', driver: 'intelbras_cgi', certified: true,
    desc: 'Bullet de entrada homologada para áreas externas.', caps: [['IR 30 m', 'neutral']], rtsp: 554, http: 80, path: '/cam/realmonitor?channel=1&subtype=0' },
  { id: 'hik-ptz-4425', types: ['Câmera PTZ'], vendor: 'Hikvision', model: 'DS-2DE4425IW-DE', name: 'PTZ 4 MP 25× DarkFighter', driver: 'hikvision_isapi', certified: true,
    desc: 'Speed dome com rastreamento automático e presets calibrados.', caps: [['PTZ', 'info'], ['Auto-tracking', 'feature']], rtsp: 554, http: 80, path: '/Streaming/Channels/101' },
  { id: 'hik-lpr-403', types: ['Leitor LPR'], vendor: 'Hikvision', model: 'iDS-TCM403', name: 'Câmera ANPR de cancela', driver: 'hikvision_anpr', certified: true,
    desc: 'Leitura de placas Mercosul com lista de permissão local.', caps: [['LPR', 'info'], ['Lista local', 'neutral']], rtsp: 554, http: 80, path: '/Streaming/Channels/101' },
  { id: 'cid-idface', types: ['Leitor facial'], vendor: 'Control iD', model: 'iDFace Max', name: 'Leitor facial com QR Code', driver: 'controlid_api', certified: true,
    desc: 'Reconhecimento facial em até 0,3 s, com sincronização de cadastro.', caps: [['Face', 'info'], ['QR Code', 'neutral']], http: 80 },
  { id: 'hik-k1t671', types: ['Leitor facial'], vendor: 'Hikvision', model: 'DS-K1T671M', name: 'Terminal facial 7"', driver: 'hikvision_isapi', certified: true,
    desc: 'Terminal facial com cartão e senha.', caps: [['Face', 'info'], ['Cartão', 'neutral']], http: 80 },
  { id: 'cid-idblock', types: ['Catraca'], vendor: 'Control iD', model: 'iDBlock Next', name: 'Catraca com leitor integrado', driver: 'controlid_api', certified: true,
    desc: 'Catraca bidirecional com pictograma e urna.', caps: [['Bidirecional', 'neutral']], http: 80 },
  { id: 'intel-ct3000', types: ['Controladora de acesso'], vendor: 'Intelbras', model: 'CT 3000 4PB', name: 'Controladora 4 portas', driver: 'intelbras_access', certified: true,
    desc: 'Controladora de 4 portas com antipassback.', caps: [['4 portas', 'neutral'], ['Antipassback', 'info']], http: 80 },
  { id: 'hik-nvr-7732', types: ['Gravador (NVR)'], vendor: 'Hikvision', model: 'DS-7732NI-K4', name: 'NVR 32 canais 4K', driver: 'hikvision_isapi', certified: true,
    desc: 'NVR com 4 baias e reprodução sincronizada.', caps: [['32 canais', 'neutral']], http: 8000 },
  { id: 'intel-nvd3332', types: ['Gravador (NVR)'], vendor: 'Intelbras', model: 'NVD 3332', name: 'NVR 32 canais', driver: 'intelbras_cgi', certified: true, desc: 'NVR de 32 canais com 2 baias.', caps: [['32 canais', 'neutral']], http: 80 },
  { id: 'intel-sg2404', types: ['Switch PoE'], vendor: 'Intelbras', model: 'SG 2404 PoE', name: 'Switch gerenciável 24 portas PoE+', driver: 'snmp_v2', certified: true, desc: 'Monitorado por SNMP: portas, PoE e perda de pacotes.', caps: [['SNMP', 'neutral']], http: 80 },
  { id: 'nyx-edge', types: ['Gateway de vídeo'], vendor: 'Nyvex', model: 'Edge G2', name: 'Gateway de vídeo de borda', driver: 'nyvex_edge', certified: true, desc: 'Converte e distribui streams da borda para a nuvem.', caps: [['Transcodificação', 'info']], http: 8000 },
  { id: 'nyx-a1', types: ['Servidor de análise'], vendor: 'Nyvex', model: 'Analytics A1', name: 'Servidor de IA para faces e placas', driver: 'nyvex_edge', certified: true, desc: 'Processa faces e placas em tempo real.', caps: [['IA', 'info']], http: 8000 },
  { id: 'generic', types: TYPES.map((t) => t.type), vendor: 'Genérico', model: 'ONVIF / RTSP', name: 'Perfil genérico', driver: 'onvif_generic', certified: false,
    desc: 'Sem homologação de bancada: só vídeo e heartbeat. PTZ, eventos e saúde detalhada podem não funcionar.', caps: [], rtsp: 554, http: 80, path: '/stream1' },
];
export const profileFor = (d: Pick<Device, 'vendor' | 'model'>) => PROFILES.find((p) => p.vendor === d.vendor && p.model === d.model)
  ?? PROFILES.find((p) => p.vendor === d.vendor && p.model.startsWith(d.model)) ?? PROFILES[PROFILES.length - 1];
