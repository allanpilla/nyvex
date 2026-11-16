/**
 * Watchlists (listas de observação). As quatro primeiras listas e seus monitorados vêm da homologação
 * (lidas em 16/11/2026); as demais são sintéticas, para a tela ter volume. Os matches são de exemplo.
 */
export type WlState = 'ativa' | 'pausada';
export type WlPerson = { id: string; name: string; reason: string; threshold: number; until: string | null; added: string };
export type WlVehicle = { id: string; plate: string; model?: string; reason: string; until: string | null; added: string };
export type MatchStatus = 'pendente' | 'confirmado' | 'descartado';
export type WlMatch = { id: string; kind: 'pessoa' | 'veiculo'; who: string; cam: string; local: string; at: string; score: number; status: MatchStatus };
export type Watchlist = {
  id: string; name: string; description: string; justification: string; state: WlState;
  created: string; updated: string; createdBy: string;
  people: WlPerson[]; vehicles: WlVehicle[]; matches: WlMatch[];
  /** Leitura de incidentes exige permissão adicional (estado “Atividade restrita” do sistema atual). */
  restricted?: boolean;
};

export const NOW = new Date('2026-11-16T10:30:00-03:00').getTime();
const h = (hours: number) => new Date(NOW - hours * 3600e3).toISOString();

export const STATE_LABEL: Record<WlState, string> = { ativa: 'Ativa', pausada: 'Pausada' };
export const MATCH_LABEL: Record<MatchStatus, string> = { pendente: 'Aguardando revisão', confirmado: 'Revisado · procede', descartado: 'Revisado · descartado' };

/** Pessoas cadastradas que podem ser incluídas (busca da tela atual: mín. 2 caracteres). */
export const REGISTERED = ['Elisa Santos', 'Andrei', 'Thiago Suzue', 'Leo Lima [DEMO]', 'Teste QA perfil', 'Carla Mendes', 'Rafael Souza', 'Juliana Prado', 'Marcos Lima', 'Patrícia Rocha', 'André Kowalski', 'Bruno Tavares', 'Fernanda Okada'];
export const THRESHOLDS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

export const WATCHLISTS: Watchlist[] = [
  {
    id: 'wl-7f3a1c90-veic', name: 'Lista de veículos', description: 'Teste de criação. A ser testado posteriormente por QA.',
    justification: 'Criada para validar o fluxo de veículos antes da liberação para operação.', state: 'pausada',
    created: '2026-10-23T09:12:00-03:00', updated: '2026-10-23T09:40:00-03:00', createdBy: 'QA Nyvex',
    people: [],
    vehicles: [{ id: 'v1', plate: 'RHK2D19', model: 'Fiat Strada · branca', reason: 'Veículo de teste do QA.', until: '2026-12-31T12:00:00-03:00', added: '2026-10-23T09:38:00-03:00' }],
    matches: [],
  },
  {
    id: 'wl-2b8e44d1-qafc', name: 'Acompanhamento QA Faces', description: 'Testando acompanhamento das pessoas por QA',
    justification: 'Validação do reconhecimento facial nas portarias com pessoas voluntárias da equipe de QA.', state: 'ativa',
    created: '2026-10-21T14:05:00-03:00', updated: '2026-10-23T16:22:00-03:00', createdBy: 'QA Nyvex',
    people: [
      { id: 'p1', name: 'Elisa Santos', reason: 'teste QA', threshold: 75, until: null, added: '2026-10-21T14:10:00-03:00' },
      { id: 'p2', name: 'Andrei', reason: 'PEssoa passa todo dia na unibrasil', threshold: 50, until: '2027-01-01T00:00:00-03:00', added: '2026-10-22T08:31:00-03:00' },
      { id: 'p3', name: 'Thiago Suzue', reason: 'Pessoa suspeita', threshold: 50, until: '2027-01-01T00:00:00-03:00', added: '2026-10-23T16:20:00-03:00' },
    ],
    vehicles: [{ id: 'v2', plate: 'TAU1F42', reason: 'teste de qa até 15/11.', until: '2026-11-16T23:59:00-03:00', added: '2026-10-23T16:22:00-03:00' }],
    matches: [
      { id: 'm1', kind: 'pessoa', who: 'Andrei', cam: 'Portaria 1 · Entrada', local: 'Portarias', at: h(1.2), score: 82, status: 'pendente' },
      { id: 'm2', kind: 'veiculo', who: 'TAU1F42', cam: 'Cancela norte · LPR', local: 'Estacionamento', at: h(3.5), score: 97, status: 'pendente' },
      { id: 'm3', kind: 'pessoa', who: 'Elisa Santos', cam: 'Bloco 02 · Entrada', local: 'Bloco 02', at: h(5.1), score: 91, status: 'confirmado' },
      { id: 'm4', kind: 'pessoa', who: 'Thiago Suzue', cam: 'Portaria 3 · Pedestres', local: 'Portarias', at: h(26), score: 54, status: 'descartado' },
      { id: 'm5', kind: 'pessoa', who: 'Andrei', cam: 'Portaria 1 · Entrada', local: 'Portarias', at: h(25), score: 79, status: 'confirmado' },
      { id: 'm6', kind: 'pessoa', who: 'Andrei', cam: 'Ginásio · Entrada 1', local: 'Ginásio', at: h(49), score: 63, status: 'confirmado' },
    ],
  },
  {
    id: 'wl-91c0e7aa-smk', name: 'smoke-010435', description: 'smoke de homologacao',
    justification: 'Teste automatizado de criação (smoke).', state: 'pausada',
    created: '2026-10-10T01:04:35-03:00', updated: '2026-10-10T01:04:35-03:00', createdBy: 'Automação',
    people: [], vehicles: [], matches: [],
  },
  {
    id: 'wl-5d12f0b3-demo', name: '[DEMO] Validação de Watchlists', description: 'Cenário local sintético; mantido em pausa para validar UI e permissões.',
    justification: 'Cenário de demonstração para validar interface e permissões.', state: 'ativa',
    created: '2026-10-06T11:00:00-03:00', updated: '2026-10-07T10:15:00-03:00', createdBy: 'Nyvex',
    people: [{ id: 'p4', name: 'Leo Lima [DEMO]', reason: 'Apenas validação local DEMO; sem finalidade operacional.', threshold: 50, until: null, added: '2026-10-07T10:15:00-03:00' }],
    vehicles: [], matches: [], restricted: true,
  },
  // Sintéticas
  {
    id: 'wl-a4e9b2c7-port', name: 'Acesso restrito · Portarias', description: 'Ex-colaboradores com acesso revogado ao campus.',
    justification: 'Solicitação do RH e da Segurança Patrimonial (chamado SEG-2291).', state: 'ativa',
    created: '2026-09-02T10:00:00-03:00', updated: h(30), createdBy: 'Carla Mendes',
    people: [
      { id: 'p5', name: 'Marcos Lima', reason: 'Desligado em 08/2026; acesso revogado.', threshold: 80, until: '2027-02-28T23:59:00-03:00', added: '2026-09-02T10:05:00-03:00' },
      { id: 'p6', name: 'Bruno Tavares', reason: 'Desligado em 09/2026; acesso revogado.', threshold: 80, until: '2026-12-05T23:59:00-03:00', added: '2026-09-20T15:40:00-03:00' },
      { id: 'p7', name: 'Patrícia Rocha', reason: 'Contrato de terceirizada encerrado.', threshold: 75, until: '2026-10-31T23:59:00-03:00', added: '2026-08-01T09:00:00-03:00' },
    ],
    vehicles: [],
    matches: [
      { id: 'm7', kind: 'pessoa', who: 'Bruno Tavares', cam: 'Portaria 3 · Pedestres', local: 'Portarias', at: h(30), score: 86, status: 'pendente' },
    ],
  },
  {
    id: 'wl-c81d3f56-estc', name: 'Veículos com restrição · Estacionamento', description: 'Placas com entrada negada nas cancelas.',
    justification: 'Ocorrências registradas no estacionamento (OC-1184 e OC-1203).', state: 'ativa',
    created: '2026-08-14T08:20:00-03:00', updated: h(72), createdBy: 'Rafael Souza',
    people: [],
    vehicles: [
      { id: 'v3', plate: 'BEE4R22', model: 'VW Gol · prata', reason: 'Dano ao patrimônio (OC-1184).', until: '2027-03-01T23:59:00-03:00', added: '2026-08-14T08:25:00-03:00' },
      { id: 'v4', plate: 'QWE7J81', model: 'Honda CG 160 · preta', reason: 'Tentativa de acesso sem credencial (OC-1203).', until: '2026-12-10T23:59:00-03:00', added: '2026-09-03T17:10:00-03:00' },
    ],
    matches: [
      { id: 'm8', kind: 'veiculo', who: 'QWE7J81', cam: 'Cancela sul · LPR', local: 'Estacionamento', at: h(72), score: 99, status: 'confirmado' },
    ],
  },
  {
    id: 'wl-e2f7a913-vist', name: 'Visitantes recorrentes · Bloco 10', description: 'Visitantes sem cadastro que retornam com frequência à Reitoria.',
    justification: 'Pedido da Reitoria para conferência de credenciamento.', state: 'pausada',
    created: '2026-07-30T13:00:00-03:00', updated: '2026-09-15T09:00:00-03:00', createdBy: 'Juliana Prado',
    people: [{ id: 'p8', name: 'Fernanda Okada', reason: 'Conferir credenciamento de visitante.', threshold: 70, until: '2026-12-01T23:59:00-03:00', added: '2026-07-30T13:10:00-03:00' }],
    vehicles: [], matches: [],
  },
];

/* ───────────── utilidades ───────────── */
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtDT = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - NOW) / 86400e3) : null);
export const isExpired = (until: string | null) => !!until && new Date(until).getTime() < NOW;
/** Próximo vencimento entre os vínculos vigentes. */
export function nextExpiry(w: Watchlist): { until: string; who: string } | null {
  const all = [...w.people.map((p) => ({ until: p.until, who: p.name })), ...w.vehicles.map((v) => ({ until: v.until, who: v.plate }))]
    .filter((x): x is { until: string; who: string } => !!x.until && !isExpired(x.until))
    .sort((a, b) => a.until.localeCompare(b.until));
  return all[0] ?? null;
}
export const pending = (w: Watchlist) => w.matches.filter((m) => m.status === 'pendente').length;
export const ageText = (iso: string) => {
  const s = (NOW - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} d`;
};
export const expiryText = (until: string | null) => {
  if (!until) return 'sem vencimento';
  const d = daysLeft(until)!;
  if (d < 0 || isExpired(until)) return `expirou em ${fmtDay(until)}`;
  if (d <= 1) return 'vence hoje';
  return `até ${fmtDay(until)}`;
};
