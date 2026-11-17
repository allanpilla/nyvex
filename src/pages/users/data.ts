import type { IconName } from '../../ds/icons/icons';

/* Usuários, papéis e o catálogo de permissões. Dados inventados para o protótipo. */

export type Perm = { key: string; label: string; hint: string; sensitive?: boolean };
export type Module = { id: string; label: string; icon: IconName; perms: Perm[] };

export const MODULES: Module[] = [
  { id: 'operacao', label: 'Operação', icon: 'painel', perms: [
    { key: 'painel.ver', label: 'Ver painel operacional', hint: 'KPIs, mapa de calor e saúde dos sistemas' },
    { key: 'alertas.ver', label: 'Ver fila de alertas', hint: 'Alertas de face, placa e vídeo' },
    { key: 'alertas.triar', label: 'Triar alertas', hint: 'Confirmar, descartar e encaminhar' },
    { key: 'alertas.lote', label: 'Triar em lote', hint: 'Encerrar vários alertas de uma vez' },
    { key: 'ocor.ver', label: 'Ver ocorrências', hint: 'Quadro, lista e mapa' },
    { key: 'ocor.criar', label: 'Registrar ocorrências', hint: 'Abrir e editar ocorrências' },
    { key: 'ocor.despachar', label: 'Despachar e encerrar', hint: 'Atribuir equipes e concluir' },
  ] },
  { id: 'video', label: 'Vídeo', icon: 'tv', perms: [
    { key: 'video.vivo', label: 'Assistir ao vivo', hint: 'Mural de vídeo e câmeras' },
    { key: 'video.gravacoes', label: 'Ver gravações', hint: 'Voltar no tempo e revisar' },
    { key: 'video.exportar', label: 'Exportar clipes', hint: 'Baixar trechos de vídeo', sensitive: true },
    { key: 'video.ptz', label: 'Controlar câmeras PTZ', hint: 'Mover, aproximar e usar presets' },
    { key: 'video.layouts', label: 'Gerenciar layouts', hint: 'Criar e compartilhar layouts do mural' },
  ] },
  { id: 'inteligencia', label: 'Reconhecimento', icon: 'faces', perms: [
    { key: 'faces.ver', label: 'Ver faces ao vivo', hint: 'Grade de faces capturadas', sensitive: true },
    { key: 'carac.buscar', label: 'Buscar por característica', hint: 'Exige finalidade registrada', sensitive: true },
    { key: 'placas.ver', label: 'Consultar rede de placas', hint: 'Passagens e conexões de veículos' },
    { key: 'watch.ver', label: 'Ver listas de observação', hint: 'Pessoas e veículos acompanhados' },
    { key: 'watch.editar', label: 'Editar listas de observação', hint: 'Incluir, remover, ativar e pausar', sensitive: true },
  ] },
  { id: 'cadastros', label: 'Cadastros', icon: 'idcard', perms: [
    { key: 'pessoas.ver', label: 'Ver pessoas', hint: 'Cadastro único de pessoas' },
    { key: 'pessoas.editar', label: 'Cadastrar e editar pessoas', hint: 'Inclui foto de referência', sensitive: true },
    { key: 'veic.ver', label: 'Ver veículos', hint: 'Cadastro único de veículos' },
    { key: 'veic.editar', label: 'Cadastrar e editar veículos', hint: 'Placas, modelos e vínculos' },
  ] },
  { id: 'infra', label: 'Infraestrutura', icon: 'dev', perms: [
    { key: 'disp.ver', label: 'Ver dispositivos', hint: 'Inventário e saúde' },
    { key: 'disp.editar', label: 'Gerenciar dispositivos', hint: 'Adicionar, editar e remover' },
    { key: 'locais.ver', label: 'Ver locais', hint: 'Árvore de locais e mapa' },
    { key: 'locais.editar', label: 'Gerenciar locais', hint: 'Criar, mover e remover locais' },
  ] },
  { id: 'admin', label: 'Administração', icon: 'shield', perms: [
    { key: 'usuarios.ver', label: 'Ver usuários', hint: 'Lista de quem acessa o sistema' },
    { key: 'usuarios.gerenciar', label: 'Gerenciar usuários', hint: 'Convidar, editar e desativar', sensitive: true },
    { key: 'papeis.gerenciar', label: 'Gerenciar papéis', hint: 'Criar papéis e mudar permissões', sensitive: true },
    { key: 'auditoria.ver', label: 'Ver auditoria', hint: 'Registro de ações dos usuários' },
    { key: 'config.editar', label: 'Editar configurações', hint: 'Preferências do cliente' },
  ] },
];
export const ALL_PERMS = MODULES.flatMap((m) => m.perms);
export const PERM_TOTAL = ALL_PERMS.length;
export const permLabel = (k: string) => ALL_PERMS.find((p) => p.key === k)?.label ?? k;

export type Role = { key: string; label: string; description: string; system: boolean; tone: string; perms: string[] };

const pick = (...prefixes: string[]) => ALL_PERMS.map((p) => p.key).filter((k) => prefixes.some((x) => (x.endsWith('.') ? k.startsWith(x) : k === x)));
const VIEW = ['painel.ver', 'alertas.ver', 'ocor.ver', 'video.vivo', 'locais.ver'];

export const ROLES: Role[] = [
  { key: 'admin', label: 'Administrador', system: true, tone: 'violet', description: 'Acesso total, inclusive usuários, papéis e configurações.', perms: ALL_PERMS.map((p) => p.key) },
  { key: 'supervisor', label: 'Supervisor', system: true, tone: 'blue', description: 'Coordena a operação: despacha, exporta e mantém as listas de observação.',
    perms: pick('painel.', 'alertas.', 'ocor.', 'video.', 'faces.', 'carac.', 'placas.', 'watch.', 'pessoas.', 'veic.', 'disp.ver', 'locais.ver', 'usuarios.ver', 'auditoria.ver') },
  { key: 'operador', label: 'Operador', system: true, tone: 'green', description: 'Monitora câmeras, tria alertas e registra ocorrências.',
    perms: pick(...VIEW, 'alertas.triar', 'ocor.criar', 'video.gravacoes', 'video.ptz', 'faces.ver', 'placas.ver', 'watch.ver', 'pessoas.ver', 'veic.ver', 'disp.ver') },
  { key: 'auditor', label: 'Auditor', system: true, tone: 'amber', description: 'Consulta tudo sem alterar nada e acompanha a trilha de auditoria.',
    perms: pick(...VIEW, 'video.gravacoes', 'placas.ver', 'watch.ver', 'pessoas.ver', 'veic.ver', 'disp.ver', 'usuarios.ver', 'auditoria.ver') },
  { key: 'visualizador', label: 'Visualizador', system: true, tone: 'gray', description: 'Só assiste às câmeras e acompanha o painel.', perms: pick('painel.ver', 'video.vivo', 'locais.ver') },
  { key: 'portaria', label: 'Portaria', system: false, tone: 'teal', description: 'Equipe das portarias: câmeras de acesso, placas e registro de ocorrências.',
    perms: pick('painel.ver', 'alertas.ver', 'alertas.triar', 'ocor.ver', 'ocor.criar', 'video.vivo', 'video.ptz', 'placas.ver', 'veic.ver', 'veic.editar', 'locais.ver') },
  { key: 'investigacao', label: 'Investigação', system: false, tone: 'rose', description: 'Apura casos com busca por característica, gravações e exportação.',
    perms: pick(...VIEW, 'video.gravacoes', 'video.exportar', 'faces.ver', 'carac.buscar', 'placas.ver', 'watch.ver', 'pessoas.ver', 'veic.ver', 'auditoria.ver') },
];

export const LOCAIS = ['Campus Centro', 'Bloco A', 'Bloco B', 'Bloco C', 'Biblioteca', 'Ginásio', 'Estacionamento Norte', 'Estacionamento Sul', 'Portaria Principal', 'Portaria Leste'];

export type UStatus = 'ativo' | 'pendente' | 'inativo';
export type User = {
  id: string; name: string; email: string; team: string; role: string; status: UStatus;
  /** vazio = todos os locais */
  locais: string[]; mfa: boolean; lastSeen: number | null; created: number;
};
export const STATUS_LABEL: Record<UStatus, string> = { ativo: 'Ativo', pendente: 'Convite pendente', inativo: 'Inativo' };

const H = 3600e3, D = 24 * H;
const seed: [string, string, string, string, UStatus, string[], boolean, number | null, number][] = [
  ['Mariana Couto', 'mariana.couto', 'Coordenação de Segurança', 'admin', 'ativo', [], true, 0.2 * H, 420 * D],
  ['Rafael Nogueira', 'rafael.nogueira', 'TI', 'admin', 'ativo', [], true, 3 * H, 390 * D],
  ['Juliana Prado', 'juliana.prado', 'Coordenação de Segurança', 'supervisor', 'ativo', [], true, 0.05 * H, 300 * D],
  ['Carlos Menezes', 'carlos.menezes', 'Central de Monitoramento', 'supervisor', 'ativo', [], false, 26 * H, 280 * D],
  ['Ana Beatriz Lima', 'ana.lima', 'Central de Monitoramento', 'operador', 'ativo', [], false, 0.4 * H, 210 * D],
  ['Diego Fernandes', 'diego.fernandes', 'Central de Monitoramento', 'operador', 'ativo', [], false, 1.5 * H, 200 * D],
  ['Patrícia Ramos', 'patricia.ramos', 'Central de Monitoramento', 'operador', 'ativo', [], true, 9 * H, 190 * D],
  ['Thiago Azevedo', 'thiago.azevedo', 'Central de Monitoramento', 'operador', 'ativo', [], false, 50 * H, 160 * D],
  ['Fernanda Souza', 'fernanda.souza', 'Central de Monitoramento', 'operador', 'inativo', [], false, 62 * D, 330 * D],
  ['Lucas Pereira', 'lucas.pereira', 'Portaria', 'portaria', 'ativo', ['Portaria Principal', 'Estacionamento Norte'], false, 0.8 * H, 120 * D],
  ['Bruna Carvalho', 'bruna.carvalho', 'Portaria', 'portaria', 'ativo', ['Portaria Leste', 'Estacionamento Sul'], false, 5 * H, 118 * D],
  ['Rodrigo Alves', 'rodrigo.alves', 'Portaria', 'portaria', 'ativo', ['Portaria Principal'], false, 30 * H, 90 * D],
  ['Camila Ribeiro', 'camila.ribeiro', 'Portaria', 'portaria', 'pendente', ['Portaria Leste'], false, null, 2 * D],
  ['Eduardo Martins', 'eduardo.martins', 'Investigação', 'investigacao', 'ativo', [], true, 4 * H, 150 * D],
  ['Larissa Gomes', 'larissa.gomes', 'Investigação', 'investigacao', 'ativo', [], true, 72 * H, 140 * D],
  ['Paulo Henrique Dias', 'paulo.dias', 'Ouvidoria', 'auditor', 'ativo', [], true, 7 * D, 260 * D],
  ['Sofia Andrade', 'sofia.andrade', 'Jurídico', 'auditor', 'pendente', [], false, null, 0.5 * D],
  ['Gustavo Rocha', 'gustavo.rocha', 'Manutenção', 'visualizador', 'ativo', ['Bloco A', 'Bloco B', 'Bloco C'], false, 12 * D, 100 * D],
  ['Renata Moraes', 'renata.moraes', 'Biblioteca', 'visualizador', 'ativo', ['Biblioteca'], false, 3 * D, 80 * D],
  ['Vinícius Barros', 'vinicius.barros', 'Esportes', 'visualizador', 'inativo', ['Ginásio'], false, 95 * D, 240 * D],
  ['Aline Teixeira', 'aline.teixeira', 'Central de Monitoramento', 'operador', 'pendente', [], false, null, 1 * D],
  ['Marcelo Vieira', 'marcelo.vieira', 'TI', 'supervisor', 'ativo', [], true, 20 * H, 230 * D],
];

export const buildUsers = (now: number): User[] => seed.map(([name, mail, team, role, status, locais, mfa, last, created], i) => ({
  id: `u${i + 1}`, name, email: `${mail}@unibrasil.edu.br`, team, role, status, locais, mfa,
  lastSeen: last == null ? null : now - last, created: now - created,
}));

export const TEAMS = [...new Set(seed.map((s) => s[2]))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export const initials = (n: string) => n.split(' ').filter((p) => p.length > 2 || p === n).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || n.slice(0, 2).toUpperCase();
export const ago = (t: number | null, now: number) => {
  if (t == null) return 'Nunca entrou';
  const m = Math.round((now - t) / 60e3);
  if (m < 5) return 'Agora';
  if (m < 60) return `Há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `Há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Ontem';
  if (d < 30) return `Há ${d} dias`;
  const mo = Math.round(d / 30);
  return mo === 1 ? 'Há 1 mês' : `Há ${mo} meses`;
};
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
export const tempPassword = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, (_, i) => (i === 4 || i === 8 ? '-' : a[Math.floor(Math.random() * a.length)])).join('');
};
