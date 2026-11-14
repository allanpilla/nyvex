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
