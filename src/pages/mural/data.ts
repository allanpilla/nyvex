// Câmeras fictícias do protótipo do Mural de vídeo.
export type CamStatus = 'online' | 'atencao' | 'offline';
export type Cam = {
  id: string;
  name: string;
  local: string; // grupo (bloco/área)
  area: string; // detalhe do local
  status: CamStatus;
  note?: string; // motivo quando não está ok
  night: boolean; // imagem infravermelha (P&B)
  outdoor: boolean;
};

const RAW: [string, string, [string, ('night' | 'out')?][]][] = [
  ['Bloco 02', 'Ciências Jurídicas & Negócios', [['BWC 1A', 'night'], ['Corredor térreo'], ['Escada principal', 'night'], ['Entrada']]],
  ['Bloco 04', 'Centro Acadêmico', [['Externa', 'out'], ['Centro Acadêmico'], ['Suporte TE', 'night'], ['Pátio', 'out'], ['Corredor 1º andar']]],
  ['Bloco 05', 'Engenharias', [['Rampa TE', 'night'], ['Laboratórios'], ['Entrada lateral', 'out'], ['Corredor térreo', 'night']]],
  ['Bloco 06', 'Saúde', [['Externa 1', 'out'], ['Rampa TE', 'night'], ['Escada TE', 'night'], ['Recepção'], ['Clínica-escola']]],
  ['Bloco 07', 'Biblioteca', [['Sala Alimentação'], ['Saída B8 TE', 'night'], ['Entrada TE', 'night'], ['Entrada Sala Estudos'], ['Acervo'], ['Balcão']]],
  ['Bloco 08', 'Administrativo', [['Porta', 'night'], ['Saguão'], ['Fundos TE', 'night'], ['Tesouraria'], ['Secretaria']]],
  ['Bloco 09', 'Tecnologia', [['Entrada TE', 'night'], ['Saída TE', 'night'], ['Data center'], ['Corredor 2º andar'], ['Auditório']]],
  ['Ginásio', 'Esportes', [['Entrada 1 TE', 'night'], ['Entrada 2 TE', 'night'], ['Quadra'], ['Arquibancada'], ['Vestiários']]],
  ['Estacionamento', 'Área externa', [['Cancela Norte', 'out'], ['Cancela Sul', 'out'], ['Setor A', 'out'], ['Setor B', 'out'], ['Setor C', 'out'], ['Motos', 'out']]],
  ['Portarias', 'Acessos', [['Portaria 1', 'out'], ['Portaria 2', 'out'], ['Portaria 3 · Pedestres', 'out'], ['Guarita'], ['Doca de carga', 'out']]],
];

const PROBLEMS: Record<string, [CamStatus, string]> = {
  'bloco-08-porta': ['atencao', 'Saúde degradada · sem heartbeat'],
  'estacionamento-setor-c': ['offline', 'Sem sinal há 12 min'],
  'bloco-05-laboratorios': ['offline', 'Sem sinal há 2 h'],
  'portarias-doca-de-carga': ['offline', 'Sem sinal há 35 min'],
};

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const CAMS: Cam[] = RAW.flatMap(([local, area, list]) =>
  list.map(([name, kind]) => {
    const id = slug(`${local} ${name}`);
    const p = PROBLEMS[id];
    return {
      id,
      name: `${local} · ${name}`,
      local,
      area,
      status: p ? p[0] : 'online',
      note: p?.[1],
      night: kind === 'night',
      outdoor: kind === 'out',
    } satisfies Cam;
  }),
);

export const CAM_BY_ID = Object.fromEntries(CAMS.map((c) => [c.id, c])) as Record<string, Cam>;
export const LOCAIS = [...new Set(CAMS.map((c) => c.local))];

export const STATUS_LABEL: Record<CamStatus, string> = { online: 'Online', atencao: 'Atenção', offline: 'Sem sinal' };

export type LayoutId = '1' | '4' | '9' | '16' | 'destaque';
export const LAYOUTS: { id: LayoutId; label: string; cols: number; slots: number }[] = [
  { id: '1', label: '1×1', cols: 1, slots: 1 },
  { id: '4', label: '2×2', cols: 2, slots: 4 },
  { id: '9', label: '3×3', cols: 3, slots: 9 },
  { id: '16', label: '4×4', cols: 4, slots: 16 },
  { id: 'destaque', label: 'Destaque', cols: 3, slots: 6 },
];

export const DEFAULT_MURAL = [
  'bloco-02-bwc-1a', 'bloco-04-externa', 'ginasio-entrada-1-te', 'bloco-09-entrada-te',
  'bloco-08-fundos-te', 'bloco-04-centro-academico', 'bloco-08-porta', 'estacionamento-setor-c',
];

export const PRESETS: { id: string; name: string; layout: LayoutId; cams: string[] }[] = [
  { id: 'acessos', name: 'Acessos e portarias', layout: '9', cams: ['portarias-portaria-1', 'portarias-portaria-2', 'portarias-portaria-3-pedestres', 'portarias-guarita', 'estacionamento-cancela-norte', 'estacionamento-cancela-sul', 'ginasio-entrada-1-te', 'ginasio-entrada-2-te', 'bloco-02-entrada'] },
  { id: 'noturno', name: 'Ronda noturna · blocos', layout: '16', cams: CAMS.filter((c) => c.night).map((c) => c.id).slice(0, 16) },
  { id: 'estac', name: 'Estacionamento', layout: 'destaque', cams: CAMS.filter((c) => c.local === 'Estacionamento').map((c) => c.id) },
];
