import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Icon, Kbd } from '../ds/components';
import type { IconName } from '../ds/icons/icons';
import { storage } from '../lib/storage';
import { useUi } from '../lib/useUi';
import { KINDS, SAMPLE_RECENT_QUERIES, SAMPLE_RECENT_VISITED, type Entry, type Kind } from './data';
import { byId, looksLikePlate, norm, search } from './engine';

type Filter = Kind | 'all';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'pessoa', label: 'Pessoas' },
  { id: 'veiculo', label: 'Veículos' },
  { id: 'camera', label: 'Câmeras' },
  { id: 'local', label: 'Locais' },
  { id: 'ocorrencia', label: 'Ocorrências' },
  { id: 'alerta', label: 'Alertas' },
  { id: 'tela', label: 'Telas' },
];
const GROUP_ORDER: Kind[] = ['acao', 'veiculo', 'pessoa', 'alerta', 'ocorrencia', 'camera', 'local', 'tela'];
const PER_GROUP = 3;

const readList = (k: string, fallback: string[]) => {
  try { const v = JSON.parse(storage.get(k) ?? 'null'); return Array.isArray(v) ? (v as string[]) : fallback; } catch { return fallback; }
};
const pushList = (k: string, list: string[], v: string) => {
  const next = [v, ...list.filter((x) => x !== v)].slice(0, 5);
  storage.set(k, JSON.stringify(next));
  return next;
};

/** Realça os termos buscados dentro do texto. */
function Hl({ text, q }: { text: string; q: string }) {
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 0);
  if (!terms.length) return <>{text}</>;
  const n = norm(text);
  const marks = new Array(text.length).fill(false);
  for (const t of terms) {
    let i = n.indexOf(t);
    while (i >= 0) {
      // Termos de 1 letra só realçam no começo de palavra (evita pintar letras soltas).
      if (t.length > 1 || i === 0 || !/[a-z0-9]/.test(n[i - 1])) for (let j = i; j < i + t.length; j++) marks[j] = true;
      i = n.indexOf(t, i + t.length);
    }
  }
  const out: ReactNode[] = [];
  let i = 0;
  while (i < text.length) { const m = marks[i]; let j = i; while (j < text.length && marks[j] === m) j++; out.push(m ? <mark key={i}>{text.slice(i, j)}</mark> : text.slice(i, j)); i = j; }
  return <>{out}</>;
}

type Row = { key: string; onSelect: () => void; node: (sel: boolean) => ReactNode };

function RowView({ icon, title, subtitle, tag, side, sel, tone, q = '' }: {
  icon: IconName; title: string; subtitle?: string; tag?: Entry['tag']; side?: string; sel: boolean; tone?: 'plain'; q?: string;
}) {
  return (
    <>
      <span className={`nx-sr__ic${tone ? ` nx-sr__ic--${tone}` : ''}`}><Icon name={icon} size={18} /></span>
      <span className="nx-sr__txt">
        <span className="nx-sr__title"><Hl text={title} q={q} /></span>
        {subtitle && <span className="nx-sr__sub"><Hl text={subtitle} q={q} /></span>}
      </span>
      {tag && <Badge tone={tag.tone}>{tag.label}</Badge>}
      {side && <span className="nx-sr__side">{side}</span>}
      {/* Espaço fixo para o ↵: aparece só na linha selecionada, sem empurrar o conteúdo. */}
      <span className={`nx-sr__enter${sel ? ' is-on' : ''}`} aria-hidden="true"><Icon name="enter" size={16} /></span>
    </>
  );
}

export function SearchPalette() {
  const { paletteOpen, setPaletteOpen } = useUi();
  if (!paletteOpen) return null;
  return <Palette onClose={() => setPaletteOpen(false)} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { toast } = useUi();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState(0);
  const [recentQ, setRecentQ] = useState(() => readList('nx-recent-q', SAMPLE_RECENT_QUERIES));
  const [recentV, setRecentV] = useState(() => readList('nx-recent-v', SAMPLE_RECENT_VISITED));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const open = (e: Entry) => {
    if (q.trim()) setRecentQ(pushList('nx-recent-q', recentQ, q.trim()));
    if (e.kind !== 'tela' && e.kind !== 'acao') setRecentV(pushList('nx-recent-v', recentV, e.id));
    navigate(e.path);
    onClose();
    if (e.kind === 'acao') toast(`${e.title}: ação simulada no protótipo`);
    else if (e.kind !== 'tela') toast(`Abrindo ${KINDS[e.kind].label.toLowerCase()}: ${e.title}`);
  };
  const entryRow = (e: Entry, opts: { side?: string; prefix?: string } = {}): Row => ({
    key: `${opts.prefix ?? ''}${e.id}`,
    onSelect: () => open(e),
    node: (s) => <RowView icon={KINDS[e.kind].icon} title={e.title} subtitle={e.subtitle} tag={e.tag} side={opts.side ?? KINDS[e.kind].label} sel={s} q={q} />,
  });

  const results = useMemo(() => search(q, filter), [q, filter]);

  // Monta as seções e a lista navegável por teclado.
  const sections: { title?: string; rows: Row[]; more?: { label: string; onClick: () => void } }[] = [];
  if (!q.trim()) {
    sections.push({
      title: 'Buscados recentemente',
      rows: recentQ.map((r) => ({ key: `rq-${r}`, onSelect: () => { setQ(r); inputRef.current?.focus(); }, node: (sel) => <RowView icon="clock" tone="plain" title={r} sel={sel} /> })),
    });
    sections.push({ title: 'Visitados recentemente', rows: recentV.map(byId).filter((e): e is Entry => !!e).map((e) => entryRow(e, { prefix: 'rv-' })) });
  } else if (filter === 'all') {
    for (const k of GROUP_ORDER) {
      const items = results.filter((e) => e.kind === k);
      if (!items.length) continue;
      sections.push({
        title: KINDS[k].plural,
        rows: items.slice(0, PER_GROUP).map((e) => entryRow(e, { side: k === 'acao' ? undefined : '' })),
        more: items.length > PER_GROUP ? { label: `Ver todos os ${items.length}`, onClick: () => setFilter(k) } : undefined,
      });
    }
  } else {
    sections.push({ title: `${KINDS[filter].plural} · ${results.length}`, rows: results.map((e) => entryRow(e, { side: '' })) });
  }
  const rows = sections.flatMap((s) => s.rows);
  const selIdx = Math.min(sel, Math.max(rows.length - 1, 0));

  useEffect(() => { setSel(0); }, [q, filter]);
  useEffect(() => { listRef.current?.querySelector('.is-sel')?.scrollIntoView({ block: 'nearest' }); }, [selIdx]);


  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(Math.min(selIdx + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(Math.max(selIdx - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      rows[selIdx]?.onSelect();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const i = FILTERS.findIndex((f) => f.id === filter);
      setFilter(FILTERS[(i + (e.shiftKey ? FILTERS.length - 1 : 1)) % FILTERS.length].id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (q) setQ(''); else onClose();
    }
  };

  const plateHint = looksLikePlate(q);
  let k = -1;

  return (
    <div className="nx-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nx-sp" role="dialog" aria-label="Buscar">
        <div className="nx-sp__wrap">
        <div className="nx-sp__field">
          <Icon name="search" className="nx-sp__lead" />
          <input
            ref={inputRef}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={q}
            placeholder="Buscar pessoas, placas, câmeras, locais, ocorrências…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        </div>

        <div className="nx-sp__panel">
                      <div className="nx-sp__filters" role="tablist">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`nx-chip${filter === f.id ? ' is-on' : ''}`} onClick={() => { setFilter(f.id); inputRef.current?.focus(); }}>
                  {f.label}
                </button>
              ))}
            </div>

          <div className="nx-sp__list" ref={listRef}>
            {plateHint && <div className="nx-sp__hint">Parece uma placa: mostrando veículos primeiro.</div>}

            {sections.map((s) => (
              <Fragment key={s.title}>
                {s.title && <div className="nx-sp__sec">{s.title}</div>}
                {s.rows.map((r) => {
                  k += 1;
                  const idx = k;
                  return (
                    <button key={r.key} type="button" className={`nx-sr${idx === selIdx ? ' is-sel' : ''}`} onMouseMove={() => idx !== selIdx && setSel(idx)} onClick={r.onSelect}>
                      {r.node(idx === selIdx)}
                    </button>
                  );
                })}
                {s.more && <button type="button" className="nx-sp__more" onClick={s.more.onClick}>{s.more.label} →</button>}
              </Fragment>
            ))}

            {q.trim() && rows.length === 0 && (
              <div className="nx-sp__empty">
                <b>Nada encontrado para “{q}”</b>
                <span>Confira a grafia ou tente outro termo, como uma placa, um local ou um nome.</span>
              </div>
            )}
          </div>

          <div className="nx-sp__foot">
            <span><Kbd>↑↓</Kbd> Navegar</span>
            <span><Kbd>Enter</Kbd> Abrir</span>
            <span><Kbd>Tab</Kbd> Filtrar</span>
            <span><Kbd>Esc</Kbd> Fechar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
