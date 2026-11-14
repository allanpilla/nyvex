import type { IconName } from './ds/icons/icons';

export type Screen = {
  id: string;
  path: string;
  label: string;
  icon: IconName;
  description: string;
  group: string | null;
  count?: string;
};

export type NavGroup = { title: string | null; items: Screen[] };

const s = (group: string | null, items: Omit<Screen, 'group'>[]): NavGroup => ({
  title: group,
  items: items.map((i) => ({ ...i, group })),
});

/** Estrutura do menu do Operation Center. Cada item vira uma rota. */
export const NAV: NavGroup[] = [
  s(null, [
    { id: 'dash', path: '/dashboards', label: 'Dashboards do contrato', icon: 'dash', description: 'Construtor de painéis do contrato (Dashboard Builder 360°).' },
  ]),
  s('Operação', [
    { id: 'painel', path: '/painel', label: 'Painel operacional', icon: 'painel', description: 'KPIs, mapa de calor, ritmo de eventos e saúde dos sistemas.' },
    { id: 'watch', path: '/listas-de-observacao', label: 'Listas de observação', icon: 'eye', description: 'Listas de pessoas e veículos acompanhados (watchlists).' },
    { id: 'faces', path: '/faces-ao-vivo', label: 'Faces ao vivo', icon: 'faces', description: 'Grade de faces capturadas em tempo real.' },
    { id: 'alertas', path: '/alertas', label: 'Fila de alertas', icon: 'alert', count: '3.614', description: 'Alertas de face e placa aguardando triagem.' },
    { id: 'ocor', path: '/ocorrencias', label: 'Ocorrências', icon: 'ocor', description: 'Central de despacho: kanban de ocorrências com mapa.' },
  ]),
  s('Infraestrutura', [
    { id: 'mural', path: '/mural-de-video', label: 'Mural de vídeo', icon: 'tv', description: 'Grade de câmeras ao vivo.' },
    { id: 'disp', path: '/dispositivos', label: 'Dispositivos', icon: 'dev', description: 'Inventário e saúde dos equipamentos.' },
    { id: 'locais', path: '/locais', label: 'Locais', icon: 'pin', description: 'Locais em lista ou árvore, com mapa.' },
  ]),
  s('Identidade', [
    { id: 'pessoas', path: '/pessoas', label: 'Pessoas', icon: 'people', description: 'Cadastro único de pessoas.' },
    { id: 'veic', path: '/veiculos', label: 'Veículos', icon: 'car', description: 'Cadastro único de veículos.' },
  ]),
  s('Administração', [
    { id: 'users', path: '/usuarios', label: 'Usuários e permissões', icon: 'shield', description: 'Usuários e matriz de perfis × permissões.' },
    { id: 'config', path: '/configuracoes', label: 'Configurações', icon: 'settings', description: 'Preferências do cliente.' },
    { id: 'custom', path: '/personalizar-menu', label: 'Personalizar menu', icon: 'custom', description: 'Montagem do menu por arrastar.' },
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
