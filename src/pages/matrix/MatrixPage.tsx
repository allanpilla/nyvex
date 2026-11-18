import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, Segmented, Select, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import {
  ageText, ENT, ENTITIES, fmtDT, pairType, PAIRS, PERIODS, PLACES, placeText, TYPE_LABEL, WINDOW_TXT, NOW,
  type Encounter, type Pair, type PairType, type Period,
} from './data';
import { Ent, EntChip } from './parts';
import { PairDrawer } from './PairDrawer';
import '../devices/devices.css';
import '../locations/locations.css';
import '../watchlists/watchlists.css';
import './matrix.css';

type View = 'matriz' | 'pares';
type Quick = 'all' | PairType | 'rec';
type FKey = 'place' | 'floor';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { place: [], floor: [] };
const FLOORS = ['Térreo', '1º andar', '2º andar', '3º andar', 'Área externa'];
const F_GROUPS: { key: FKey; label: string; opts: string[] }[] = [
  { key: 'place', label: 'Local', opts: PLACES.map((p) => p.name) },
  { key: 'floor', label: 'Andar', opts: FLOORS },
];
type SortKey = 'n' | 'last' | 'places' | 'name';
const SORT_OPTS: [SortKey, string][] = [['n', 'Vezes juntos'], ['last', 'Último encontro'], ['places', 'Locais distintos'], ['name', 'Par']];
const REC = 5;
const MAX_ENT = 14;

/** Par já filtrado pelo período e pelos locais: só os encontros que contam. */
type Row = { p: Pair; enc: Encounter[]; n: number; last: string; places: [string, number][] };

export function MatrixPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [view, setView] = useState<View>('matriz');
  const [period, setPeriod] = useState<Period>('30d');
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'n', dir: -1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<{ r: string; c: string } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [spin, setSpin] = useState(false);

  const hours = PERIODS.find((x) => x.value === period)!.hours;
  const encOk = (e: Encounter, fl: Filters) => NOW - new Date(e.at).getTime() <= hours * 3600e3
    && (fl.place.length === 0 || fl.place.includes(e.place))
    && (fl.floor.length === 0 || fl.floor.includes(e.floor ?? 'Área externa'));
  const build = (fl: Filters): Row[] => PAIRS.map((p) => {
    const enc = p.enc.filter((e) => encOk(e, fl));
    const m = new Map<string, number>();
    enc.forEach((e) => { const k = placeText(e.place, e.floor); m.set(k, (m.get(k) ?? 0) + 1); });
    return { p, enc, n: enc.length, last: enc[0]?.at ?? '', places: [...m].sort((a, b) => b[1] - a[1]) };
  }).filter((r) => r.n > 0);

  const nq = norm(q.trim());
  const textOk = (r: Row) => !nq || norm(`${ENT[r.p.a].label} ${ENT[r.p.a].sub} ${ENT[r.p.b].label} ${ENT[r.p.b].sub}`).includes(nq);
  const base = useMemo(() => build(f).filter(textOk), [f, period, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const quickOk = (k: Quick, r: Row) => k === 'all' || (k === 'rec' ? r.n >= REC : pairType(r.p) === k);
  const hits = useMemo(() => base.filter((r) => quickOk(quick, r)), [base, quick]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => [...hits].sort((a, b) => {
    const nm = `${ENT[a.p.a].label}${ENT[a.p.b].label}`.localeCompare(`${ENT[b.p.a].label}${ENT[b.p.b].label}`, 'pt-BR');
    const r = sort.k === 'n' ? a.n - b.n : sort.k === 'last' ? a.last.localeCompare(b.last) : sort.k === 'places' ? a.places.length - b.places.length : nm;
    return r * sort.dir || b.n - a.n || nm;
  }), [hits, sort]);

  // Matriz: as entidades com mais encontros, nas linhas e nas colunas
  const ents = useMemo(() => {
    const tot = new Map<string, number>();
    hits.forEach((r) => { tot.set(r.p.a, (tot.get(r.p.a) ?? 0) + r.n); tot.set(r.p.b, (tot.get(r.p.b) ?? 0) + r.n); });
    return ENTITIES.filter((e) => tot.has(e.id))
      .sort((a, b) => (a.kind === b.kind ? (tot.get(b.id)! - tot.get(a.id)!) : a.kind === 'pessoa' ? -1 : 1))
      .slice(0, MAX_ENT).map((e) => ({ e, tot: tot.get(e.id)! }));
  }, [hits]);
  const cell = useMemo(() => {
    const m = new Map<string, Row>();
    hits.forEach((r) => { m.set(`${r.p.a}|${r.p.b}`, r); m.set(`${r.p.b}|${r.p.a}`, r); });
    return m;
  }, [hits]);
  const max = Math.max(1, ...hits.map((r) => r.n));

  const count = (k: Quick) => base.filter((r) => quickOk(k, r)).length;
  const nPeople = new Set(base.flatMap((r) => [r.p.a, r.p.b]).filter((id) => ENT[id].kind === 'pessoa')).size;
  const nVeh = new Set(base.flatMap((r) => [r.p.a, r.p.b]).filter((id) => ENT[id].kind === 'veiculo')).size;
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const anyFilter = nF > 0 || !!nq || quick !== 'all';
  const open = openId ? build(f).find((r) => r.p.id === openId) ?? null : null;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }));
  const exportCsv = (list: Row[]) => {
    const head = ['Entidade A', 'Tipo A', 'Entidade B', 'Tipo B', 'Vezes juntos', 'Data e hora', 'Local', 'Andar', 'Câmera'];
    const lines = list.flatMap((r) => r.enc.map((e) => [ENT[r.p.a].label, ENT[r.p.a].kind, ENT[r.p.b].label, ENT[r.p.b].kind, r.n, fmtDT(e.at), e.place, e.floor ?? 'Área externa', e.camera]))
      .map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'matriz-de-relacionamento.csv';
    a.click();
    toast(`${list.length} ${list.length === 1 ? 'par exportado' : 'pares exportados'} (CSV)`);
  };

  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Pares', icon: 'nodes', tone: 'neutral', hint: 'Duplas de não cadastrados vistas juntas ao menos uma vez' },
    { k: 'pp', label: 'Pessoa + pessoa', icon: 'people', tone: 'neutral', hint: 'Duas pessoas sem cadastro vistas juntas' },
    { k: 'pv', label: 'Pessoa + veículo', icon: 'car', tone: 'neutral', hint: 'Pessoa sem cadastro vista junto de um veículo sem cadastro' },
    { k: 'vv', label: 'Veículo + veículo', icon: 'share', tone: 'neutral', hint: 'Veículos sem cadastro que entram ou circulam juntos' },
    { k: 'rec', label: `Recorrentes (${REC}+ vezes)`, icon: 'replay', tone: 'warn', hint: `Pares vistos juntos ${REC} vezes ou mais no período` },
  ];

  return (
    <div className="dv lc wl mx">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Quantas vezes pessoas e veículos sem cadastro no campus foram vistos juntos, e onde."
          icon="grid"
          actions={<Button icon="download" onClick={() => exportCsv(rows)}>Exportar</Button>}
        />

        <div className="dv-body">
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards mx-cards" role="group" aria-label="Filtrar">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${c.k === 'rec' && n > 0 ? ' wl-alarm' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </CardBtn>
                );
              })}
            </div>
            <div className="dv-meters">
              <div className="dv-meter lc-split wl-split">
                <div className="dv-meter__top"><span>Não cadastrados envolvidos</span></div>
                <div className="lc-split__vals mx-split">
                  <span><b>{nPeople}</b><span>Pessoas</span></span>
                  <span><b>{nVeh}</b><span>Veículos</span></span>
                </div>
                <div className="lc-split__bar"><i style={{ width: `${(nPeople / Math.max(1, nPeople + nVeh)) * 100}%` }} /></div>
              </div>
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Matriz de relacionamento">
            <div className="dv-tools">
              <Segmented label="Visualização" value={view} onChange={setView} options={[
                { value: 'matriz', label: <><Icon name="grid" size={14} />Matriz</> },
                { value: 'pares', label: <><Icon name="stack" size={14} />Pares</> },
              ]} />
              <span className="wl-title"><b>{hits.length}</b> {hits.length === 1 ? 'par' : 'pares'} · <b>{hits.reduce((s, r) => s + r.n, 0)}</b> encontros</span>
              <span className="dv-tools__sp" />
              <div className="mx-period"><Select label="Período" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} /></div>
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código, placa ou modelo" aria-label="Buscar"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              {view === 'pares' && <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />}
              <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }} tipPlace="bottom" />
            </div>

            {showF && <div className="dv-filters" role="group" aria-label="Filtros">
              {F_GROUPS.map((g) => (
                <button key={g.key} type="button" className={`dv-fdrop${f[g.key].length ? ' is-on' : ''}${filterBtn?.key === g.key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={filterBtn?.key === g.key}
                  onClick={(e) => setFilterBtn(filterBtn?.key === g.key ? null : { key: g.key, el: e.currentTarget })}>
                  <span className="dv-fdrop__k">{g.label}:</span>
                  <span className="dv-fdrop__v">{f[g.key].length === 0 ? 'todos' : f[g.key].length === 1 ? f[g.key][0] : `${f[g.key].length} selecionados`}</span>
                  <Icon name="chevron" size={14} />
                </button>
              ))}
            </div>}

            {anyFilter && (
              <div className="dv-chips">
                <span className="dv-chips__n"><b>{hits.length}</b> de {build(EMPTY).length}</span>
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {v}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            {hits.length === 0 ? (
              <div className="dv-table"><Empty onClear={clearAll} /></div>
            ) : view === 'matriz' ? (
              <div className="mx-wrap">
                <div className="mx-grid" role="grid" aria-label="Vezes vistos juntos" style={{ gridTemplateColumns: `240px repeat(${ents.length}, minmax(52px, 1fr))` }}>
                  <div className="mx-corner" role="columnheader">
                    <span>Vezes vistos juntos</span>
                    <span className="mx-legend"><i style={{ opacity: .2 }} /><i style={{ opacity: .5 }} /><i style={{ opacity: .8 }} /><i />{max}</span>
                  </div>
                  {ents.map(({ e }) => (
                    <ColHead key={e.id} id={e.id} on={focus === e.id || hover?.c === e.id} onClick={() => setFocus(focus === e.id ? null : e.id)} />
                  ))}
                  {ents.map(({ e, tot }) => (
                    <MatrixRow key={e.id} id={e.id} tot={tot}>
                      <button type="button" role="rowheader" className={`mx-rh${focus === e.id || hover?.r === e.id ? ' is-on' : ''}`} onClick={() => setFocus(focus === e.id ? null : e.id)}>
                        <Ent id={e.id} />
                        <span className="mx-rh__n">{tot}</span>
                      </button>
                      {ents.map(({ e: c }) => {
                        if (c.id === e.id) return <span key={c.id} className="mx-cell is-self" role="gridcell" aria-hidden />;
                        const r = cell.get(`${e.id}|${c.id}`);
                        const dim = focus && focus !== e.id && focus !== c.id;
                        const cross = hover && (hover.r === e.id || hover.c === c.id);
                        if (!r) return <span key={c.id} role="gridcell" className={`mx-cell is-empty${cross ? ' is-cross' : ''}${dim ? ' is-dim' : ''}`} onMouseEnter={() => setHover({ r: e.id, c: c.id })} onMouseLeave={() => setHover(null)} />;
                        return (
                          <Cell key={c.id} r={r} max={max} on={openId === r.p.id} cross={!!cross} dim={!!dim}
                            onEnter={() => setHover({ r: e.id, c: c.id })} onLeave={() => setHover(null)} onClick={() => setOpenId(r.p.id)} />
                        );
                      })}
                    </MatrixRow>
                  ))}
                </div>
                {ents.length >= MAX_ENT && <p className="mx-more">Mostrando os {MAX_ENT} mais conectados. Use a busca ou a visualização em Pares para ver todos.</p>}
              </div>
            ) : (
              <div className="dv-table mx-table" role="table" aria-label="Pares vistos juntos">
                <div className="dv-tr dv-th" role="row">
                  <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Par</Th>
                  <span className="dv-c mx-c--type" role="columnheader">Tipo</span>
                  <Th k="n" sort={sort} onSort={sortBy} cls="mx-c--n">Vezes juntos</Th>
                  <Th k="places" sort={sort} onSort={sortBy} cls="mx-c--where">Onde mais</Th>
                  <Th k="last" sort={sort} onSort={sortBy} cls="mx-c--last">Último encontro</Th>
                  <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
                </div>
                {rows.map((r) => (
                  <div key={r.p.id} role="row" tabIndex={0} className={`dv-tr${openId === r.p.id ? ' is-open' : ''}`}
                    onClick={() => setOpenId(openId === r.p.id ? null : r.p.id)} onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') setOpenId(r.p.id); }}>
                    <span className="dv-c dv-c--name mx-pair" role="cell">
                      <EntChip id={r.p.a} /><Icon name="plus" size={12} className="mx-plus" /><EntChip id={r.p.b} />
                    </span>
                    <span className="dv-c mx-c--type" role="cell"><Badge tone="neutral">{TYPE_LABEL[pairType(r.p)]}</Badge></span>
                    <span className="dv-c mx-c--n" role="cell">
                      <span className="mx-nbar"><b className={r.n >= REC ? 'wl-pend' : undefined}>{r.n}×</b><i><u style={{ width: `${(r.n / max) * 100}%` }} /></i></span>
                    </span>
                    <span className="dv-c mx-c--where" role="cell">
                      <span className="dv-two"><b>{r.places[0][0]}</b><span>{r.places[0][1]}× aqui{r.places.length > 1 ? ` · +${r.places.length - 1} ${r.places.length === 2 ? 'local' : 'locais'}` : ''}</span></span>
                    </span>
                    <span className="dv-c mx-c--last" role="cell"><span className="dv-two"><b>{fmtDT(r.last)}</b><span>{ageText(r.last)}</span></span></span>
                    <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon="more" label="Mais ações" onClick={(e) => setRowMenu(rowMenu?.id === r.p.id ? null : { el: e.currentTarget, id: r.p.id })} tipPlace="top" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="dv-foot">
          <span>{hits.length} {hits.length === 1 ? 'par' : 'pares'} · {PERIODS.find((p) => p.value === period)!.label.toLowerCase()}</span>
          <span className="dv-tools__sp" />
          <span className="wl-foot">Vistos juntos = {WINDOW_TXT}. Só entram pessoas e veículos sem cadastro no campus.</span>
        </footer>
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(520px, 100%)' }}>
            <PairDrawer key={open.p.id} pair={open.p} enc={open.enc} places={open.places} period={PERIODS.find((p) => p.value === period)!.label.toLowerCase()}
              others={(id) => build(f).filter((r) => r.p.id !== open.p.id && (r.p.a === id || r.p.b === id))}
              onOpenPair={(id) => setOpenId(id)} onClose={() => setOpenId(null)} onExport={() => exportCsv([open])} />
          </div>
        </div>,
        document.body,
      )}

      {filterBtn && (() => {
        const g = F_GROUPS.find((x) => x.key === filterBtn.key)!;
        return (
          <Menu anchor={filterBtn.el} align="left" onClose={() => setFilterBtn(null)} className="dv-fmenu">
            <div className="dv-fmenu__body">
              <div className="nx-menu__title">{g.label}</div>
              {g.opts.map((v) => (
                <Checkbox key={v} label={v} checked={f[g.key].includes(v)} onChange={() => toggleF(g.key, v)}>
                  <span className="dv-fmenu__l">{v}</span>
                  <span className="dv-fmenu__n">{build({ ...f, [g.key]: [v] }).filter(textOk).length}</span>
                </Checkbox>
              ))}
            </div>
            <div className="dv-fmenu__foot">
              <Button disabled={!f[g.key].length} onClick={() => setF((o) => ({ ...o, [g.key]: [] }))}>Limpar</Button>
              <Button variant="primary" onClick={() => setFilterBtn(null)}>Ver {hits.length}</Button>
            </div>
          </Menu>
        );
      })()}

      {rowMenu && (() => {
        const r = rows.find((x) => x.p.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir encontros" onClick={close(() => setOpenId(r.p.id))} />
            <NavItem role="menuitem" icon="eye" label="Incluir os dois numa lista de observação" onClick={close(() => toast('Abre a inclusão em lista de observação · simulado no protótipo'))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="download" label="Exportar encontros" onClick={close(() => exportCsv([r]))} />
          </Menu>
        );
      })()}
    </div>
  );
}

/* ───────────── peças ───────────── */

function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}
function Th({ k, sort, onSort, cls, children }: { k: SortKey; sort: { k: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; cls: string; children: ReactNode }) {
  const on = sort.k === k;
  return (
    <span className={`dv-c ${cls}`} role="columnheader" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`dv-sort${on ? ' is-on' : ''}`} onClick={() => onSort(k)}>
        {children}<Icon name={on ? 'chevron' : 'sort'} size={14} className={on ? (sort.dir === 1 ? 'is-asc' : 'is-desc') : undefined} />
      </button>
    </span>
  );
}
function CardBtn({ hint, ...rest }: { hint: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = useTooltip(hint, undefined, true, 'bottom');
  return <button type="button" {...tip} {...rest} />;
}
function MatrixRow({ children }: { id: string; tot: number; children: ReactNode }) {
  return <div className="mx-row" role="row">{children}</div>;
}
function ColHead({ id, on, onClick }: { id: string; on: boolean; onClick: () => void }) {
  const e = ENT[id];
  const tip = useTooltip(`${e.label} · ${e.sub}`, undefined, true, 'top');
  return (
    <button type="button" role="columnheader" className={`mx-ch${on ? ' is-on' : ''}`} onClick={onClick} {...tip}>
      <Ent id={id} mini />
      <span className="mx-ch__l">{e.kind === 'pessoa' ? e.label.replace('Pessoa ', '') : e.label}</span>
    </button>
  );
}
function Cell({ r, max, on, cross, dim, onEnter, onLeave, onClick }: { r: Row; max: number; on: boolean; cross: boolean; dim: boolean; onEnter: () => void; onLeave: () => void; onClick: () => void }) {
  const a = ENT[r.p.a], b = ENT[r.p.b];
  const tip = useTooltip(`${a.label} + ${b.label}: ${r.n}× juntos · mais em ${r.places[0][0]}`, undefined, true, 'top');
  const t = r.n / max;
  return (
    <button type="button" role="gridcell" className={`mx-cell${on ? ' is-open' : ''}${cross ? ' is-cross' : ''}${dim ? ' is-dim' : ''}${t > .55 ? ' is-hot' : ''}`}
      style={{ ['--t' as string]: (0.14 + t * 0.86).toFixed(2) }} aria-label={`${a.label} e ${b.label}: ${r.n} vezes`}
      {...tip} onMouseEnter={(ev) => { tip.onMouseEnter(ev); onEnter(); }} onMouseLeave={() => { tip.onMouseLeave(); onLeave(); }} onClick={onClick}>
      {r.n}
    </button>
  );
}
function Empty({ onClear }: { onClear: () => void }) {
  return (
    <div className="dv-empty">
      <span className="dv-empty__ic"><Icon name="nodes" /></span>
      <b>Nenhum par visto junto</b>
      <span>Amplie o período ou revise a busca e os filtros.</span>
      <Button onClick={onClear}>Limpar filtros</Button>
    </div>
  );
}
