import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, Select, Switch } from '../../ds/components';
import { copy } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { Figure } from './Figure';
import { NewSearch } from './NewSearch';
import { SearchMotion } from './SearchMotion';
import { TraitDrawer } from './TraitDrawer';
import { Card, dayKey, dayLabel, describe, PERIOD_LABEL } from './parts';
import { buildObs, camName, EMPTY, isSet, ME, nextCode, runSearch, score, seedSearches, TRAIT_KEYS, traitLabel, when, type Filters, type Obs, type Search } from './data';
import { Vehicle } from './Vehicle';
import { VehicleResults } from './VehicleResults';
import { buildVehicles, runVehicleSearch, seedVehicleSearches, vDescribe, type VFilters } from './vehicles';
import '../mural/mural.css';
import '../devices/devices.css';
import '../watchlists/watchlists.css';
import '../faces/faces.css';
import '../occurrences/occurrences.css';
import './traits.css';

type Sort = 'recent' | 'match';
type FKey = 'kind' | 'by' | 'local' | 'period';
type LFilters = Record<FKey, string[]>;
const LEMPTY: LFilters = { kind: [], by: [], local: [], period: [] };
type LSortKey = 'code' | 'n' | 'at';
const LSORT: [LSortKey, string][] = [['at', 'Data'], ['code', 'Busca'], ['n', 'Resultados']];
const PAGE = 48;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const ALL_LOC = 'Todos os locais';

export function TraitsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [now] = useState(() => Date.now());
  const all = useMemo(() => buildObs(now), [now]);
  const allV = useMemo(() => buildVehicles(now), [now]);
  const [list, setList] = useState<Search[]>(() => [...seedSearches(all, now), ...seedVehicleSearches(allV, now, ME).map((v) => ({ ...v, id: '', code: '', f: { ...EMPTY, locais: v.vf.locais, period: v.vf.period } }))]
    .sort((a, b) => b.at - a.at).map((s, i) => ({ ...s, id: `s${i}`, code: `BC-${String(418 - i).padStart(4, '0')}` })));
  const [q, setQ] = useState('');
  const [lf, setLf] = useState<LFilters>(LEMPTY);
  const [showF, setShowF] = useState(false);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [sort, setSort] = useState<{ k: LSortKey; dir: 1 | -1 }>({ k: 'at', dir: -1 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [spin, setSpin] = useState(false);
  const [wizard, setWizard] = useState<{ initial?: Filters; initialV?: VFilters } | null>(null);
  const redo = (s: Search) => setWizard(s.vf ? { initialV: s.vf } : { initial: s.f });
  const [openSearch, setOpenSearch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = (f: Filters, purpose: string, vf?: VFilters) => {
    const at = Date.now();
    const r = vf ? (({ exact, vehicles }) => ({ exact, people: vehicles }))(runVehicleSearch(allV, vf, at)) : runSearch(all, f, at);
    const s: Search = { id: `n${at}`, code: nextCode(), f: vf ? { ...EMPTY, locais: vf.locais, period: vf.period, from: vf.from, to: vf.to } : f, vf, purpose, by: ME, me: true, at, n: r.exact.length, people: r.people };
    setWizard(null);
    setList((l) => [s, ...l]);
    setOpenSearch(s.id);
    setBusy(true);
    setTimeout(() => setBusy(false), 4200);
  };

  const locsOf = (s: Search) => (s.f.locais.length ? s.f.locais : [ALL_LOC]);
  const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
    { key: 'kind', label: 'Procurando', opts: [['pessoa', 'Pessoa'], ['veiculo', 'Veículo']] },
    { key: 'by', label: 'Feita por', opts: [...new Set([ME, ...list.map((s) => s.by)])].map((b) => [b, b]) },
    { key: 'local', label: 'Local', opts: [...new Set([ALL_LOC, ...list.flatMap(locsOf)])].map((l) => [l, l]) },
    { key: 'period', label: 'Período', opts: (Object.keys(PERIOD_LABEL) as Filters['period'][]).map((p) => [p, PERIOD_LABEL[p]]) },
  ];
  const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;
  const matches = (s: Search, fl: LFilters) => (fl.kind.length === 0 || fl.kind.includes(s.vf ? 'veiculo' : 'pessoa'))
    && (fl.by.length === 0 || fl.by.includes(s.by))
    && (fl.local.length === 0 || locsOf(s).some((l) => fl.local.includes(l)))
    && (fl.period.length === 0 || fl.period.includes(s.f.period));
  const nq = norm(q.trim());
  const textMatch = (s: Search) => !nq || norm(`${s.code} ${s.vf ? `veiculo ${vDescribe(s.vf)}` : describe(s.f)} ${s.purpose} ${s.by} ${s.f.locais.join(' ')}`).includes(nq);
  const hits = list.filter((s) => matches(s, lf) && textMatch(s));
  const rows = [...hits].sort((a, b) => (sort.k === 'n' ? a.n - b.n : sort.k === 'code' ? a.code.localeCompare(b.code) : a.at - b.at) * sort.dir);
  const nF = F_GROUPS.filter((g) => lf[g.key].length).length;
  const anyFilter = nF > 0 || !!nq;
  const allOn = rows.length > 0 && rows.every((s) => sel.has(s.id));
  const someOn = rows.some((s) => sel.has(s.id));
  const toggleF = (k: FKey, v: string) => setLf((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setLf(LEMPTY); setQ(''); };
  const sortBy = (k: LSortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'code' ? 1 : -1 }));
  const nBuscas = (n: number) => `${n} ${n === 1 ? 'busca' : 'buscas'}`;
  const cur = openSearch ? list.find((s) => s.id === openSearch) ?? null : null;

  return (
    <div className="mv tr">
      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="search"
          description="Encontre pessoas vistas pelas câmeras pela aparência. Descreve, não identifica."
          actions={<Button variant="primary" icon="plus" onClick={() => setWizard({})}>Nova busca</Button>}
        />

        {cur ? (
          cur.vf
            ? <VehicleResults key={cur.id} s={cur} all={allV} busy={busy} onBack={() => setOpenSearch(null)} onEdit={() => redo(cur)} onLike={(nf) => setWizard({ initialV: { ...cur.vf!, ...nf } })} toast={toast} />
            : <Results key={cur.id} s={cur} all={all} busy={busy} onBack={() => setOpenSearch(null)} onEdit={() => redo(cur)} onLike={(nf) => setWizard({ initial: { ...cur.f, ...nf } })} toast={toast} />
        ) : (
          <>
            <div className="dv-body tr-list">
              <section className="dv-tcard is-t2" aria-label="Buscas feitas">
                <div className="dv-tools">
                  <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'busca' : 'buscas'}</span>
                  <span className="dv-tools__sp" />
                  <label className="nx-input dv-search">
                    <Icon name="search" size={16} />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição, finalidade ou autor" aria-label="Buscar nas buscas feitas"
                      onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                    {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
                  </label>
                  <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
                  <SortButton options={LSORT} sort={sort} onChange={setSort} />
                  <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }} tipPlace="bottom" />
                </div>

                {showF && <div className="dv-filters" role="group" aria-label="Filtros">
                  {F_GROUPS.map((g) => (
                    <button key={g.key} type="button" className={`dv-fdrop${lf[g.key].length ? ' is-on' : ''}${filterBtn?.key === g.key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={filterBtn?.key === g.key}
                      onClick={(e) => setFilterBtn(filterBtn?.key === g.key ? null : { key: g.key, el: e.currentTarget })}>
                      <span className="dv-fdrop__k">{g.label}:</span>
                      <span className="dv-fdrop__v">{lf[g.key].length === 0 ? 'todos' : lf[g.key].length === 1 ? fLabel(g.key, lf[g.key][0]) : `${lf[g.key].length} selecionados`}</span>
                      <Icon name="chevron" size={14} />
                    </button>
                  ))}
                </div>}

                {anyFilter && (
                  <div className="dv-chips">
                    <span className="dv-chips__n"><b>{hits.length}</b> de {list.length}</span>
                    {q.trim() && <LChip onRemove={() => setQ('')}>“{q.trim()}”</LChip>}
                    {F_GROUPS.flatMap((g) => lf[g.key].map((v) => <LChip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</LChip>))}
                    <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
                  </div>
                )}

                <div className="dv-table tr-table" role="table" aria-label="Buscas feitas">
                  <div className="dv-tr dv-th" role="row">
                    <span className="dv-c dv-c--chk" role="columnheader">
                      <Checkbox label="Selecionar todas" checked={allOn} indeterminate={!allOn && someOn}
                        onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((x) => (allOn ? n.delete(x.id) : n.add(x.id))); return n; })} />
                    </span>
                    <Th k="code" sort={sort} onSort={sortBy} cls="dv-c--name">Busca</Th>
                    <span className="dv-c tr-c-purp" role="columnheader">Finalidade</span>
                    <span className="dv-c tr-c-where" role="columnheader">Onde e quando</span>
                    <Th k="n" sort={sort} onSort={sortBy} cls="tr-c-n">Resultados</Th>
                    <Th k="at" sort={sort} onSort={sortBy} cls="tr-c-by">Feita por</Th>
                    <span className="dv-c dv-c--act" role="columnheader" aria-label="Ações" />
                  </div>
                  {rows.map((s) => (
                    <div key={s.id} role="row" tabIndex={0} aria-selected={sel.has(s.id)} className={`dv-tr${sel.has(s.id) ? ' is-sel' : ''}`}
                      onClick={() => setOpenSearch(s.id)}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') setOpenSearch(s.id); }}>
                      <span className="dv-c dv-c--chk" role="cell" onClick={(e) => e.stopPropagation()}>
                        <Checkbox label={`Selecionar ${s.code}`} checked={sel.has(s.id)} onChange={(v) => setSel((x) => { const n = new Set(x); if (v) n.add(s.id); else n.delete(s.id); return n; })} />
                      </span>
                      <span className="dv-c dv-c--name" role="cell">
                        {s.vf ? <span className="dv-kind tr-kind is-veh"><Vehicle size="sm" type={s.vf.types[0]} colors={s.vf.colors} /></span> : <span className="dv-kind tr-kind"><Figure size="sm" upper={s.f.upper} lower={s.f.lower} gender={s.f.gender} hat={s.f.hat === 'sim'} glasses={s.f.glasses === 'sim'} backpack={s.f.backpack === 'sim'} extras={s.f.extras} top={s.f.tops[0]} bottom={s.f.bottoms[0]} /></span>}
                        <span className="dv-name"><b>{s.vf ? vDescribe(s.vf) : describe(s.f)}</b><span className="tr-code">{s.code}</span></span>
                      </span>
                      <span className="dv-c tr-c-purp" role="cell">{s.purpose}</span>
                      <span className="dv-c tr-c-where" role="cell"><span className="dv-two"><b>{s.f.locais.length ? s.f.locais.join(', ') : ALL_LOC}</b><span>{PERIOD_LABEL[s.f.period]}</span></span></span>
                      <span className="dv-c tr-c-n" role="cell"><span className="dv-two">{s.vf
                        ? <><b className="tr-num">{s.n.toLocaleString('pt-BR')} {s.n === 1 ? 'passagem' : 'passagens'}</b><span>{s.people} {s.people === 1 ? 'veículo' : 'veículos'}</span></>
                        : <><b className="tr-num">{s.n.toLocaleString('pt-BR')} {s.n === 1 ? 'registro' : 'registros'}</b><span>cerca de {s.people} {s.people === 1 ? 'pessoa' : 'pessoas'}</span></>}</span></span>
                      <span className="dv-c tr-c-by" role="cell"><span className="nx-avatar tr-av">{initials(s.by)}</span><span className="dv-two"><b>{s.by}</b><span>{when(s.at, now)}</span></span></span>
                      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
                        <IconButton icon="edit" label="Refazer com ajustes" onClick={() => redo(s)} tipPlace="top" />
                        <IconButton icon="more" label="Mais ações" onClick={(e) => setRowMenu(rowMenu?.id === s.id ? null : { el: e.currentTarget, id: s.id })} tipPlace="top" />
                      </span>
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <div className="dv-empty">
                      <span className="dv-empty__ic"><Icon name="search" /></span>
                      <b>{list.length ? 'Nenhuma busca encontrada' : 'Nenhuma busca ainda.'}</b>
                      {list.length > 0 ? <><span>Revise a busca ou os filtros aplicados.</span><Button onClick={clearAll}>Limpar filtros</Button></> : <Button variant="primary" icon="plus" onClick={() => setWizard({})}>Nova busca</Button>}
                    </div>
                  )}
                </div>
              </section>
            </div>
            <footer className="dv-foot">
              <span>{rows.length} de {nBuscas(list.length)}</span>
              <span className="dv-tools__sp" />
              <span className="tr-list__note"><Icon name="audit" size={14} />Toda busca fica registrada com a finalidade</span>
            </footer>
            {sel.size > 0 && (
              <div className="dv-bulk" role="toolbar" aria-label="Ações para as selecionadas">
                <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionada' : 'selecionadas'}</span>
                <span className="dv-bulk__sep" />
                <Button icon="download" onClick={() => { toast(`Resultados de ${nBuscas(sel.size)} enviados para Exportações`); setSel(new Set()); }}>Exportar resultados</Button>
                <span className="dv-bulk__sep" />
                <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
              </div>
            )}
          </>
        )}
      </div>

      {filterBtn && (() => {
        const g = F_GROUPS.find((x) => x.key === filterBtn.key)!;
        return (
          <Menu anchor={filterBtn.el} align="left" onClose={() => setFilterBtn(null)} className="dv-fmenu">
            <div className="dv-fmenu__body">
              <div className="nx-menu__title">{g.label}</div>
              {g.opts.map(([v, lb]) => (
                <Checkbox key={v} label={lb} checked={lf[g.key].includes(v)} onChange={() => toggleF(g.key, v)}>
                  <span className="dv-fmenu__l">{lb}</span>
                  <span className="dv-fmenu__n">{list.filter((s) => textMatch(s) && matches(s, { ...lf, [g.key]: [v] })).length}</span>
                </Checkbox>
              ))}
            </div>
            <div className="dv-fmenu__foot">
              <Button disabled={!lf[g.key].length} onClick={() => setLf((o) => ({ ...o, [g.key]: [] }))}>Limpar</Button>
              <Button variant="primary" onClick={() => setFilterBtn(null)}>Ver {hits.length}</Button>
            </div>
          </Menu>
        );
      })()}

      {rowMenu && (() => {
        const s = list.find((x) => x.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Ver resultados" onClick={close(() => setOpenSearch(s.id))} />
            <NavItem role="menuitem" icon="edit" label="Refazer com ajustes" onClick={close(() => redo(s))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="download" label="Exportar resultados" onClick={close(() => toast(`Resultados de ${s.code} enviados para Exportações`))} />
            <NavItem role="menuitem" icon="copy" label="Copiar código" onClick={close(() => copy(s.code, toast, 'Código copiado'))} />
          </Menu>
        );
      })()}

      {wizard && <NewSearch initial={wizard.initial} initialV={wizard.initialV} all={all} allV={allV} onClose={() => setWizard(null)} onSearch={create} />}
    </div>
  );
}

function LChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}
function Th({ k, sort, onSort, cls, children }: { k: LSortKey; sort: { k: LSortKey; dir: 1 | -1 }; onSort: (k: LSortKey) => void; cls: string; children: ReactNode }) {
  const on = sort.k === k;
  return (
    <span className={`dv-c ${cls}`} role="columnheader" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`dv-sort${on ? ' is-on' : ''}`} onClick={() => onSort(k)}>
        {children}<Icon name={on ? 'chevron' : 'sort'} size={14} className={on ? (sort.dir === 1 ? 'is-asc' : 'is-desc') : undefined} />
      </button>
    </span>
  );
}

/* ───────────── resultados de uma busca ───────────── */

function Results({ s, all, busy, onBack, onEdit, onLike, toast }: { s: Search; all: Obs[]; busy: boolean; onBack: () => void; onEdit: () => void; onLike: (f: Partial<Filters>) => void; toast: (m: string) => void }) {
  const [sort, setSort] = useState<Sort>('recent');
  const [group, setGroup] = useState(true);
  const [day, setDay] = useState('');
  const [cam, setCam] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const f = s.f;
  const res = useMemo(() => runSearch(all, f, s.at), [all, f, s.at]);

  const days = useMemo(() => {
    const m = new Map<string, { t: number; n: number }>();
    for (const o of res.exact) { const k = dayKey(o.at); const g = m.get(k); if (g) g.n++; else m.set(k, { t: o.at, n: 1 }); }
    return [...m.entries()].sort((a, b) => b[1].t - a[1].t);
  }, [res]);
  const filtered = res.exact.filter((o) => (!day || dayKey(o.at) === day) && (!cam || o.src === cam));
  const shown = useMemo(() => {
    const sorted = [...filtered].sort((x, y) => (sort === 'match' ? score(y, f) - score(x, f) || y.at - x.at : y.at - x.at));
    if (!group) return sorted.map((o) => ({ o, n: 1 }));
    const seen = new Map<number, { o: Obs; n: number }>();
    for (const o of sorted) { const g = seen.get(o.person); if (g) g.n++; else seen.set(o.person, { o, n: 1 }); }
    return [...seen.values()];
  }, [filtered, f, sort, group]);
  const narrowed = !!day || !!cam;
  const open = openId ? all.find((o) => o.id === openId) ?? null : null;
  const chips = [...TRAIT_KEYS.filter((k) => isSet(f, k)).map((k) => traitLabel(f, k)), f.locais.length ? f.locais.join(' ou ') : 'Todos os locais', PERIOD_LABEL[f.period]];

  return (
    <div className="tr-res">
      <div className="tr-rhead">
        <IconButton icon="arrowLeft" label="Voltar para as buscas" onClick={onBack} tipPlace="bottom" />
        <div className="tr-rhead__t">
          <b>{describe(f)}</b>
          <p><span className="tr-code">{s.code}</span><span>·</span>{s.by}<span>·</span>{when(s.at, now)}<span>·</span><Icon name="lock" size={12} /><span className="tr-rhead__p" title={s.purpose}>{s.purpose}</span></p>
        </div>
        <span className="dv-tools__sp" />
        <Button icon="edit" onClick={onEdit}>Editar busca</Button>
        <IconButton icon="download" label="Exportar relatório" tipPlace="bottom" onClick={() => toast(`Relatório de ${s.code} gerado com a finalidade registrada`)} />
      </div>

      {busy ? (
        <div className="tr-intro">
          <div className="tr-intro__art"><SearchMotion fast /></div>
          <h2>Pesquisando nas câmeras…</h2>
          <p>{describe(f)}</p>
        </div>
      ) : (
        <div className="tr-rbody">
          <div className="tr-bar2">
            <div className="tr-sum__n">
              <b>{narrowed ? `${filtered.length} de ${res.exact.length}` : res.exact.length.toLocaleString('pt-BR')}</b>
              <span>{res.exact.length === 1 ? 'registro' : 'registros'} · cerca de {res.people} {res.people === 1 ? 'pessoa' : 'pessoas'}</span>
            </div>
            <span className="dv-tools__sp" />
            <div className="tr-sel"><Select<string> label="Dia" value={day} onChange={(v) => { setDay(v); setLimit(PAGE); }}
              options={[{ value: '', label: 'Todos os dias' }, ...days.map(([k, d]) => ({ value: k, label: <>{dayLabel(d.t, now)} <span className="tr-sel__n">{d.n}</span></> }))]} /></div>
            <div className="tr-sel"><Select<string> label="Câmera" value={cam} onChange={(v) => { setCam(v); setLimit(PAGE); }}
              options={[{ value: '', label: 'Todas as câmeras' }, ...res.cams.map(([id, n]) => ({ value: id, label: <>{camName(id)} <span className="tr-sel__n">{n}</span></> }))]} /></div>
            <div className="tr-sel"><Select<Sort> label="Ordenar" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'match', label: 'Maior correspondência' }]} /></div>
            <label className="tr-group"><Switch size="sm" checked={group} onChange={(v) => { setGroup(v); setLimit(PAGE); }} label="Agrupar parecidos" />Agrupar parecidos</label>
          </div>

          <div className="tr-crit">
            <span>Critérios</span>
            {chips.map((c) => <span key={c} className="tr-crit__c">{c}</span>)}
            {narrowed && <button type="button" className="tr-link" onClick={() => { setDay(''); setCam(''); }}>Limpar dia e câmera</button>}
          </div>

          {shown.length > 0 ? (
            <>
              <div className="tr-grid">
                {shown.slice(0, limit).map(({ o, n }) => <Card key={o.id} o={o} n={n} f={f} now={now} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
              </div>
              {shown.length > limit && <div className="tr-more"><Button onClick={() => setLimit(limit + PAGE)}>Mostrar mais {Math.min(PAGE, shown.length - limit)} de {shown.length - limit}</Button></div>}
            </>
          ) : (
            <div className="mv-empty tr-empty">
              <Icon name="search" size={28} />
              <b>Nenhum registro no recorte</b>
              <span>Edite a busca para ampliar o período ou tirar características. “Tanto faz” não filtra o atributo.</span>
              <Button icon="edit" onClick={onEdit}>Editar busca</Button>
            </div>
          )}

          {res.near.length > 0 && !narrowed && (
            <section className="tr-near">
              <div className="tr-near__head">
                <h3>Quase batem <span>{res.near.length}</span></h3>
                <span>Diferem em só uma característica. A câmera erra, principalmente em cor com pouca luz.</span>
              </div>
              <div className="tr-grid is-near">
                {res.near.slice(0, 12).map(({ o, miss }) => <Card key={o.id} o={o} f={f} now={now} miss={miss} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <TraitDrawer key={open.id} o={open} f={f} all={all} now={now} onOpen={setOpenId} onClose={() => setOpenId(null)} toast={toast}
              onSearchLike={(nf) => { setOpenId(null); onLike(nf); }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
