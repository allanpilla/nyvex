import type { IconName } from '../ds/icons/icons';

/** Tipos de resultado da busca. Cada tipo aponta para a tela onde o registro vive. */
export type Kind = 'pessoa' | 'veiculo' | 'camera' | 'local' | 'ocorrencia' | 'alerta' | 'tela' | 'acao';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  /** Texto extra só para casar na busca (apelidos, documentos, tags). */
  keywords?: string;
  tag?: { label: string; tone: Tone };
  path: string;
};

export const KINDS: Record<Kind, { label: string; plural: string; icon: IconName }> = {
  pessoa: { label: 'Pessoa', plural: 'Pessoas', icon: 'people' },
  veiculo: { label: 'Veículo', plural: 'Veículos e placas', icon: 'car' },
  camera: { label: 'Câmera', plural: 'Câmeras e dispositivos', icon: 'camera' },
  local: { label: 'Local', plural: 'Locais', icon: 'pin' },
  ocorrencia: { label: 'Ocorrência', plural: 'Ocorrências', icon: 'ocor' },
  alerta: { label: 'Alerta', plural: 'Alertas', icon: 'alert' },
  tela: { label: 'Tela', plural: 'Telas', icon: 'dash' },
  acao: { label: 'Ação', plural: 'Ações rápidas', icon: 'plus' },
};

// Dados fictícios para o protótipo.
export const ENTRIES: Entry[] = [
  // Pessoas
  { id: 'p1', kind: 'pessoa', title: 'Mariana Duarte Lopes', subtitle: 'Aluna · Engenharia Civil · RA 2023014', keywords: 'estudante', tag: { label: 'Lista de observação', tone: 'warning' }, path: '/pessoas' },
  { id: 'p2', kind: 'pessoa', title: 'Ricardo Almeida Prado', subtitle: 'Funcionário · Manutenção · Matrícula 8841', keywords: 'colaborador', path: '/pessoas' },
  { id: 'p3', kind: 'pessoa', title: 'Ana Beatriz Moreira', subtitle: 'Visitante · Último acesso hoje 08:12 · Portaria principal', keywords: 'visita', path: '/pessoas' },
  { id: 'p4', kind: 'pessoa', title: 'Desconhecido #4471', subtitle: 'Face não identificada · 6 aparições em 7 dias', keywords: 'face sem cadastro desconhecida', tag: { label: 'Recorrente', tone: 'danger' }, path: '/faces-ao-vivo' },
  { id: 'p5', kind: 'pessoa', title: 'Carlos Eduardo Lima', subtitle: 'Professor · Direito · Matrícula 2207', keywords: 'docente', path: '/pessoas' },
  { id: 'p6', kind: 'pessoa', title: 'Juliana Pires Costa', subtitle: 'Aluna · Medicina Veterinária · RA 2022877', keywords: 'estudante', tag: { label: 'Acesso bloqueado', tone: 'danger' }, path: '/pessoas' },
  // Veículos
  { id: 'v1', kind: 'veiculo', title: 'BRA2E19', subtitle: 'Fiat Argo prata · Mariana Duarte Lopes', keywords: 'placa carro argo', tag: { label: 'Lista de observação', tone: 'warning' }, path: '/veiculos' },
  { id: 'v2', kind: 'veiculo', title: 'RTX4C82', subtitle: 'Honda CG 160 preta · sem cadastro', keywords: 'placa moto', tag: { label: 'Sem cadastro', tone: 'neutral' }, path: '/veiculos' },
  { id: 'v3', kind: 'veiculo', title: 'QWE1A23', subtitle: 'VW Saveiro branca · Frota manutenção', keywords: 'placa carro frota', tag: { label: 'Frota', tone: 'info' }, path: '/veiculos' },
  { id: 'v4', kind: 'veiculo', title: 'AYK7J05', subtitle: 'Jeep Compass cinza · Carlos Eduardo Lima', keywords: 'placa carro', path: '/veiculos' },
  { id: 'v5', kind: 'veiculo', title: 'MKP3H41', subtitle: 'Chevrolet Onix vermelho · alerta de furto', keywords: 'placa carro roubado furto', tag: { label: 'Restrição', tone: 'danger' }, path: '/veiculos' },
  // Câmeras e dispositivos
  { id: 'c1', kind: 'camera', title: 'CAM-014 · Portaria principal', subtitle: 'Reconhecimento facial · 4K', keywords: 'entrada camera face', tag: { label: 'Online', tone: 'success' }, path: '/dispositivos' },
  { id: 'c2', kind: 'camera', title: 'LPR-03 · Cancela estacionamento A', subtitle: 'Leitura de placas', keywords: 'lpr placa estacionamento camera', tag: { label: 'Online', tone: 'success' }, path: '/dispositivos' },
  { id: 'c3', kind: 'camera', title: 'CAM-027 · Bloco B, 2º andar', subtitle: 'Sem sinal há 2h 14min', keywords: 'camera corredor', tag: { label: 'Offline', tone: 'danger' }, path: '/dispositivos' },
  { id: 'c4', kind: 'camera', title: 'CAM-031 · Biblioteca, entrada', subtitle: 'Reconhecimento facial', keywords: 'camera face', tag: { label: 'Online', tone: 'success' }, path: '/dispositivos' },
  { id: 'c5', kind: 'camera', title: 'CAM-042 · Estacionamento B', subtitle: 'Imagem degradada · lente suja', keywords: 'camera', tag: { label: 'Instável', tone: 'warning' }, path: '/dispositivos' },
  { id: 'c6', kind: 'camera', title: 'CTRL-07 · Catraca Bloco A', subtitle: 'Controle de acesso', keywords: 'catraca acesso dispositivo', tag: { label: 'Online', tone: 'success' }, path: '/dispositivos' },
  // Locais
  { id: 'l1', kind: 'local', title: 'Portaria principal', subtitle: 'Campus · 3 câmeras · 2 catracas', keywords: 'entrada', path: '/locais' },
  { id: 'l2', kind: 'local', title: 'Bloco B', subtitle: 'Campus · 4 andares · 12 câmeras', keywords: 'predio', path: '/locais' },
  { id: 'l3', kind: 'local', title: 'Estacionamento A', subtitle: 'Campus · 2 leitores de placa', keywords: 'garagem', path: '/locais' },
  { id: 'l4', kind: 'local', title: 'Biblioteca central', subtitle: 'Campus · 5 câmeras', keywords: 'biblioteca', path: '/locais' },
  // Ocorrências
  { id: 'o1', kind: 'ocorrencia', title: 'OC-2318 · Furto de celular', subtitle: 'Bloco B, 2º andar · aberta há 35 min', keywords: 'roubo furto', tag: { label: 'Em atendimento', tone: 'warning' }, path: '/alertas?aba=ocorrencias' },
  { id: 'o2', kind: 'ocorrencia', title: 'OC-2317 · Pessoa não autorizada', subtitle: 'Portaria principal · hoje 09:40', keywords: 'invasao acesso', tag: { label: 'Aberta', tone: 'danger' }, path: '/alertas?aba=ocorrencias' },
  { id: 'o3', kind: 'ocorrencia', title: 'OC-2311 · Veículo em vaga proibida', subtitle: 'Estacionamento A · ontem 18:02', keywords: 'carro estacionamento', tag: { label: 'Encerrada', tone: 'success' }, path: '/alertas?aba=ocorrencias' },
  { id: 'o4', kind: 'ocorrencia', title: 'OC-2309 · Câmera danificada', subtitle: 'Bloco B · ontem 14:20', keywords: 'vandalismo camera', tag: { label: 'Aberta', tone: 'danger' }, path: '/alertas?aba=ocorrencias' },
  // Alertas
  { id: 'a1', kind: 'alerta', title: 'Placa em restrição: MKP3H41', subtitle: 'LPR-03 · Estacionamento A · há 4 min', keywords: 'veiculo carro furto', tag: { label: 'Crítico', tone: 'danger' }, path: '/alertas' },
  { id: 'a2', kind: 'alerta', title: 'Face da lista de observação: Mariana Duarte Lopes', subtitle: 'CAM-014 · Portaria principal · há 12 min', keywords: 'pessoa face', tag: { label: 'Alto', tone: 'warning' }, path: '/alertas' },
  { id: 'a3', kind: 'alerta', title: 'Desconhecido recorrente #4471', subtitle: 'CAM-031 · Biblioteca · há 26 min', keywords: 'pessoa face', tag: { label: 'Médio', tone: 'info' }, path: '/alertas' },
];

/** Buscas e visitas recentes de exemplo, mostradas antes de digitar. */
export const SAMPLE_RECENT_QUERIES = ['BRA2E19', 'ocorrências abertas Bloco B', 'câmeras offline'];
export const SAMPLE_RECENT_VISITED = ['v1', 'o1', 'c3', 'p4'];
