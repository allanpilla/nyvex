/*
 * Auditoria (VMS), fiel à tela do sistema (homolog · sol-unibrasil · /auditoria).
 * Mesmos campos do log real: at, actor (usuário ou Sistema), action, target_type e target_id.
 * O protótipo acrescenta nome do recurso, origem, IP e as alterações (antes → depois), dados de exemplo.
 */
import type { IconName } from '../../ds/icons/icons';
import { USERS } from '../users/data';

export type ActionKey = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'playback';
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export const ACTIONS: Record<ActionKey, { label: string; verb: string; code: string; icon: IconName; tone: Tone }> = {
  login: { label: 'Login', verb: 'Entrou no sistema', code: 'LOGIN', icon: 'door', tone: 'info' },
  logout: { label: 'Logout', verb: 'Saiu do sistema', code: 'LOGOUT', icon: 'door', tone: 'neutral' },
  create: { label: 'Criação', verb: 'Criou', code: 'CREATE', icon: 'plus', tone: 'success' },
  update: { label: 'Edição', verb: 'Editou', code: 'UPDATE', icon: 'edit', tone: 'warning' },
  delete: { label: 'Exclusão', verb: 'Excluiu', code: 'DELETE', icon: 'trash', tone: 'danger' },
  export: { label: 'Exportação', verb: 'Exportou', code: 'EXPORT', icon: 'download', tone: 'info' },
  playback: { label: 'Gravação', verb: 'Reproduziu', code: 'PLAYBACK', icon: 'film', tone: 'neutral' },
};

export type TargetKey = 'session' | 'camera' | 'user' | 'role' | 'watchlist' | 'location' | 'layout' | 'alert' | 'recording' | 'settings';
export const TARGETS: Record<TargetKey, { label: string; code: string; icon: IconName }> = {
  session: { label: 'Sessão', code: 'session', icon: 'lock' },
  camera: { label: 'Câmera', code: 'camera', icon: 'camera' },
  user: { label: 'Usuário', code: 'user', icon: 'people' },
  role: { label: 'Papel', code: 'role', icon: 'shield' },
  watchlist: { label: 'Lista de observação', code: 'watchlist', icon: 'eye' },
  location: { label: 'Local', code: 'location', icon: 'pin' },
  layout: { label: 'Layout do mural', code: 'wall_layout', icon: 'grid' },
  alert: { label: 'Alerta', code: 'alert', icon: 'alert' },
  recording: { label: 'Gravação', code: 'recording', icon: 'film' },
  settings: { label: 'Configurações', code: 'tenant_settings', icon: 'settings' },
};

export type Origin = 'Web' | 'API' | 'Sistema';
export type Change = [field: string, before: string, after: string];
export type AuditEvent = {
  id: string;
  at: Date;
  /** null = ação automática do Sistema */
  actorId: string | null;
  ip: string;
  origin: Origin;
  action: ActionKey;
  target: TargetKey;
  targetId: string;
  targetName: string;
  changes?: Change[];
  note?: string;
};

/* gerador determinístico, para os dados não mudarem a cada recarga */
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join('');
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;

const CAMS = ['Portaria principal · Entrada', 'Portaria 2 · Saída', 'Estacionamento A · Rampa', 'Bloco 6 · Biblioteca Hall', 'Bloco 9 · Data center', 'Ginásio · Quadra', 'Bloco 8 · Recepção', 'Estacionamento B · Cancela'];
const LISTS = ['Pessoas de interesse', 'Veículos furtados', 'Ex-colaboradores', 'Visitantes recorrentes'];
const PLACES = ['Bloco 6 — Biblioteca Central & Auditório', 'Bloco 8 — Administrativo', 'Estacionamento A', 'Portaria principal'];
const LAYOUTS = ['Portarias 2×2', 'Estacionamentos', 'Ronda noturna 3×3'];
const ROLES = ['Operador', 'Visualizador', 'UX/UI'];

/** Modelos de evento: ação, recurso, nome e alterações possíveis. */
type Tpl = { a: ActionKey; t: TargetKey; w: number; name: () => string; changes?: () => Change[]; note?: () => string };
const TPL: Tpl[] = [
  { a: 'login', t: 'session', w: 22, name: () => 'Login com e-mail e senha' },
  { a: 'logout', t: 'session', w: 9, name: () => 'Sessão encerrada' },
  { a: 'playback', t: 'recording', w: 10, name: () => pick(CAMS), note: () => `Trecho de ${pick(['2', '5', '10', '15'])} min reproduzido` },
  { a: 'update', t: 'camera', w: 8, name: () => pick(CAMS), changes: () => pick<Change[]>([
    [['Perfil de stream', 'Principal (1080p)', 'Secundário (720p)']],
    [['Nome', 'CAM 14', 'Bloco 8 · Recepção'], ['Local', 'Sem local', 'Bloco 8 — Administrativo']],
    [['Situação', 'Online', 'Em manutenção']],
    [['Gravação contínua', 'Desligada', 'Ligada'], ['Retenção', '15 dias', '30 dias']],
  ]) },
  { a: 'create', t: 'camera', w: 3, name: () => pick(CAMS), changes: () => [['IP', '—', `10.20.${Math.floor(rnd() * 40)}.${Math.floor(rnd() * 250)}`], ['Fabricante', '—', pick(['Hikvision', 'Intelbras', 'Axis'])]] },
  { a: 'delete', t: 'camera', w: 1, name: () => 'CAM 31 · Depósito (desativada)' },
  { a: 'update', t: 'user', w: 4, name: () => pick(USERS).full_name, changes: () => pick<Change[]>([
    [['Papel', 'Visualizador', 'Operador']],
    [['Status', 'Ativo', 'Inativo']],
    [['Senha', '••••••', 'Redefinida']],
  ]) },
  { a: 'create', t: 'user', w: 2, name: () => pick(['Carla Nogueira', 'Rafael Prado', 'Bianca Lemos']), changes: () => [['Papel', '—', pick(ROLES)], ['Status', '—', 'Ativo']] },
  { a: 'delete', t: 'user', w: 1, name: () => pick(['Estagiário Segurança', 'Teste Integração']) },
  { a: 'update', t: 'role', w: 2, name: () => pick(ROLES), changes: () => [['Permissões', `${18 + Math.floor(rnd() * 20)} concedidas`, `${30 + Math.floor(rnd() * 20)} concedidas`]] },
  { a: 'create', t: 'watchlist', w: 1, name: () => pick(LISTS) },
  { a: 'update', t: 'watchlist', w: 5, name: () => pick(LISTS), changes: () => pick<Change[]>([
    [['Pessoas', '12', '13']],
    [['Placas', '41', '43']],
    [['Notificar operadores', 'Não', 'Sim']],
  ]) },
  { a: 'update', t: 'location', w: 2, name: () => pick(PLACES), changes: () => [['Posição no mapa', '-25.4441, -49.2523', '-25.4443, -49.2519']] },
  { a: 'create', t: 'layout', w: 2, name: () => pick(LAYOUTS), changes: () => [['Câmeras', '—', `${4 + Math.floor(rnd() * 6)}`]] },
  { a: 'update', t: 'alert', w: 9, name: () => `Alerta #${38000 + Math.floor(rnd() * 900)}`, changes: () => pick<Change[]>([
    [['Status', 'Novo', 'Falso positivo']],
    [['Status', 'Novo', 'Encaminhado'], ['Encaminhado para', '—', 'Ronda Bloco 6']],
    [['Status', 'Em análise', 'Confirmado']],
  ]) },
  { a: 'export', t: 'recording', w: 4, name: () => pick(CAMS), note: () => `Clipe MP4 de ${pick(['1', '3', '8'])} min` },
  { a: 'export', t: 'alert', w: 2, name: () => 'Relatório de alertas', note: () => `CSV · ${200 + Math.floor(rnd() * 900)} linhas` },
  { a: 'update', t: 'settings', w: 1, name: () => 'Preferências do cliente', changes: () => [['Tempo de sessão', '8 h', '12 h']] },
];
const WSUM = TPL.reduce((n, t) => n + t.w, 0);
const pickTpl = () => { let r = rnd() * WSUM; for (const t of TPL) { r -= t.w; if (r <= 0) return t; } return TPL[0]; };

/* quem mais aparece: operadores e admins do cliente; Super Admin da Nyvex com menos frequência */
const ACTORS = ['u9', 'u9', 'u9', 'u10', 'u10', 'u7', 'u7', 'u8', 'u5', 'u1', 'u2', 'u4', 'u11', 'u3'];
const IPS: Record<string, string> = Object.fromEntries(USERS.map((u, i) => [u.id, `10.20.${(i * 7) % 40}.${20 + i * 13}`]));

function build(): AuditEvent[] {
  const now = Date.now();
  const out: AuditEvent[] = [];
  let t = now - 4 * 60_000;
  for (let i = 0; i < 260; i++) {
    const tp = pickTpl();
    const system = tp.a === 'update' && tp.t === 'camera' && rnd() < 0.3;
    const actorId = system ? null : pick(ACTORS);
    out.push({
      id: `ev${i}`,
      at: new Date(t),
      actorId,
      ip: actorId ? IPS[actorId] : '—',
      origin: system ? 'Sistema' : rnd() < 0.08 ? 'API' : 'Web',
      action: tp.a,
      target: tp.t,
      targetId: uuid(),
      targetName: system ? pick(CAMS) : tp.name(),
      changes: system ? [['Situação', 'Online', 'Offline']] : tp.changes?.(),
      note: system ? 'Mudança automática por falta de sinal' : tp.note?.(),
    });
    // mais denso nos últimos dias; espaçado conforme volta no tempo
    t -= (i < 60 ? 6 + rnd() * 50 : i < 140 ? 30 + rnd() * 220 : 120 + rnd() * 1300) * 60_000;
  }
  return out;
}

export const EVENTS: AuditEvent[] = build();
export const USERS_BY_ID = Object.fromEntries(USERS.map((u) => [u.id, u]));
