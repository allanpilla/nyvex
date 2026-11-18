import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader, Segmented } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { DEVICES, type Device } from '../devices/data';
import { ago, norm, sendToMural } from '../devices/parts';
import {
  childrenOf, descendants, devicesOf, ENV_LABEL, healthOf, isFloor, LOCS, pathOf,
  type Loc, type LocHealth,
} from './data';
import { LocationDrawer } from './LocationDrawer';
import { LocationForm } from './LocationForm';
import { DevCounts, HealthPill, LayersButton, MapCanvas } from './parts';
import '../devices/devices.css';
import './locations.css';
import { SortButton, useTableModel } from '../devices/tableModel';

type View = 'lista' | 'mapa';
type SortKey = 'name' | 'devs' | 'subs';
const SORT_OPTS: [SortKey, string][] = [['name', 'Local'], ['subs', 'Andares'], ['devs', 'Dispositivos']];
const H_RANK: Record<LocHealth, number> = { bad: 0, warn: 1, ok: 2, none: 3 };
const byName = (a: Loc, b: Loc) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true });

export function LocationsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const navigate = useNavigate();
  const [locs, setLocs] = useState<Loc[]>(LOCS);
  const [view, setView] = useState<View>('lista');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'name', dir: 1 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ edit?: Loc; parentId?: string } | null>(null);
  const [del, setDel] = useState<string[] | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; l: Loc } | null>(null);
  const [refreshed, setRefreshed] = useState(() => Date.now());
  const [spin, setSpin] = useState(false);
  useEffect(() => { setPage(0); }, [q, size, view]);

  const info = useMemo(() => {
    const m = new Map<string, { devs: Device[]; health: LocHealth; subs: number }>();
    locs.forEach((l) => { const devs = devicesOf(l, locs, DEVICES); m.set(l.id, { devs, health: healthOf(devs), subs: childrenOf(l.id, locs).length }); });
    return m;
  }, [locs]);
  const I = (l: Loc) => info.get(l.id)!;

  const nq = norm(q.trim());
  const textMatch = (l: Loc) => !nq || norm(`${l.name} ${l.building ?? ''} ${l.floor ?? ''} ${l.sector ?? ''} ${pathOf(l, locs).map((p) => p.name).join(' ')}`).includes(nq);
  const hits = useMemo(() => locs.filter(textMatch), [locs, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const hitIds = useMemo(() => new Set(hits.map((l) => l.id)), [hits]);
  const anyFilter = !!nq;

  const cmp = (a: Loc, b: Loc) => {
    if (isFloor(a)) return 0; // andares ficam na ordem do prédio
    const r = sort.k === 'name' ? byName(a, b) : sort.k === 'devs' ? I(a).devs.length - I(b).devs.length : I(a).subs - I(b).subs;
    return r * sort.dir || byName(a, b);
  };
  // Lista: blocos com os andares expansíveis. Na busca, o bloco de um andar encontrado abre sozinho.
  const treeRows = useMemo(() => {
    const keep = new Set<string>();
    hits.forEach((l) => { keep.add(l.id); pathOf(l, locs).forEach((p) => keep.add(p.id)); if (!isFloor(l) && nq) childrenOf(l.id, locs).forEach((c) => keep.add(c.id)); });
    const out: { l: Loc; depth: number }[] = [];
    const walk = (id: string | null, depth: number) => {
      locs.filter((l) => l.parentId === id && keep.has(l.id)).sort(cmp).forEach((l) => {
        out.push({ l, depth });
        if (expanded.has(l.id) || (nq && hits.some((h) => h.parentId === l.id))) walk(l.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  }, [hits, locs, expanded, sort, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = treeRows;
  const paged = view === 'lista';
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const pg = Math.min(page, pages - 1);
  const shown = paged ? rows.slice(pg * size, pg * size + size) : rows;

  const blocks = locs.filter((l) => !l.parentId);
  const open = openId ? locs.find((l) => l.id === openId) ?? null : null;

  const clearAll = () => setQ('');
  const [model] = useTableModel();
  const t2 = model === 'novo';
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }));
  const toggleTree = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toMural = (l: Loc) => {
    const cams = I(l).devs.filter((d) => d.camId && d.situacao !== 'inativo');
    if (!cams.length) { toast('Nenhuma câmera neste local'); return; }
    cams.slice(0, 16).forEach((d) => sendToMural(d.camId!));
    navigate('/mural-de-video');
    toast(`${cams.length} ${cams.length === 1 ? 'câmera' : 'câmeras'} de ${l.name} no mural`);
  };
  const toDevices = (l: Loc) => { navigate('/dispositivos'); toast(`Dispositivos de ${l.name}`); };
  const remove = (ids: string[]) => {
    const all = new Set(ids);
    ids.forEach((id) => descendants(id, locs).forEach((d) => all.add(d.id)));
    setLocs((list) => list.filter((l) => !all.has(l.id)));
    setSel(new Set());
    if (openId && all.has(openId)) setOpenId(null);
    setDel(null);
    toast(ids.length === 1 ? 'Local excluído' : `${ids.length} locais excluídos`);
  };
  const refresh = () => { setSpin(true); setTimeout(() => { setRefreshed(Date.now()); setSpin(false); }, 600); };
  const exportCsv = (list: Loc[]) => {
    const head = ['Local', 'Bloco', 'Andares', 'Ambiente', 'Dispositivos', 'Setor', 'Latitude', 'Longitude'];
    const lines = list.map((l) => [l.name, pathOf(l, locs).map((p) => p.name).join(' / '), isFloor(l) ? '' : I(l).subs, ENV_LABEL[l.env], I(l).devs.length, l.sector ?? '', l.lat, l.lng].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'locais.csv';
    a.click();
    toast(`${list.length} locais exportados (CSV)`);
  };

  const allOn = shown.length > 0 && shown.every(({ l }) => sel.has(l.id));
  const someOn = shown.some(({ l }) => sel.has(l.id));

  // Mapa: projeta lat/lng dos locais do recorte escolhido.
  const mapLocs = locs.filter((l) => !isFloor(l) && (hitIds.has(l.id) || hits.some((h) => h.parentId === l.id)));
  const pins = useMemo(() => {
    if (!mapLocs.length) return [];
    const la = mapLocs.map((l) => l.lat), ln = mapLocs.map((l) => l.lng);
    const [a0, a1, n0, n1] = [Math.min(...la), Math.max(...la), Math.min(...ln), Math.max(...ln)];
    return mapLocs.map((l) => ({
      id: l.id, label: l.name, env: l.env, h: I(l).health, on: openId === l.id,
      x: 8 + ((l.lng - n0) / (n1 - n0 || 1)) * 84, y: 8 + (1 - (l.lat - a0) / (a1 - a0 || 1)) * 84,
    }));
  }, [mapLocs, openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (
    <label className="nx-input dv-search">
      <Icon name="search" size={16} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar bloco ou andar" aria-label="Buscar locais"
        onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
      {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
    </label>
  );

  return (
    <div className="dv lc">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          icon="pin"
          actions={
            <>
              <Button icon="dev" onClick={() => navigate('/dispositivos')}>Dispositivos</Button>
              <Button icon="upload" onClick={() => exportCsv(locs)}>Exportar</Button>
              <Button variant="primary" icon="plus" onClick={() => setForm({})}>Novo local</Button>
            </>
          }
        />

        <div className="dv-body">
          <section className={`dv-tcard${t2 ? ' is-t2' : ''}`} aria-label="Lista de locais">
          <div className="dv-tools">
            <Segmented label="Visualização" value={view} onChange={setView} options={[
              { value: 'lista', label: <><Icon name="grid" size={14} />Lista</> },
              { value: 'mapa', label: <><Icon name="map" size={14} />Mapa</> },
            ]} />
            {!t2 && search}
            <span className="dv-tools__sp" />
            {t2 && search}
            {t2 && view !== 'mapa' && <SortButton options={SORT_OPTS} sort={sort} onChange={(v) => { setSort(v); setPage(0); }} />}
            {view === 'lista' && (
              <>
                <span className="dv-upd">{blocks.length} blocos · {locs.length - blocks.length} andares</span>
                <IconButton icon="unfold" label="Expandir tudo" onClick={() => setExpanded(new Set(locs.filter((l) => childrenOf(l.id, locs).length).map((l) => l.id)))} tipPlace="bottom" />
                <IconButton icon="fold" label="Recolher tudo" onClick={() => setExpanded(new Set())} tipPlace="bottom" />
              </>
            )}
            {!t2 && view === 'mapa' && <span className="dv-upd" aria-live="polite">{spin ? 'Atualizando…' : `Atualizado ${ago((Date.now() - refreshed) / 1000)}`}</span>}
            <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={refresh} tipPlace="bottom" />
          </div>

          {anyFilter && (
            <div className="dv-chips">
              <span className="dv-chips__n"><b>{hits.length}</b> de {locs.length}</span>
              {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
              <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar busca</button>
            </div>
          )}

          {view === 'mapa' ? (
            <div className="lc-mapview">
              <MapCanvas pins={pins} onPin={setOpenId} tall>
                <div className="lc-mapc__top">
                  <span className="dv-tools__sp" />
                  <LayersButton />
                </div>
              </MapCanvas>
              <div className="lc-maplist">
                <span className="lc-maplist__n">{mapLocs.length} locais no mapa</span>
                {[...mapLocs].sort((a, b) => H_RANK[I(a).health] - H_RANK[I(b).health] || byName(a, b)).map((l) => (
                  <button key={l.id} type="button" className={`lc-mapitem${openId === l.id ? ' is-on' : ''}`} onClick={() => setOpenId(l.id)}>
                    <span className="dv-name"><b>{l.name}</b><span>{I(l).subs ? `${I(l).subs} andares · ` : ''}{I(l).devs.length} dispositivos</span></span>
                    <HealthPill h={I(l).health} compact />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="dv-table lc-table" role="treegrid" aria-label="Locais">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c dv-c--chk" role="columnheader">
                  <Checkbox label="Selecionar página" checked={allOn} indeterminate={!allOn && someOn}
                    onChange={() => setSel((s) => { const n = new Set(s); shown.forEach(({ l }) => (allOn ? n.delete(l.id) : n.add(l.id))); return n; })} />
                </span>
                <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Local</Th>
                <Th k="subs" sort={sort} onSort={sortBy} cls="lc-c--subs">Andares</Th>
                <Th k="devs" sort={sort} onSort={sortBy} cls="lc-c--devs">Dispositivos</Th>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {shown.map(({ l, depth }) => (
                <Row key={l.id} l={l} depth={depth} x={I(l)}
                  dim={anyFilter && !hitIds.has(l.id)} expanded={expanded.has(l.id)} onToggle={() => toggleTree(l.id)}
                  sel={sel.has(l.id)} open={openId === l.id}
                  onSel={(v) => setSel((s) => { const n = new Set(s); if (v) n.add(l.id); else n.delete(l.id); return n; })}
                  onOpen={() => setOpenId(openId === l.id ? null : l.id)}
                  onMural={() => toMural(l)} onEdit={() => setForm({ edit: l })}
                  onMore={(el) => setRowMenu(rowMenu?.l.id === l.id ? null : { el, l })} />
              ))}
              {rows.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name="search" /></span>
                  <b>Nenhum local encontrado</b>
                  <span>Revise a busca ou os filtros aplicados.</span>
                  <Button onClick={clearAll}>Limpar filtros</Button>
                </div>
              )}
            </div>
          )}
          </section>
        </div>

        <footer className="dv-foot">
          {paged
            ? <span>{rows.length ? `${pg * size + 1}–${Math.min(rows.length, pg * size + size)} de ${rows.length}` : '0 locais'}</span>
            : <span>{mapLocs.length} blocos no mapa</span>}
          <span className="dv-tools__sp" />
          {paged && (
            <>
              <label className="dv-size">Por página
                <select className="nx-select" value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Itens por página">
                  {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="dv-pager">
                <IconButton icon="arrowLeft" label="Página anterior" disabled={pg === 0} onClick={() => setPage(pg - 1)} />
                <span><b>{pg + 1}</b> / {pages}</span>
                <IconButton icon="arrowRight" label="Próxima página" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} />
              </div>
            </>
          )}
        </footer>

        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para os selecionados">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionado' : 'selecionados'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="upload" onClick={() => exportCsv(locs.filter((l) => sel.has(l.id)))}>Exportar</Button>
            <Button icon="trash" className="is-danger-ghost" onClick={() => setDel([...sel])}>Excluir</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(520px, 100%)' }}>
            <LocationDrawer key={open.id} l={open} locs={locs} devs={I(open).devs} health={I(open).health}
              onClose={() => setOpenId(null)} onOpen={setOpenId}
              onEdit={() => setForm({ edit: open })} onMural={() => toMural(open)} onDevices={() => toDevices(open)}
              onAddChild={() => setForm({ parentId: open.id })}
              onPeople={(people) => setLocs((list) => list.map((x) => (x.id === open.id ? { ...x, people, updated: new Date().toISOString() } : x)))}
              onDelete={() => setDel([open.id])} />
          </div>
        </div>,
        document.body,
      )}

      {rowMenu && (
        <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
          {(() => {
            const l = locs.find((x) => x.id === rowMenu.l.id) ?? rowMenu.l;
            const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
            return (
              <>
                <NavItem role="menuitem" icon="panel" label="Ver detalhes" onClick={close(() => setOpenId(l.id))} />
                <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => setForm({ edit: l }))} />
                {!isFloor(l) && <NavItem role="menuitem" icon="plus" label="Adicionar andar" onClick={close(() => setForm({ parentId: l.id }))} />}
                <NavItem role="menuitem" icon="dev" label="Ver dispositivos" onClick={close(() => toDevices(l))} />
                <div className="nx-menu__sep" />
                <NavItem role="menuitem" icon="trash" label="Excluir" className="is-danger" onClick={close(() => setDel([l.id]))} />
              </>
            );
          })()}
        </Menu>
      )}

      {form && (
        <LocationForm edit={form.edit} parentId={form.parentId} locs={locs} onClose={() => setForm(null)}
          onSave={(l) => {
            setLocs((list) => (form.edit ? list.map((x) => (x.id === l.id ? l : x)) : [...list, l]));
            if (l.parentId) setExpanded((s) => new Set([...s, ...pathOf(l, locs).map((p) => p.id), l.parentId!]));
            setForm(null);
            setOpenId(l.id);
            toast(form.edit ? 'Alterações salvas' : `${l.name} adicionado`);
          }} />
      )}

      {del && (() => {
        const sub = new Set(del.flatMap((id) => descendants(id, locs).map((d) => d.id))).size;
        const nd = del.reduce((n, id) => n + (info.get(id)?.devs.length ?? 0), 0);
        return (
          <ConfirmDialog
            title={del.length === 1 ? 'Excluir local?' : `Excluir ${del.length} locais?`}
            text={`${del.length === 1 ? `“${locs.find((l) => l.id === del[0])?.name}” sai` : 'Os locais saem'} do cadastro${sub ? `, junto com ${sub} ${sub === 1 ? 'andar' : 'andares'}` : ''}.${nd ? ` ${nd} ${nd === 1 ? 'dispositivo fica' : 'dispositivos ficam'} sem local e ${nd === 1 ? 'precisa' : 'precisam'} ser realocados.` : ''}`}
            confirm="Excluir" onConfirm={() => remove(del)} onCancel={() => setDel(null)} />
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
type RowProps = {
  l: Loc; depth: number; x: { devs: Device[]; health: LocHealth; subs: number }; dim: boolean; expanded: boolean;
  sel: boolean; open: boolean; onToggle: () => void; onSel: (v: boolean) => void; onOpen: () => void; onMural: () => void; onEdit: () => void; onMore: (el: HTMLElement) => void;
};
function Row({ l, depth, x, dim, expanded, sel, open, onToggle, onSel, onOpen, onMural, onEdit, onMore }: RowProps) {
  const cams = x.devs.filter((d) => d.kind === 'camera' && d.situacao !== 'inativo').length;
  const floor = isFloor(l);
  return (
    <div role="row" tabIndex={0} aria-selected={sel} aria-level={depth + 1} aria-expanded={x.subs ? expanded : undefined}
      className={`dv-tr${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${dim ? ' is-dim' : ''}${floor ? ' is-floor' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter') onOpen();
        if (e.key === ' ') { e.preventDefault(); onSel(!sel); }
        if (x.subs && ((e.key === 'ArrowRight' && !expanded) || (e.key === 'ArrowLeft' && expanded))) onToggle();
      }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${l.name}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell" style={{ paddingLeft: depth * 28 }}>
        {x.subs
          ? <button type="button" className={`lc-twisty${expanded ? ' is-open' : ''}`} aria-label={expanded ? 'Recolher andares' : 'Ver andares'} onClick={(e) => { e.stopPropagation(); onToggle(); }}><Icon name="chevron" size={14} /></button>
          : <span className="lc-twisty is-leaf" />}
        <span className={`dv-kind lc-kind is-${l.env}`}><Icon name={floor ? 'stack' : l.env === 'indoor' ? 'pin' : 'map'} size={16} /></span>
        <span className="dv-name">
          <b>{l.name}</b>
          {l.sector ? <span>{l.sector}</span> : null}
        </span>
      </span>
      <span className="dv-c lc-c--subs" role="cell">{floor ? <span className="lc-none">—</span> : x.subs ? <b className="lc-num">{x.subs}</b> : <span className="lc-none">0</span>}</span>
      <span className="dv-c lc-c--devs" role="cell"><DevCounts devs={x.devs} /></span>
      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="tv" label="Ver câmeras no mural" onClick={onMural} tipPlace="top" disabled={!cams} />
        <IconButton icon="edit" label="Editar" onClick={onEdit} tipPlace="top" />
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}
