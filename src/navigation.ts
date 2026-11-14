import type { IconName } from './ds/icons/icons';

export type Screen = {
  id: string;
  path: string;
  label: string;
  icon: IconName;
  description: string;
  group: string | null;
  count?: string;
  /** Ações principais da tela, mostradas no cabeçalho. A primeira é a primária. */
  actions?: string[];
};

export type NavGroup = {
  id: string;
  title: string;
  /** Ícone do grupo, usado no menu fechado (abre o submenu flutuante). */
  icon: IconName;
  /** Grupo começa aberto no accordeon? */
  defaultOpen: boolean;
  items: Screen[];
};

const s = (
  id: string,
  group: string,
  icon: IconName,
  defaultOpen: boolean,
  items: Omit<Screen, 'group'>[],
): NavGroup => ({ id, title: group, icon, defaultOpen, items: items.map((i) => ({ ...i, group })) });

/** Estrutura do menu do Operation Center. Cada item vira uma rota. */
export const NAV: NavGroup[] = [
  s('operacao', 'Operação', 'painel', true, [
    { id: 'painel', path: '/painel', label: 'Painel operacional', icon: 'painel', description: 'KPIs, mapa de calor, ritmo de eventos e saúde dos sistemas.' },
    { id: 'watch', actions: ['Nova lista'], path: '/listas-de-observacao', label: 'Listas de observação', icon: 'eye', description: 'Listas de pessoas e veículos acompanhados (watchlists).' },
    { id: 'faces', path: '/faces-ao-vivo', label: 'Faces ao vivo', icon: 'faces', description: 'Grade de faces capturadas em tempo real.' },
    { id: 'alertas', actions: ['Triar em lote'], path: '/alertas', label: 'Fila de alertas', icon: 'alert', count: '3.614', description: 'Alertas de face e placa aguardando triagem.' },
    { id: 'ocor', actions: ['Nova ocorrência'], path: '/ocorrencias', label: 'Ocorrências', icon: 'ocor', description: 'Central de despacho: kanban de ocorrências com mapa.' },
    { id: 'placas', path: '/rede-de-placas', label: 'Rede de placas', icon: 'share', description: 'Conexões entre placas, locais e passagens (Plate Network).' },
  ]),
  s('infra', 'Infraestrutura', 'camera', true, [
    { id: 'mural', actions: ['Novo layout'], path: '/mural-de-video', label: 'Mural de vídeo', icon: 'tv', description: 'Grade de câmeras ao vivo.' },
    { id: 'disp', actions: ['Adicionar dispositivo'], path: '/dispositivos', label: 'Dispositivos', icon: 'dev', description: 'Inventário e saúde dos equipamentos.' },
    { id: 'locais', actions: ['Novo local'], path: '/locais', label: 'Locais', icon: 'pin', description: 'Locais em lista ou árvore, com mapa.' },
  ]),
  s('admin', 'Administração', 'settings', false, [
    { id: 'users', actions: ['Convidar usuário'], path: '/usuarios', label: 'Usuários e permissões', icon: 'shield', description: 'Usuários e matriz de perfis × permissões.' },
    { id: 'config', path: '/configuracoes', label: 'Configurações', icon: 'settings', description: 'Preferências do cliente.' },
    { id: 'custom', path: '/personalizar-menu', label: 'Personalizar menu', icon: 'custom', description: 'Montagem do menu por arrastar.' },
    { id: 'auditoria', path: '/auditoria', label: 'Auditoria (VMS)', icon: 'audit', description: 'Registro de ações de usuários no VMS.' },
  ]),
  s('identidade', 'Identidade', 'idcard', false, [
    { id: 'pessoas', actions: ['Importar', 'Cadastrar pessoa'], path: '/pessoas', label: 'Pessoas', icon: 'people', description: 'Cadastro único de pessoas.' },
    { id: 'veic', actions: ['Importar', 'Cadastrar veículo'], path: '/veiculos', label: 'Veículos', icon: 'car', description: 'Cadastro único de veículos.' },
  ]),
  s('inteligencia', 'Inteligência', 'flash', false, [
    { id: 'analises', path: '/analises', label: 'Análises', icon: 'chart', description: 'Indicadores e análises de eventos (Analytics).' },
  ]),
  s('engines', 'Engines', 'stack', false, [
    { id: 'relacoes', path: '/relacoes', label: 'Relações', icon: 'nodes', description: 'Vínculos entre pessoas, veículos e locais (Relations).' },
  ]),
];

export const MAPS: Screen = {
  id: 'mapas', path: '/mapas-taticos', label: 'Mapas táticos', icon: 'map', group: null,
  description: 'Atalho para os mapas táticos.',
};

export const SCREENS: Screen[] = [...NAV.flatMap((g) => g.items), MAPS];
export const HOME_PATH = '/painel';
export const CLIENT_NAME = 'UniBrasil';
export const findScreen = (pathname: string) => SCREENS.find((x) => x.path === pathname);
