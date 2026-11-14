import { SCREENS } from '../navigation';
import { ENTRIES, type Entry, type Kind } from './data';

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const compact = (s: string) => norm(s).replace(/[\s-]/g, '');

/** Telas do menu e ações das telas também entram na busca. */
const SCREEN_ENTRIES: Entry[] = SCREENS.map((s) => ({
  id: `t-${s.id}`, kind: 'tela', title: s.label, subtitle: s.group ? `${s.group} · ${s.description}` : s.description, path: s.path,
}));
const ACTION_ENTRIES: Entry[] = SCREENS.flatMap((s) =>
  (s.actions ?? []).map((a) => ({ id: `ac-${s.id}-${a}`, kind: 'acao' as Kind, title: a, subtitle: `Em ${s.label}`, path: s.path })),
);

export const INDEX: Entry[] = [...ENTRIES, ...SCREEN_ENTRIES, ...ACTION_ENTRIES];
export const byId = (id: string) => INDEX.find((e) => e.id === id);

/** Parece placa (ABC1234 ou ABC1D23)? */
export const looksLikePlate = (q: string) => /^[a-z]{3}\d[a-z0-9]\d{2}$/i.test(q.replace(/[\s-]/g, ''));

/** Busca por palavras (todas precisam casar) com pontuação simples. */
export function search(q: string, kind: Kind | 'all'): Entry[] {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const plate = looksLikePlate(q);
  const scored: { e: Entry; score: number }[] = [];
  for (const e of INDEX) {
    if (kind !== 'all' && e.kind !== kind) continue;
    const title = norm(e.title);
    const hay = `${title} ${norm(e.subtitle)} ${norm(e.keywords ?? '')} ${norm(e.tag?.label ?? '')}`;
    let score = 0;
    let ok = true;
    for (const t of terms) {
      if (title.startsWith(t)) score += 6;
      else if (title.includes(t)) score += 4;
      else if (hay.includes(t)) score += 1;
      else if (e.kind === 'veiculo' && compact(e.title).includes(compact(t))) score += 5;
      else { ok = false; break; }
    }
    if (!ok) continue;
    if (plate && e.kind === 'veiculo') score += 10;
    if (e.kind === 'tela' || e.kind === 'acao') score -= 1;
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

/** Resposta simulada do modo IA: interpreta a pergunta por palavras-chave. */
export function askAi(q: string): { summary: string; results: Entry[] } {
  const n = norm(q);
  const pick = (f: (e: Entry) => boolean) => ENTRIES.filter(f);
  if (/camera|dispositivo|offline|problema|sinal/.test(n)) {
    const r = pick((e) => e.kind === 'camera' && !!e.tag && e.tag.tone !== 'success');
    return { summary: `${r.length} câmeras com problema agora: 1 offline há mais de 2 horas e 1 com imagem instável. As duas ficam no Bloco B e no Estacionamento B.`, results: r };
  }
  if (/restri|furto|roub|placa|veicul|carro/.test(n)) {
    const r = pick((e) => (e.kind === 'veiculo' && e.tag?.tone === 'danger') || e.id === 'a1');
    return { summary: 'Hoje 1 veículo em restrição passou pelo campus: a placa MKP3H41, lida pela LPR-03 no Estacionamento A há 4 minutos. Já existe um alerta crítico aberto.', results: r };
  }
  if (/ocorr/.test(n)) {
    const r = pick((e) => e.kind === 'ocorrencia' && e.tag?.label !== 'Encerrada' && (!/bloco b/.test(n) || /bloco b/.test(norm(e.subtitle))));
    return { summary: `${r.length} ocorrências abertas${/bloco b/.test(n) ? ' no Bloco B' : ''}. A mais recente é o furto de celular no 2º andar, em atendimento há 35 minutos.`, results: r };
  }
  if (/observ|watch|lista|pessoa|portaria/.test(n)) {
    const r = pick((e) => e.id === 'p1' || e.id === 'a2' || e.id === 'p4');
    return { summary: '1 pessoa da lista de observação passou pela Portaria principal hoje (Mariana Duarte Lopes, às 09:28). Também há um desconhecido recorrente visto 6 vezes na semana.', results: r };
  }
  const r = search(q, 'all').slice(0, 6);
  return { summary: r.length ? `Encontrei ${r.length} registros relacionados a “${q}”.` : `Não encontrei nada sobre “${q}”. Tente citar uma placa, um local, uma câmera ou uma pessoa.`, results: r };
}
