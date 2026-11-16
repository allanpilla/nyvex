/**
 * Fila de alertas: dados sintéticos baseados no que a homologação mostra hoje
 * (sol-unibrasil · Alert Queue, lida em 16/11/2026): ~3,8 mil pendentes, quase todos
 * "Perimeter Intrusion" e "Line Crossing" repetidos nas mesmas câmeras, ~100 matches
 * de face (watchlist) de 3 a 6 dias atrás, nenhum alerta de placa e 5 reconhecidos.
 */

export type Kind = 'face' | 'placa' | 'perimetro' | 'linha' | 'camera';
export type Status = 'pendente' | 'reconhecido' | 'encerrado';
export type Prio = 'alta' | 'media' | 'baixa';

export type Cam = { id: string; name: string | null; local: string; ptz?: boolean };

export type Alert = {
  id: string;
  kind: Kind;
  cam: string;
  at: number;
  status: Status;
  /** face: pessoa da watchlist (ou null quando o cadastro não tem nome) */
  person?: string | null;
  score?: number;
  list?: string;
  seed?: number;
  plate?: string;
  /** câmera sem vídeo: minutos sem sinal */
  mins?: number;
  ackBy?: string; ackAt?: number;
  closedBy?: string; closedAt?: number;
  outcome?: string; justification?: string;
  fpReason?: string; reeval?: boolean;
  fwdTo?: string; fwdNote?: string; fwdAt?: number;
};

export const ME = 'Você';
export const USERS = ['Operador UX', 'Elisa Santos', 'Bruno Tavares', 'Fernanda Okada', 'Supervisão PC-1'];

export const CAMS: Record<string, Cam> = {
  c1: { id: '01a18cf0-fcbf-74e5-ad61-5f75b982a72c', name: 'Bloco 07 Sala Alimentação', local: 'Bloco 07', ptz: true },
  c2: { id: '01a18cf0-56ad-725b-8900-bf406d70a9c9', name: 'Bloco 08 Fundos TE', local: 'Bloco 08', ptz: true },
  c3: { id: '01a18cf0-76f8-76ee-bd8d-43236b85f8be', name: 'Bloco 08 Saguão', local: 'Bloco 08', ptz: true },
  c4: { id: '01a18cf2-2d7d-757b-8cd1-d9d2ed6a388b', name: 'Bloco 02 BWC 1A', local: 'Bloco 02' },
  c5: { id: '01a18cf1-0b3e-7c55-9a10-3f2c6d1e9a01', name: 'Bloco 03 Ram TE', local: 'Bloco 03' },
  c6: { id: '01a18cf1-0b3e-7c55-9a10-3f2c6d1e9a02', name: 'Bloco 03 Área Convivência', local: 'Bloco 03' },
  c7: { id: '01a18cf1-0b3e-7c55-9a10-3f2c6d1e9a03', name: 'Bloco 04 STI TE', local: 'Bloco 04' },
  c8: { id: '01a18cf1-0b3e-7c55-9a10-3f2c6d1e9a04', name: 'Bloco 08 Porta', local: 'Bloco 08' },
  c9: { id: '01a163f9-8d2e-74b1-a6c0-5e19b2f0c7d3', name: null, local: 'Sem local' },
  c10: { id: '01a18cf3-77a1-7e02-b4d4-9c6a2e8f1b10', name: 'Estacionamento · Cancela Norte', local: 'Estacionamento' },
};
export const camName = (c: Cam) => c.name ?? `Câmera ${c.id.slice(0, 8)}`;

export const KIND: Record<Kind, { label: string; short: string; icon: 'eye' | 'car' | 'shield' | 'activity' | 'nosignal'; prio: Prio }> = {
  face: { label: 'Match de watchlist', short: 'Watchlist', icon: 'eye', prio: 'alta' },
  placa: { label: 'Placa monitorada', short: 'Placa', icon: 'car', prio: 'alta' },
  perimetro: { label: 'Invasão de perímetro', short: 'Perímetro', icon: 'shield', prio: 'media' },
  linha: { label: 'Cruzamento de linha', short: 'Linha', icon: 'activity', prio: 'baixa' },
  camera: { label: 'Câmera sem vídeo', short: 'Câmera', icon: 'nosignal', prio: 'media' },
};
export const PRIO_LABEL: Record<Prio, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const PRIO_RANK: Record<Prio, number> = { alta: 0, media: 1, baixa: 2 };
export const STATUS_LABEL: Record<Status, string> = { pendente: 'Pendente', reconhecido: 'Reconhecido', encerrado: 'Encerrado' };

export const FP_REASONS = ['Sombra, reflexo ou chuva', 'Animal', 'Pessoa autorizada no local', 'Erro de detecção', 'Câmera mal posicionada', 'Outro'];
export const OUTCOMES = ['Sem ocorrência no local', 'Ocorrência confirmada · equipe acionada', 'Ocorrência confirmada · resolvida no local', 'Encaminhado à polícia', 'Teste ou manutenção'];

/* ── geração determinística ── */
let s = 7;
export const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const MIN = 60e3, H = 60 * MIN, D = 24 * H;
let n = 0;
const nid = () => `al-${(++n).toString(36).padStart(5, '0')}`;

export function makeAlert(kind: Kind, cam: string, at: number, extra: Partial<Alert> = {}): Alert {
  return { id: nid(), kind, cam, at, status: 'pendente', ...extra };
}

/** Fotos de adultos do conjunto (pessoas que não existem). */
const UNKNOWN = [108, 117, 121, 137, 146, 101, 113, 125];

function build(now: number): Alert[] {
  const out: Alert[] = [];
  // Perímetro: rajadas nas câmeras PTZ de divisa, a cada poucos minutos, por 6 dias.
  const per: [string, number][] = [['c1', 5.3], ['c3', 9.4], ['c2', 13.8]];
  for (const [cam, every] of per) {
    for (let t = now - 6 * D; t < now - 20e3; t += (every * (0.5 + rand())) * MIN) {
      const h = new Date(t).getHours();
      if (h >= 1 && h < 5 && rand() < 0.7) continue; // madrugada mais calma
      out.push(makeAlert('perimetro', cam, Math.round(t)));
    }
  }
  // Cruzamento de linha: Bloco 08 Fundos e Bloco 02.
  for (const [cam, every] of [['c2', 13.4], ['c4', 38]] as [string, number][]) {
    for (let t = now - 6 * D; t < now - 25e3; t += (every * (0.5 + rand())) * MIN) out.push(makeAlert('linha', cam, Math.round(t)));
  }
  // Matches de watchlist (faces), 3 a 6 dias atrás.
  const fcams = ['c5', 'c6', 'c7', 'c9', 'c6', 'c7'];
  for (let i = 0; i < 100; i++) {
    const named = rand() < 0.55;
    out.push(makeAlert('face', fcams[Math.floor(rand() * fcams.length)], Math.round(now - 3 * D - rand() * 3.2 * D), {
      person: named ? 'Thiago Suzue' : null, score: 51 + Math.floor(rand() * 6), list: named ? 'Acompanhamento QA Faces' : 'Acesso restrito · Portarias', seed: named ? 109 : UNKNOWN[i % UNKNOWN.length],
    }));
  }
  // Câmera sem vídeo.
  out.push(makeAlert('camera', 'c8', now - 3 * D - 2 * H, { mins: 10 }));
  out.push(makeAlert('camera', 'c4', now - 52 * MIN, { mins: 14 }));
  // Placas: a homologação não tem nenhuma hoje; dois exemplos para o modelo ficar completo.
  out.push(makeAlert('placa', 'c10', now - 38 * MIN, { plate: 'QWE7J81', list: 'Veículos com restrição · Estacionamento', score: 97 }));
  out.push(makeAlert('placa', 'c10', now - 2 * D - 5 * H, { plate: 'TAU1F42', list: 'Acompanhamento QA Faces', score: 92 }));

  // Reconhecidos (como na homologação) e alguns encerrados.
  const ack = (a: Alert, by: string, after: number) => Object.assign(a, { status: 'reconhecido' as Status, ackBy: by, ackAt: a.at + after });
  out.push(ack(makeAlert('face', 'c6', now - 5 * D - 3 * H, { person: 'Thiago Suzue', score: 51, list: 'Acompanhamento QA Faces', seed: 109 }), 'Operador UX', 20 * H));
  out.push(ack(makeAlert('face', 'c6', now - 5 * D - 6 * H, { person: null, score: 56, list: 'Acesso restrito · Portarias', seed: 117 }), 'Operador UX', 2 * H));
  out.push(ack(makeAlert('face', 'c9', now - 6 * D, { person: 'Thiago Suzue', score: 54, list: 'Acompanhamento QA Faces', seed: 109 }), 'Operador UX', 22 * H));
  out.push(ack(makeAlert('camera', 'c8', now - 3 * D - 5 * H, { mins: 10 }), 'Elisa Santos', 40 * MIN));
  out.push(ack(makeAlert('perimetro', 'c3', now - 4 * D - 2 * H), 'Elisa Santos', 6 * MIN));
  const close = (a: Alert, by: string, after: number, x: Partial<Alert>) => Object.assign(a, { status: 'encerrado' as Status, closedBy: by, closedAt: a.at + after, ...x });
  out.push(close(makeAlert('perimetro', 'c1', now - 2 * D - 4 * H), 'Elisa Santos', 9 * MIN, { outcome: 'Falso positivo', fpReason: 'Sombra, reflexo ou chuva', reeval: true }));
  out.push(close(makeAlert('linha', 'c2', now - 1 * D - 7 * H), 'Bruno Tavares', 14 * MIN, { outcome: 'Sem ocorrência no local', justification: 'Ronda verificou: funcionário da limpeza.' }));
  out.push(close(makeAlert('placa', 'c10', now - 4 * D - 1 * H, { plate: 'QWE7J81', list: 'Veículos com restrição · Estacionamento', score: 95 }), 'Fernanda Okada', 4 * MIN, { outcome: 'Ocorrência confirmada · resolvida no local', justification: 'Entrada negada na cancela; condutor orientado.' }));
  return out.sort((a, b) => b.at - a.at);
}

export const NOW0 = Date.now();
export const ALERTS: Alert[] = build(NOW0);

/* ── agrupamento: mesmo tipo + câmera (+ pessoa/placa), com intervalo menor que 20 min ── */
export const GAP = 20 * MIN;
/** Um grupo cobre no máximo 1 h; depois disso começa outro, para a linha não esconder um dia inteiro. */
export const WINDOW = 60 * MIN;
export type Group = { key: string; items: Alert[]; head: Alert; first: number; last: number };
export const subjectKey = (a: Alert) => (a.kind === 'face' ? a.person ?? `seed${a.seed}` : a.kind === 'placa' ? a.plate! : '');

export function groupAlerts(list: Alert[], on: boolean): Group[] {
  if (!on) return list.map((a) => ({ key: a.id, items: [a], head: a, first: a.at, last: a.at }));
  const open = new Map<string, Group>();
  const out: Group[] = [];
  for (const a of list) { // list vem do mais recente para o mais antigo
    const k = `${a.status}|${a.kind}|${a.cam}|${subjectKey(a)}`;
    const g = open.get(k);
    if (g && g.first - a.at <= GAP && g.last - a.at <= WINDOW) { g.items.push(a); g.first = a.at; continue; }
    const ng = { key: a.id, items: [a], head: a, first: a.at, last: a.at };
    open.set(k, ng); out.push(ng);
  }
  return out;
}

/* ── formatação ── */
export function ago(t: number, now: number) {
  const d = Math.max(0, now - t);
  if (d < 45e3) return 'agora';
  if (d < H) return `há ${Math.max(1, Math.round(d / MIN))} min`;
  if (d < D) return `há ${Math.round(d / H)} h`;
  return `há ${Math.round(d / D)} d`;
}
export const hm = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const hms = (t: number) => new Date(t).toLocaleTimeString('pt-BR');
export function when(t: number, now: number) {
  const a = new Date(t), b = new Date(now);
  const same = a.toDateString() === b.toDateString();
  const y = new Date(now - D).toDateString() === a.toDateString();
  return same ? `Hoje, ${hm(t)}` : y ? `Ontem, ${hm(t)}` : `${a.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hm(t)}`;
}
export const fullDate = (t: number) => `${new Date(t).toLocaleDateString('pt-BR')} · ${hms(t)}`;
export function span(first: number, last: number) {
  const d = last - first;
  if (d < MIN) return 'no mesmo minuto';
  if (d < H) return `em ${Math.round(d / MIN)} min`;
  return `em ${Math.floor(d / H)} h ${Math.round((d % H) / MIN)} min`;
}

export function title(a: Alert) {
  if (a.kind === 'face') return a.person ?? 'Pessoa sem nome no cadastro';
  if (a.kind === 'placa') return a.plate!;
  return KIND[a.kind].label;
}
export function subtitle(a: Alert) {
  if (a.kind === 'face') return `Watchlist · ${a.score}% · ${a.list}`;
  if (a.kind === 'placa') return `Placa monitorada · ${a.list}`;
  if (a.kind === 'camera') return `Sem vídeo há ${a.mins} min`;
  return a.kind === 'perimetro' && CAMS[a.cam].ptz ? 'Pessoa detectada · PTZ de divisa' : 'Pessoa detectada';
}
