/*
 * Engines, fiel à tela do sistema (homolog · sol-unibrasil · /engines).
 * Mesmo contrato do GET /v1/engines: slug, name, role, kind, configured, reachable, healthy,
 * status_code, latency_ms, breaker { state, failures, last_error } e payload (resposta da sonda).
 * Estado derivado igual ao sistema: não configurado → fora do ar → degradado → no ar.
 * Catálogo e valores são dados de exemplo, montados com os engines que aparecem no menu do sistema.
 */
import type { IconName } from '../../ds/icons/icons';

export type Kind = 'biometrics' | 'video' | 'geo' | 'ocr' | 'platform';
export type BreakerState = 'closed' | 'half_open' | 'open';
export type Engine = {
  slug: string;
  name: string;
  role: string;
  kind: Kind;
  configured: boolean;
  reachable: boolean;
  healthy: boolean;
  status_code: number | null;
  latency_ms: number | null;
  breaker: { state: BreakerState; failures: number; last_error?: string } | null;
  payload: Record<string, unknown> | null;
  /** Endereço declarado na configuração (só para exibição no painel). */
  url: string | null;
};

export type State = 'up' | 'degraded' | 'down' | 'unconfigured';
export const STATE_LABEL: Record<State, string> = { up: 'No ar', degraded: 'Degradado', down: 'Fora do ar', unconfigured: 'Não configurado' };
export const STATE_RANK: Record<State, number> = { down: 0, degraded: 1, up: 2, unconfigured: 3 };

export function stateOf(e: Engine): State {
  if (!e.configured) return 'unconfigured';
  if (!e.reachable) return 'down';
  if (!e.healthy) return 'degraded';
  return 'up';
}
/** Mesmo texto explicativo do sistema, mostrado no tooltip e no painel. */
export function whyOf(e: Engine): string {
  switch (stateOf(e)) {
    case 'up': return 'Respondeu 2xx na sonda de saúde.';
    case 'degraded': return `O serviço respondeu (${e.status_code}), mas a sonda de saúde não está nesse caminho. Ele está de pé.`;
    case 'down': return `Não respondeu: ${(e.payload?.error as string) || '—'}`;
    case 'unconfigured': return 'Sem URL declarada na configuração. Não é falha, é ausência de configuração.';
  }
}

export const KIND_LABEL: Record<Kind, string> = { biometrics: 'Biometria', video: 'Vídeo', geo: 'Geo', ocr: 'OCR', platform: 'Plataforma' };
export const KIND_ICON: Record<Kind, IconName> = { biometrics: 'faces', video: 'camera', geo: 'map', ocr: 'car', platform: 'server' };
export const BREAKER_LABEL: Record<BreakerState, string> = { closed: 'Fechado', half_open: 'Meio aberto', open: 'Aberto' };
export const BREAKER_HINT: Record<BreakerState, string> = {
  closed: 'Chamadas passando',
  half_open: 'Testando após falhas',
  open: 'Chamadas bloqueadas',
};

/** Timeout da sonda por serviço (probe_timeout_s). */
export const PROBE_TIMEOUT_S = 5;
/** O sistema sonda de novo a cada 30 s. */
export const REFETCH_MS = 30_000;
/** Acima disso a latência fica em atenção (mesmo corte do sistema). */
export const LAT_WARN = 500;

const up = (slug: string, name: string, kind: Kind, role: string, latency: number, payload: Record<string, unknown>, extra: Partial<Engine> = {}): Engine => ({
  slug, name, kind, role, configured: true, reachable: true, healthy: true, status_code: 200, latency_ms: latency,
  breaker: { state: 'closed', failures: 0 }, payload, url: `http://${slug}.vve.svc:8080`, ...extra,
});

export const ENGINES: Engine[] = [
  up('video-gateway', 'Video Gateway', 'video', 'Recebe os streams das câmeras e entrega o vídeo ao vivo e as gravações.', 22,
    { status: 'ok', version: '3.8.2', streams_active: 214 }),
  up('face-acquisition', 'Face Acquisition', 'biometrics', 'Detecta e recorta as faces nos streams das câmeras e envia para identificação.', 38,
    { status: 'ok', version: '2.4.1', model: 'scrfd_10g' }),
  up('identity-engine', 'Identity Engine', 'biometrics', 'Compara as faces capturadas com o cadastro de pessoas e as listas de observação.', 64,
    { status: 'ok', version: '2.4.1', gallery_size: 18342 }),
  up('vehicle-engine', 'Vehicle AI', 'video', 'Classifica veículos por tipo, cor, marca e modelo.', 92,
    { status: 'ok', version: '1.9.0' }),
  up('lpr-engine', 'LPR', 'ocr', 'Lê as placas dos veículos nas câmeras de portaria e estacionamento.', 71,
    { status: 'ok', version: '4.1.3', region: 'BR-mercosul' }),
  {
    slug: 'object-engine', name: 'Object Engine', kind: 'video', role: 'Detecta objetos na cena, como mochilas, volumes abandonados e armas.',
    configured: true, reachable: true, healthy: false, status_code: 404, latency_ms: 118,
    breaker: { state: 'closed', failures: 0 }, payload: { detail: 'Not Found' }, url: 'http://object-engine.vve.svc:8080',
  },
  up('attribute-engine', 'Attribute Engine', 'video', 'Extrai características das pessoas: roupa, cores, acessórios e faixa etária.', 143,
    { status: 'ok', version: '1.6.4' }),
  {
    slug: 'pose-engine', name: 'Pose Engine', kind: 'video', role: 'Estima a postura corporal (em pé, sentado, caído) para alertas de queda.',
    configured: false, reachable: false, healthy: false, status_code: null, latency_ms: null, breaker: null, payload: null, url: null,
  },
  {
    slug: 'action-engine', name: 'Action Engine', kind: 'video', role: 'Reconhece ações na cena, como correr, brigar ou pular o muro.',
    configured: true, reachable: false, healthy: false, status_code: null, latency_ms: null,
    breaker: { state: 'open', failures: 7, last_error: 'ConnectTimeout: action-engine.vve.svc:8080' },
    payload: { error: 'timeout após 5 s' }, url: 'http://action-engine.vve.svc:8080',
  },
  up('routes-engine', 'Routes Engine', 'geo', 'Reconstrói o trajeto de pessoas e veículos entre as câmeras do campus.', 612,
    { status: 'ok', version: '0.9.7' }, { breaker: { state: 'half_open', failures: 2, last_error: 'ReadTimeout após 5 s' } }),
  up('relationship-engine', 'Relationship Engine', 'geo', 'Calcula quem e quais veículos aparecem juntos (Matriz de relacionamento).', 88,
    { status: 'ok', version: '1.2.0' }),
  {
    slug: 'prediction-engine', name: 'Prediction Engine', kind: 'geo', role: 'Projeta horários e locais com mais chance de ocorrência.',
    configured: false, reachable: false, healthy: false, status_code: null, latency_ms: null, breaker: null, payload: null, url: null,
  },
  up('search-engine', 'Search Engine', 'platform', 'Busca por características e busca forense nas gravações.', 47,
    { status: 'ok', version: '2.0.5', index: 'green' }),
  up('analytics-engine', 'Analytics Engine', 'platform', 'Agrega os eventos para os indicadores de Análises.', 55,
    { status: 'ok', version: '1.4.2' }),
  {
    slug: 'rules-engine', name: 'Rules Engine', kind: 'platform', role: 'Avalia as regras de automação e as listas de observação a cada evento.',
    configured: true, reachable: true, healthy: false, status_code: 405, latency_ms: 34,
    breaker: { state: 'closed', failures: 0 }, payload: { detail: 'Method Not Allowed' }, url: 'http://rules-engine.vve.svc:8080',
  },
  up('notification-engine', 'Notification Engine', 'platform', 'Envia os alertas por push, e-mail e integrações.', 31,
    { status: 'ok', version: '1.1.9', queue: 0 }),
];

/** Nova sonda: a latência dos que respondem varia um pouco, como numa sondagem real. */
export function probe(list: Engine[]): Engine[] {
  return list.map((e) => {
    const base = ENGINES.find((x) => x.slug === e.slug)?.latency_ms;
    if (base == null || e.latency_ms == null) return e;
    const j = 0.82 + Math.random() * 0.36;
    return { ...e, latency_ms: Math.max(8, Math.round(base * j)) };
  });
}
