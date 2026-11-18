// Analíticos por câmera: o que a IA analisa em cada câmera. Câmeras = as mesmas de Dispositivos.
import { DEVICES, type Device } from '../devices/data';
import type { IconName } from '../../ds/icons/icons';

export type GroupId = 'ident' | 'perim' | 'comp' | 'risco';
/** zona = vale para a imagem inteira até desenhar uma zona; linha = precisa de linha; full = puxa resolução cheia o tempo todo. */
export type Need = 'zona' | 'linha' | null;
export type Analytic = { k: string; label: string; short: string; group: GroupId; icon: IconName; desc: string; need: Need; full?: boolean };

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'ident', label: 'Identificação' },
  { id: 'perim', label: 'Perímetro' },
  { id: 'comp', label: 'Comportamento' },
  { id: 'risco', label: 'Riscos' },
];

export const ANALYTICS: Analytic[] = [
  { k: 'face', label: 'Reconhecimento facial', short: 'Facial', group: 'ident', icon: 'faces', full: true, need: null, desc: 'Compara rostos com as pessoas cadastradas e as listas de observação. Puxa o vídeo em resolução cheia o tempo todo.' },
  { k: 'placa', label: 'Leitura de placas', short: 'Placa', group: 'ident', icon: 'car', full: true, need: null, desc: 'Lê placas de veículos e compara com os cadastros e listas. Puxa o vídeo em resolução cheia o tempo todo.' },
  { k: 'intrusao', label: 'Intrusão em zona', short: 'Intrusão', group: 'perim', icon: 'shield', need: 'zona', desc: 'Pessoa ou veículo entrando na zona de interesse.' },
  { k: 'linha', label: 'Cruzamento de linha', short: 'Linha', group: 'perim', icon: 'arrowRight', need: 'linha', desc: 'Pessoa cruzando a linha virtual no sentido definido.' },
  { k: 'muro', label: 'Pulo de muro', short: 'Muro', group: 'perim', icon: 'warn', need: 'linha', desc: 'Pessoa escalando ou pulando o muro marcado pela linha.' },
  { k: 'permanencia', label: 'Permanência indevida', short: 'Perma\u00ADnência', group: 'comp', icon: 'clock', need: 'zona', desc: 'Pessoa parada na zona por mais tempo que o configurado.' },
  { k: 'aglomeracao', label: 'Aglomeração', short: 'Aglome\u00ADração', group: 'comp', icon: 'people', need: 'zona', desc: 'Mais pessoas juntas na zona do que o limite.' },
  { k: 'queda', label: 'Pessoa caída', short: 'Queda', group: 'comp', icon: 'activity', need: null, desc: 'Pessoa caída no chão por alguns segundos.' },
  { k: 'contagem', label: 'Contagem de pessoas', short: 'Contagem', group: 'comp', icon: 'chart', need: 'linha', desc: 'Conta quem cruza a linha, separando entrada e saída. Não gera alerta: o resultado fica em Análises.' },
  { k: 'fila', label: 'Fila e ocupação', short: 'Fila', group: 'comp', icon: 'grid', need: 'zona', desc: 'Pessoas na zona acima do limite, para filas e lotação.' },
  { k: 'arma', label: 'Arma', short: 'Arma', group: 'risco', icon: 'alert', need: null, desc: 'Arma de fogo ou arma branca visível na cena.' },
  { k: 'fogo', label: 'Fogo e fumaça', short: 'Fogo', group: 'risco', icon: 'flash', need: null, desc: 'Chama ou fumaça na imagem.' },
  { k: 'abandono', label: 'Objeto abandonado', short: 'Abandono', group: 'risco', icon: 'stack', need: 'zona', desc: 'Objeto deixado na cena por mais tempo que o configurado.' },
  { k: 'epi', label: 'EPI', short: 'EPI', group: 'risco', icon: 'idcard', need: 'zona', desc: 'Pessoa sem capacete, colete ou outro equipamento obrigatório na zona.' },
];
export const BY_K = Object.fromEntries(ANALYTICS.map((a) => [a.k, a])) as Record<string, Analytic>;

/** Licenças contratadas (o resto roda sem licença por câmera). */
export const LICENSE: Record<'face' | 'placa', number> = { face: 30, placa: 10 };

/** Modelos prontos para aplicar em massa. Aplicar troca o que a câmera faz pelo modelo. */
export const PROFILES: { id: string; label: string; hint: string; ks: string[] }[] = [
  { id: 'portaria', label: 'Portaria e acesso', hint: 'Facial, intrusão e contagem', ks: ['face', 'intrusao', 'contagem'] },
  { id: 'veiculos', label: 'Entrada de veículos', hint: 'Placa, permanência e intrusão', ks: ['placa', 'permanencia', 'intrusao'] },
  { id: 'circulacao', label: 'Circulação interna', hint: 'Aglomeração, queda e objeto abandonado', ks: ['aglomeracao', 'queda', 'abandono'] },
  { id: 'perimetro', label: 'Perímetro externo', hint: 'Intrusão, linha, pulo de muro e fogo', ks: ['intrusao', 'linha', 'muro', 'fogo'] },
  { id: 'critica', label: 'Área crítica', hint: 'Facial, intrusão, permanência e arma', ks: ['face', 'intrusao', 'permanencia', 'arma'] },
];

export type ACam = Device & { zones: number; lines: number };
export const ACAMS: ACam[] = DEVICES.filter((d) => d.kind === 'camera').map((d, i) => ({ ...d, zones: i % 3 === 0 ? 1 + (i % 2) : 0, lines: i % 4 === 1 ? 1 : 0 }));
export const A_LOCAIS = [...new Set(ACAMS.map((c) => c.local))];

/** Configuração inicial, coerente com o tipo e o lugar de cada câmera. */
export function initialConfig(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  ACAMS.forEach((c, i) => {
    const n = c.name.toLowerCase();
    const s = new Set<string>();
    if (c.camType === 'FA' || /portaria|recep|entrada/.test(n)) s.add('face');
    if (c.camType === 'LPR' || /cancela|guarita/.test(n)) s.add('placa');
    if (/portaria|guarita|doca|externa|entrada lateral/.test(n)) { s.add('intrusao'); if (i % 2) s.add('linha'); }
    if (/corredor|saguão|pátio|rampa/.test(n)) { s.add('aglomeracao'); if (i % 3 === 0) s.add('queda'); }
    if (/data center|tesouraria/.test(n)) { s.add('face'); s.add('permanencia'); s.add('arma'); }
    if (/biblioteca|acervo|balcão|secretaria/.test(n) && i % 2) s.add('fila');
    if (/laborat|arquibancada|quadra/.test(n)) s.add('fogo');
    if (/entrada 1 te|portaria 1/.test(n)) s.add('contagem');
    if (/setor a|setor b/.test(n)) s.add('permanencia');
    out[c.id] = [...s];
  });
  return out;
}

export const offline = (c: Device) => c.situacao === 'inativo' || c.conn === 'offline' || c.situacao === 'manutencao';
