/**
 * Ocorrências (Dispatch Center): dados sintéticos.
 * A homologação (sol-unibrasil, lida em 16/11/2026) tem só 1 ocorrência de demonstração, concluída,
 * nenhuma viatura ou equipe e 3.923 alertas aguardando supervisão. O restante ilustra o fluxo completo.
 */
import type { IconName } from '../../ds/icons/icons';

export type Prio = 'critica' | 'alta' | 'media' | 'baixa';
export type Stage = 'nova' | 'despachada' | 'no_local' | 'concluida' | 'arquivada';
export type Kind = 'invasao' | 'furto' | 'watchlist' | 'veiculo' | 'agressao' | 'objeto' | 'medico' | 'dano' | 'outro';
export type Ev = { at: number; who: string; what: string; note?: string; kind: 'create' | 'stage' | 'note' | 'link' | 'dispatch' | 'add' };
export type Party = { kind: 'pessoa' | 'veiculo' | 'objeto'; label: string; sub: string; seed?: number };

export type Place = { address: string; district: string; city: string; uf: string; zone: string };
export type Reporter = { name: string; relation: string; phone: string; doc: string };

export type Occ = {
  id: string;
  code: string;
  title: string;
  kind: Kind;
  prio: Prio;
  stage: Stage;
  local: string;
  cam?: string;
  at: number;
  updated: number;
  by: string;
  team?: string;
  desc?: string;
  place?: Place;
  reporter?: Reporter;
  outcome?: string;
  alerts: number;
  evidence: number;
  parties: Party[];
  events: Ev[];
  x: number; y: number;
  demo?: boolean;
};

export const ME = 'Você';
export const STAGES: Stage[] = ['nova', 'despachada', 'no_local', 'concluida', 'arquivada'];
export const STAGE_LABEL: Record<Stage, string> = { nova: 'Nova', despachada: 'Despachada', no_local: 'No local', concluida: 'Concluída', arquivada: 'Arquivada' };
export const STAGE_HINT: Record<Stage, string> = {
  nova: 'Registrada, aguardando despacho',
  despachada: 'Equipe a caminho',
  no_local: 'Equipe atendendo no local',
  concluida: 'Atendimento encerrado com desfecho',
  arquivada: 'Fora do quadro, mantida no histórico',
};
export const NEXT: Partial<Record<Stage, { to: Stage; label: string; icon: IconName }>> = {
  nova: { to: 'despachada', label: 'Despachar', icon: 'forward' },
  despachada: { to: 'no_local', label: 'Chegou no local', icon: 'pin' },
  no_local: { to: 'concluida', label: 'Concluir', icon: 'check' },
  concluida: { to: 'arquivada', label: 'Arquivar', icon: 'stack' },
};
export const PRIO_LABEL: Record<Prio, string> = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const PRIO_RANK: Record<Prio, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
export const KIND_LABEL: Record<Kind, string> = {
  invasao: 'Invasão de área', furto: 'Furto ou roubo', watchlist: 'Pessoa em watchlist', veiculo: 'Veículo suspeito', agressao: 'Agressão ou briga',
  objeto: 'Objeto abandonado', medico: 'Atendimento médico', dano: 'Dano ao patrimônio', outro: 'Outros',
};
export const KIND_ICON: Record<Kind, IconName> = {
  invasao: 'shield', furto: 'lock', watchlist: 'eye', veiculo: 'car', agressao: 'people', objeto: 'stack', medico: 'plus', dano: 'wrench', outro: 'ocor',
};
export const OUTCOMES = ['Resolvida no local', 'Encaminhada à polícia', 'Sem ocorrência no local (falso alarme)', 'Atendida pela brigada', 'Encaminhada a outro setor'];

export type Team = { id: string; name: string; kind: 'viatura' | 'moto' | 'equipe'; people: string };
export const TEAMS: Team[] = [
  { id: 't1', name: 'Viatura 01', kind: 'viatura', people: 'Ronda Norte · 2 vigilantes' },
  { id: 't2', name: 'Viatura 02', kind: 'viatura', people: 'Ronda Sul · 2 vigilantes' },
  { id: 't3', name: 'Moto 01', kind: 'moto', people: 'Apoio rápido · 1 vigilante' },
  { id: 't4', name: 'Equipe Portaria', kind: 'equipe', people: 'Portaria principal · 3 pessoas' },
  { id: 't5', name: 'Brigada', kind: 'equipe', people: 'Primeiros socorros · 2 pessoas' },
];
export const TEAM_ICON: Record<Team['kind'], IconName> = { viatura: 'car', moto: 'activity', equipe: 'people' };

export const LOCAIS = ['Bloco 02', 'Bloco 03', 'Bloco 04', 'Bloco 06', 'Bloco 07', 'Bloco 08', 'Estacionamento', 'Portaria principal', 'Biblioteca'];
export const CAMS = ['Bloco 07 Sala Alimentação', 'Bloco 08 Saguão', 'Bloco 06 Externa 2', 'Bloco 03 Ram TE', 'Estacionamento · Cancela Norte', 'Bloco 02 BWC 1A', 'Bloco 08 Fundos TE'];
const OPS = ['Elisa Santos', 'Bruno Tavares', 'Fernanda Okada', 'Operador UX'];

const MIN = 60e3, H = 60 * MIN, D = 24 * H;
let n = 120;
export const nextCode = () => `OC-2611-${String(++n).padStart(4, '0')}`;

type Seed = Omit<Occ, 'id' | 'code' | 'at' | 'updated' | 'events' | 'alerts' | 'evidence' | 'parties' | 'by'> & Partial<Pick<Occ, 'alerts' | 'evidence' | 'parties' | 'by'>> & { ago: number; steps?: [Stage, number, string?][]; notes?: [number, string, string][] };

function make(now: number, s: Seed): Occ {
  const at = now - s.ago;
  const by = s.by ?? OPS[n % OPS.length];
  const events: Ev[] = [{ at, who: by, what: 'Ocorrência registrada', note: s.cam ? `A partir de alerta em ${s.cam}` : undefined, kind: 'create' }];
  for (const [st, after, who] of s.steps ?? []) {
    events.push(st === 'despachada'
      ? { at: at + after, who: who ?? by, what: `Despachada para ${s.team}`, kind: 'dispatch' }
      : { at: at + after, who: who ?? s.team ?? by, what: `Movida para ${STAGE_LABEL[st]}`, note: st === 'concluida' ? s.outcome : undefined, kind: 'stage' });
  }
  for (const [after, who, note] of s.notes ?? []) events.push({ at: at + after, who, what: 'Nota', note, kind: 'note' });
  events.sort((a, b) => b.at - a.at);
  const { ago: _a, steps: _s, notes: _n, ...rest } = s;
  return { alerts: 0, evidence: 0, parties: [], ...rest, by, id: `oc${++n}`, code: nextCode(), at, updated: events[0].at, events };
}

export function build(now: number): Occ[] {
  return [
    make(now, { title: 'Pessoa pulando o muro dos fundos', kind: 'invasao', prio: 'critica', stage: 'nova', local: 'Bloco 08', cam: 'Bloco 08 Fundos TE', ago: 4 * MIN, alerts: 3, evidence: 2, x: 72, y: 30,
      desc: 'Perímetro disparou 3 vezes em 2 min na divisa dos fundos. Uma pessoa visível no clipe.', parties: [{ kind: 'pessoa', label: 'Pessoa não identificada', sub: 'Camiseta escura, mochila' }] }),
    make(now, { title: 'Match de watchlist na portaria', kind: 'watchlist', prio: 'alta', stage: 'nova', local: 'Portaria principal', cam: 'Bloco 03 Ram TE', ago: 11 * MIN, alerts: 1, evidence: 1, x: 30, y: 62,
      parties: [{ kind: 'pessoa', label: 'Marcos Vieira Lopes', sub: 'Watchlist · Mandados em aberto · 88%', seed: 148 }] }),
    make(now, { title: 'Mochila sem dono no saguão', kind: 'objeto', prio: 'media', stage: 'nova', local: 'Bloco 08', cam: 'Bloco 08 Saguão', ago: 19 * MIN, alerts: 1, evidence: 1, x: 66, y: 40,
      parties: [{ kind: 'objeto', label: 'Mochila preta', sub: 'Perto da escada, há 6 min sem dono' }] }),
    make(now, { title: 'Veículo de lista de restrição na cancela', kind: 'veiculo', prio: 'alta', stage: 'despachada', local: 'Estacionamento', cam: 'Estacionamento · Cancela Norte', team: 'Moto 01', ago: 26 * MIN, alerts: 1, evidence: 1, x: 18, y: 22,
      steps: [['despachada', 3 * MIN]], parties: [{ kind: 'veiculo', label: 'RVK2C19', sub: 'Furto e roubo · SINESP · Gol prata' }] }),
    make(now, { title: 'Discussão com agressão no refeitório', kind: 'agressao', prio: 'critica', stage: 'no_local', local: 'Bloco 07', cam: 'Bloco 07 Sala Alimentação', team: 'Viatura 01', ago: 38 * MIN, alerts: 2, evidence: 3, x: 46, y: 46,
      steps: [['despachada', 2 * MIN], ['no_local', 7 * MIN]], notes: [[12 * MIN, 'Viatura 01', 'Separamos os envolvidos. Um com corte leve no braço; brigada chamada.']],
      parties: [{ kind: 'pessoa', label: 'Estudante A', sub: 'Envolvido · identificado pela carteirinha' }, { kind: 'pessoa', label: 'Estudante B', sub: 'Envolvido · ferimento leve' }] }),
    make(now, { title: 'Aluno passou mal na biblioteca', kind: 'medico', prio: 'alta', stage: 'no_local', local: 'Biblioteca', team: 'Brigada', ago: 52 * MIN, x: 38, y: 74, by: 'Equipe Portaria',
      steps: [['despachada', 1 * MIN], ['no_local', 4 * MIN]], notes: [[9 * MIN, 'Brigada', 'Consciente, pressão baixa. SAMU acionado por precaução.']] }),
    make(now, { title: 'Porta de laboratório forçada', kind: 'dano', prio: 'media', stage: 'despachada', local: 'Bloco 04', team: 'Viatura 02', ago: 1.3 * H, evidence: 2, x: 84, y: 64,
      steps: [['despachada', 9 * MIN]] }),
    make(now, { title: 'Furto de celular relatado na cantina', kind: 'furto', prio: 'media', stage: 'concluida', local: 'Bloco 06', cam: 'Bloco 06 Externa 2', team: 'Viatura 02', ago: 3.2 * H, alerts: 0, evidence: 4, x: 56, y: 70,
      outcome: 'Encaminhada à polícia', steps: [['despachada', 6 * MIN], ['no_local', 14 * MIN], ['concluida', 52 * MIN]],
      reporter: { name: 'Ana Ribeiro', relation: 'Vítima', phone: '(41) 99812-4410', doc: 'RG 9.876.543-2' },
      place: { address: 'R. Prof. Pedro Viriato Parigot de Souza, 5300', district: 'Campo Comprido', city: 'Curitiba', uf: 'PR', zone: '4º Distrito Policial' },
      parties: [{ kind: 'pessoa', label: 'Vítima', sub: 'Estudante · B.O. registrado' }, { kind: 'objeto', label: 'Celular', sub: 'iPhone 13 azul' }] }),
    make(now, { title: 'Pessoa no telhado do Bloco 02', kind: 'invasao', prio: 'alta', stage: 'concluida', local: 'Bloco 02', cam: 'Bloco 02 BWC 1A', team: 'Viatura 01', ago: 6 * H, alerts: 4, evidence: 1, x: 24, y: 44,
      outcome: 'Sem ocorrência no local (falso alarme)', steps: [['despachada', 2 * MIN], ['no_local', 8 * MIN], ['concluida', 20 * MIN]], notes: [[18 * MIN, 'Viatura 01', 'Era um técnico da manutenção do ar-condicionado, com ordem de serviço.']] }),
    make(now, { title: '[DEMO] Registro de validação da análise da pessoa', kind: 'outro', prio: 'baixa', stage: 'concluida', local: 'Bloco 03', ago: 7 * D, by: 'Leo Lima [DEMO]', demo: true, x: 34, y: 34,
      parties: [{ kind: 'pessoa', label: 'Leo Lima [DEMO]', sub: 'Pessoa da demonstração' }] }),
    make(now, { title: 'Carro estacionado em vaga de emergência', kind: 'veiculo', prio: 'baixa', stage: 'arquivada', local: 'Estacionamento', team: 'Equipe Portaria', ago: 2 * D, x: 14, y: 30,
      outcome: 'Resolvida no local', steps: [['despachada', 10 * MIN], ['no_local', 18 * MIN], ['concluida', 25 * MIN], ['arquivada', 1 * D]] }),
    make(now, { title: 'Pichação na fachada do Bloco 06', kind: 'dano', prio: 'baixa', stage: 'arquivada', local: 'Bloco 06', ago: 3 * D, evidence: 3, x: 58, y: 78,
      outcome: 'Encaminhada a outro setor', steps: [['concluida', 2 * H], ['arquivada', 1 * D]] }),
  ];
}

/* ── formatação ── */
export function ago(t: number, now: number) {
  const d = Math.max(0, now - t);
  if (d < 45e3) return 'agora';
  if (d < H) return `há ${Math.max(1, Math.round(d / MIN))} min`;
  if (d < D) return `há ${Math.round(d / H)} h`;
  return `há ${Math.round(d / D)} d`;
}
export const dur = (ms: number) => (ms < H ? `${Math.max(1, Math.round(ms / MIN))} min` : `${Math.floor(ms / H)} h ${Math.round((ms % H) / MIN)} min`);
export const hm = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const fullDate = (t: number) => `${new Date(t).toLocaleDateString('pt-BR')} · ${hm(t)}`;
/** Tempo parado no estágio atual. */
export const inStage = (o: Occ) => {
  const e = o.events.find((x) => x.kind === 'stage' || x.kind === 'dispatch');
  return e ? e.at : o.at;
};
/** Nova há mais de 5 min sem despacho, ou despachada há mais de 15 min sem chegada. */
export const late = (o: Occ, now: number) => (o.stage === 'nova' && now - o.at > 5 * MIN) || (o.stage === 'despachada' && now - inStage(o) > 15 * MIN);
export const MINUTE = MIN;
