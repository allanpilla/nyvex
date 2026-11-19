import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Checkbox, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import { ageText, daysLeft, expiryText, fmtDay, nextExpiry, NOW, pending, STATE_LABEL, WATCHLISTS, type Watchlist, type WlState } from './data';
import { WatchlistDrawer } from './WatchlistDrawer';
import { WatchlistForm } from './WatchlistForm';
import '../devices/devices.css';
import '../locations/locations.css';
import './watchlists.css';

type FKey = 'state' | 'content' | 'expiry';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { state: [], content: [], expiry: [] };
const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'state', label: 'Estado', opts: [['ativa', 'Ativa'], ['pausada', 'Pausada']] },
  { key: 'content', label: 'Conteúdo', opts: [['pessoas', 'Com pessoas'], ['veiculos', 'Com veículos'], ['vazia', 'Vazia']] },
  { key: 'expiry', label: 'Vencimento', opts: [['30d', 'Vence em 30 dias'], ['expirado', 'Com vínculo expirado'], ['sem', 'Sem vencimento']] },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;

type Quick = 'all' | 'ativa' | 'pausada' | 'revisao' | 'vence' | 'vazia';
type SortKey = 'name' | 'state' | 'mon' | 'matches' | 'expiry' | 'updated';
const SORT_OPTS: [SortKey, string][] = [['name', 'Lista'], ['state', 'Estado'], ['mon', 'Monitorados'], ['matches', 'Atividade'], ['expiry', 'Próximo vencimento'], ['updated', 'Atualização']];
const byName = (a: Watchlist, b: Watchlist) => a.name.replace(/^\[.*?\]\s*/, '').localeCompare(b.name.replace(/^\[.*?\]\s*/, ''), 'pt-BR', { numeric: true });
const size = (w: Watchlist) => w.people.length + w.vehicles.length;
const expSoon = (w: Watchlist) => { const n = nextExpiry(w); return !!n && daysLeft(n.until)! <= 30; };
const hasExpired = (w: Watchlist) => [...w.people, ...w.vehicles].some((x) => x.until && new Date(x.until).getTime() < NOW);

export function WatchlistsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [lists, setLists] = useState<Watchlist[]>(WATCHLISTS);
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'updated', dir: -1 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ edit?: Watchlist } | null>(null);
  const [toggle, setToggle] = useState<{ ids: string[]; to: WlState } | null>(null);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [spin, setSpin] = useState(false);

  const matches = (w: Watchlist, fl: Filters) => {
    const ok = (k: FKey, test: (v: string) => boolean) => fl[k].length === 0 || fl[k].some(test);
    return ok('state', (v) => w.state === v)
      && ok('content', (v) => (v === 'pessoas' ? w.people.length > 0 : v === 'veiculos' ? w.vehicles.length > 0 : size(w) === 0))
      && ok('expiry', (v) => (v === '30d' ? expSoon(w) : v === 'expirado' ? hasExpired(w) : size(w) > 0 && [...w.people, ...w.vehicles].every((x) => !x.until)));
  };
  const quickMatch = (k: Quick, w: Watchlist) => k === 'all' || (k === 'ativa' || k === 'pausada' ? w.state === k : k === 'revisao' ? pending(w) > 0 : k === 'vence' ? expSoon(w) : size(w) === 0);
  const nq = norm(q.trim());
  const textMatch = (w: Watchlist) => !nq || norm(`${w.name} ${w.description} ${w.people.map((p) => p.name).join(' ')} ${w.vehicles.map((v) => `${v.plate} ${v.model ?? ''}`).join(' ')}`).includes(nq);
  const base = useMemo(() => lists.filter((w) => matches(w, f) && textMatch(w)), [lists, f, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = useMemo(() => base.filter((w) => quickMatch(quick, w)), [base, quick]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => [...hits].sort((a, b) => {
    const ea = nextExpiry(a)?.until ?? '9', eb = nextExpiry(b)?.until ?? '9';
    const r = sort.k === 'name' ? byName(a, b) : sort.k === 'state' ? a.state.localeCompare(b.state) : sort.k === 'mon' ? size(a) - size(b)
      : sort.k === 'matches' ? pending(a) - pending(b) || a.matches.length - b.matches.length : sort.k === 'expiry' ? ea.localeCompare(eb) : a.updated.localeCompare(b.updated);
    return r * sort.dir || byName(a, b);
  }), [hits, sort]);
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const count = (k: Quick) => base.filter((w) => quickMatch(k, w)).length;
  const nPeople = new Set(base.flatMap((w) => w.people.map((p) => p.name))).size;
  const nVeh = new Set(base.flatMap((w) => w.vehicles.map((v) => v.plate))).size;
  const open = openId ? lists.find((w) => w.id === openId) ?? null : null;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'updated' || k === 'matches' ? -1 : 1 }));
  const patch = (id: string, fn: (w: Watchlist) => Watchlist) => setLists((l) => l.map((w) => (w.id === id ? { ...fn(w), updated: new Date().toISOString() } : w)));
  const applyToggle = (ids: string[], to: WlState) => {
    ids.forEach((id) => patch(id, (w) => ({ ...w, state: to })));
    setToggle(null); setSel(new Set());
    toast(ids.length === 1 ? `Lista ${to === 'ativa' ? 'ativada' : 'pausada'}` : `${ids.length} listas ${to === 'ativa' ? 'ativadas' : 'pausadas'}`);
  };
  const refresh = () => { setSpin(true); setTimeout(() => setSpin(false), 600); };
  const exportCsv = (list: Watchlist[]) => {
    const head = ['Lista', 'Estado', 'Tipo', 'Monitorado', 'Motivo', 'Limiar', 'Válido até', 'Incluído em'];
    const lines = list.flatMap((w) => [
      ...w.people.map((p) => [w.name, STATE_LABEL[w.state], 'Pessoa', p.name, p.reason, `${p.threshold}%`, p.until ? fmtDay(p.until) : 'Sem vencimento', fmtDay(p.added)]),
      ...w.vehicles.map((v) => [w.name, STATE_LABEL[w.state], 'Veículo', v.plate, v.reason, '', v.until ? fmtDay(v.until) : 'Sem vencimento', fmtDay(v.added)]),
      ...(size(w) ? [] : [[w.name, STATE_LABEL[w.state], '', '', '', '', '', '']]),
    ].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'watchlists.csv';
    a.click();
    toast(`${list.length} ${list.length === 1 ? 'lista exportada' : 'listas exportadas'} (CSV)`);
  };

  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Listas', icon: 'eye', tone: 'neutral', hint: 'Todas as listas cadastradas' },
    { k: 'ativa', label: 'Ativas', icon: 'play', tone: 'ok', hint: 'Geram matches para revisão humana' },
    { k: 'pausada', label: 'Pausadas', icon: 'pause', tone: 'neutral', hint: 'Vínculos cadastrados, sem novos matches' },
    { k: 'revisao', label: 'Aguardando revisão', icon: 'alert', tone: 'warn', hint: 'Listas com matches ainda não revisados' },
    { k: 'vence', label: 'Vencem em 30 dias', icon: 'calendar', tone: 'neutral', hint: 'Algum vínculo vence nos próximos 30 dias' },
    { k: 'vazia', label: 'Vazias', icon: 'stack', tone: 'neutral', hint: 'Listas sem pessoas nem veículos' },
  ];
  const allOn = rows.length > 0 && rows.every((w) => sel.has(w.id));
  const someOn = rows.some((w) => sel.has(w.id));
  const selLists = lists.filter((w) => sel.has(w.id));

  return (
    <div className="dv lc wl">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Acompanhamento supervisionado de pessoas e veículos."
          icon="eye"
          actions={
            <>
              <Button icon="download" onClick={() => exportCsv(rows)}>Exportar</Button>
              <Button variant="primary" icon="plus" onClick={() => setForm({})}>Nova lista</Button>
            </>
          }
        />

        <div className="dv-body">
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards" role="group" aria-label="Filtrar">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${c.k === 'revisao' && n > 0 ? ' is-alarm wl-alarm' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </CardBtn>
                );
              })}
            </div>
            <div className="dv-meters">
              <div className="dv-meter lc-split wl-split">
                <div className="dv-meter__top"><span>Monitorados</span></div>
                <div className="lc-split__vals">
                  <button type="button" onClick={() => { setF({ ...EMPTY, content: ['pessoas'] }); setShowF(true); }}><b>{nPeople}</b><span>Pessoas</span></button>
                  <button type="button" onClick={() => { setF({ ...EMPTY, content: ['veiculos'] }); setShowF(true); }}><b>{nVeh}</b><span>Veículos</span></button>
                </div>
                <div className="lc-split__bar"><i style={{ width: `${(nPeople / Math.max(1, nPeople + nVeh)) * 100}%` }} /></div>
              </div>
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Watchlists">
            <div className="dv-tools">
              <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'lista' : 'listas'}</span>
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lista, pessoa ou placa" aria-label="Buscar listas"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />
              <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={refresh} tipPlace="bottom" />
            </div>

            {showF && <div className="dv-filters" role="group" aria-label="Filtros">
              {F_GROUPS.map((g) => (
                <button key={g.key} type="button" className={`dv-fdrop${f[g.key].length ? ' is-on' : ''}${filterBtn?.key === g.key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={filterBtn?.key === g.key}
                  onClick={(e) => setFilterBtn(filterBtn?.key === g.key ? null : { key: g.key, el: e.currentTarget })}>
                  <span className="dv-fdrop__k">{g.label}:</span>
                  <span className="dv-fdrop__v">{f[g.key].length === 0 ? 'todos' : f[g.key].length === 1 ? fLabel(g.key, f[g.key][0]) : `${f[g.key].length} selecionados`}</span>
                  <Icon name="chevron" size={14} />
                </button>
              ))}
            </div>}

            {anyFilter && (
              <div className="dv-chips">
                <span className="dv-chips__n"><b>{hits.length}</b> de {lists.length}</span>
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            <div className="dv-table wl-table" role="table" aria-label="Watchlists">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c dv-c--chk" role="columnheader">
                  <Checkbox label="Selecionar todas" checked={allOn} indeterminate={!allOn && someOn}
                    onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((w) => (allOn ? n.delete(w.id) : n.add(w.id))); return n; })} />
                </span>
                <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Lista</Th>
                <Th k="state" sort={sort} onSort={sortBy} cls="wl-c--state">Estado</Th>
                <Th k="mon" sort={sort} onSort={sortBy} cls="wl-c--mon">Monitorados</Th>
                <Th k="matches" sort={sort} onSort={sortBy} cls="wl-c--act">Atividade</Th>
                <Th k="expiry" sort={sort} onSort={sortBy} cls="wl-c--exp">Próximo vencimento</Th>
                <Th k="updated" sort={sort} onSort={sortBy} cls="wl-c--upd">Atualização</Th>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {rows.map((w) => (
                <Row key={w.id} w={w} sel={sel.has(w.id)} open={openId === w.id}
                  onSel={(v) => setSel((s) => { const n = new Set(s); if (v) n.add(w.id); else n.delete(w.id); return n; })}
                  onOpen={() => setOpenId(openId === w.id ? null : w.id)}
                  onToggle={() => setToggle({ ids: [w.id], to: w.state === 'ativa' ? 'pausada' : 'ativa' })}
                  onEdit={() => setForm({ edit: w })}
                  onMore={(el) => setRowMenu(rowMenu?.id === w.id ? null : { el, id: w.id })} />
              ))}
              {rows.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name="search" /></span>
                  <b>Nenhuma lista encontrada</b>
                  <span>Revise a busca ou os filtros aplicados.</span>
                  <Button onClick={clearAll}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="dv-foot">
          <span>{hits.length} de {lists.length} listas</span>
          <span className="dv-tools__sp" />
          <span className="wl-foot">Validade e limiar são conferidos no servidor a cada match.</span>
        </footer>

        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para as selecionadas">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionada' : 'selecionadas'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="play" disabled={!selLists.some((w) => w.state === 'pausada')} onClick={() => setToggle({ ids: selLists.filter((w) => w.state === 'pausada').map((w) => w.id), to: 'ativa' })}>Ativar</Button>
            <Button icon="pause" disabled={!selLists.some((w) => w.state === 'ativa')} onClick={() => setToggle({ ids: selLists.filter((w) => w.state === 'ativa').map((w) => w.id), to: 'pausada' })}>Pausar</Button>
            <Button icon="download" onClick={() => exportCsv(selLists)}>Exportar</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(520px, 100%)' }}>
            <WatchlistDrawer key={open.id} w={open} onClose={() => setOpenId(null)}
              onEdit={() => setForm({ edit: open })}
              onToggle={() => setToggle({ ids: [open.id], to: open.state === 'ativa' ? 'pausada' : 'ativa' })}
              onExport={() => exportCsv([open])}
              onChange={(fn) => patch(open.id, fn)} />
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
              {g.opts.map(([v, lb]) => (
                <Checkbox key={v} label={lb} checked={f[g.key].includes(v)} onChange={() => toggleF(g.key, v)}>
                  <span className="dv-fmenu__l">{lb}</span>
                  <span className="dv-fmenu__n">{lists.filter((w) => textMatch(w) && matches(w, { ...f, [g.key]: [v] })).length}</span>
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
        const w = lists.find((x) => x.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir lista" onClick={close(() => setOpenId(w.id))} />
            <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => setForm({ edit: w }))} />
            <NavItem role="menuitem" icon={w.state === 'ativa' ? 'pause' : 'play'} label={w.state === 'ativa' ? 'Pausar lista' : 'Ativar lista'} onClick={close(() => setToggle({ ids: [w.id], to: w.state === 'ativa' ? 'pausada' : 'ativa' }))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="download" label="Exportar monitorados" onClick={close(() => exportCsv([w]))} />
          </Menu>
        );
      })()}

      {form && (
        <WatchlistForm edit={form.edit} names={lists.map((w) => w.name)} onClose={() => setForm(null)}
          onSave={(data) => {
            if (form.edit) {
              patch(form.edit.id, (w) => ({ ...w, ...data }));
              toast('Alterações salvas');
            } else {
              const now = new Date().toISOString();
              const id = `wl-${Math.random().toString(16).slice(2, 10)}-nova`;
              setLists((l) => [{ id, ...data, state: 'pausada', created: now, updated: now, createdBy: 'Você', people: [], vehicles: [], matches: [] }, ...l]);
              setOpenId(id);
              toast(`${data.name} criada · começa pausada`);
            }
            setForm(null);
          }} />
      )}

      {toggle && toggle.ids.length > 0 && (() => {
        const one = toggle.ids.length === 1 ? lists.find((w) => w.id === toggle.ids[0]) : undefined;
        const on = toggle.to === 'ativa';
        return (
          <ConfirmDialog type={on ? 'information' : 'warning'}
            title={one ? `${on ? 'Ativar' : 'Pausar'} “${one.name}”?` : `${on ? 'Ativar' : 'Pausar'} ${toggle.ids.length} listas?`}
            text={on
              ? 'Novas detecções das pessoas e veículos desta lista passam a gerar matches.'
              : 'Os vínculos permanecem cadastrados, mas não geram novos matches por esta lista até ela ser ativada de novo.'}
            confirm={on ? 'Ativar lista' : 'Pausar lista'} onConfirm={() => applyToggle(toggle.ids, toggle.to)} onCancel={() => setToggle(null)} />
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
function Count({ icon, n, tip }: { icon: IconName; n: number; tip: string }) {
  const t = useTooltip(tip, undefined, true, 'top');
  return <span className={`lc-count${n ? '' : ' is-zero'}`} {...t}><Icon name={icon} size={14} />{n}</span>;
}

type RowProps = { w: Watchlist; sel: boolean; open: boolean; onSel: (v: boolean) => void; onOpen: () => void; onToggle: () => void; onEdit: () => void; onMore: (el: HTMLElement) => void };
function Row({ w, sel, open, onSel, onOpen, onToggle, onEdit, onMore }: RowProps) {
  const nx = nextExpiry(w);
  const p = pending(w);
  const last = [...w.matches].sort((a, b) => b.at.localeCompare(a.at))[0];
  const soon = nx ? daysLeft(nx.until)! <= 30 : false;
  return (
    <div role="row" tabIndex={0} aria-selected={sel}
      className={`dv-tr${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${w.state === 'pausada' ? ' is-paused' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter') onOpen(); if (e.key === ' ') { e.preventDefault(); onSel(!sel); } }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${w.name}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell">
        <span className={`dv-kind wl-kind is-${w.state}`}><Icon name="eye" size={16} /></span>
        <span className="dv-name"><b>{w.name}</b><span>{w.description || 'Sem descrição'}</span></span>
      </span>
      <span className="dv-c wl-c--state" role="cell"><Badge tone={w.state === 'ativa' ? 'success' : 'neutral'}>{STATE_LABEL[w.state]}</Badge></span>
      <span className="dv-c wl-c--mon" role="cell">
        {size(w) ? (
          <span className="lc-counts">
            <Count icon="people" n={w.people.length} tip={`${w.people.length} ${w.people.length === 1 ? 'pessoa' : 'pessoas'}`} />
            <Count icon="car" n={w.vehicles.length} tip={`${w.vehicles.length} ${w.vehicles.length === 1 ? 'veículo' : 'veículos'}`} />
          </span>
        ) : <span className="lc-none">Lista vazia</span>}
      </span>
      <span className="dv-c wl-c--act" role="cell">
        {w.restricted ? <span className="lc-none wl-restr"><Icon name="lock" size={12} />Restrita</span>
          : w.matches.length ? (
            <span className="dv-two">
              <b className={p ? 'wl-pend' : undefined}>{p ? `${p} para revisar` : `${w.matches.length} na amostra`}</b>
              <span>Último {ageText(last.at)}</span>
            </span>
          ) : <span className="lc-none">Sem matches</span>}
      </span>
      <span className="dv-c wl-c--exp" role="cell">
        {nx ? <span className="dv-two"><b className={soon ? 'wl-soon' : undefined}>{expiryText(nx.until)}</b><span>{nx.who}</span></span>
          : <span className="lc-none">{size(w) ? 'Sem vencimento' : '—'}</span>}
      </span>
      <span className="dv-c wl-c--upd" role="cell"><span className="dv-two"><b>{fmtDay(w.updated)}</b><span>{ageText(w.updated)}</span></span></span>
      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
        <IconButton icon={w.state === 'ativa' ? 'pause' : 'play'} label={w.state === 'ativa' ? 'Pausar lista' : 'Ativar lista'} onClick={onToggle} tipPlace="top" />
        <IconButton icon="edit" label="Editar" onClick={onEdit} tipPlace="top" />
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}
