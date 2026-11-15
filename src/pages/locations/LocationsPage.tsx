import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader, Segmented, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { DEVICES, type Device } from '../devices/data';
import { ago, norm, sendToMural } from '../devices/parts';
import {
  childrenOf, descendants, devicesOf, ENV_LABEL, EXPO_LABEL, healthOf, HEALTH_LABEL, KIND_LABEL, LOCS, pathOf, PLACE_TYPES, ZONES,
  type Loc, type LocHealth,
} from './data';
import { LocationDrawer } from './LocationDrawer';
import { LocationForm } from './LocationForm';
import { DevCounts, EnvBadge, HealthPill, LayersButton, MapCanvas } from './parts';
import '../devices/devices.css';
import './locations.css';

type View = 'arvore' | 'lista' | 'mapa';
type FKey = 'env' | 'zone' | 'kind' | 'exposure' | 'placeType' | 'health';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { env: [], zone: [], kind: [], exposure: [], placeType: [], health: [] };
/** Filtros da tela atual (Ambiente e Zona) + Tipo, Exposição, Tipo de lugar e Estado. */
const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'env', label: 'Ambiente', opts: [['indoor', 'Interno'], ['outdoor', 'Externo']] },
  { key: 'zone', label: 'Zona', opts: ZONES.map((z) => [z, z]) },
  { key: 'kind', label: 'Tipo', opts: [['instalacao', 'Instalação'], ['territorio', 'Território']] },
  { key: 'exposure', label: 'Exposição', opts: [['abrigado', 'Abrigado'], ['exposto', 'Exposto']] },
  { key: 'placeType', label: 'Tipo de lugar', opts: [...PLACE_TYPES.map((t) => [t, t] as [string, string]), ['-', 'Não informado']] },
  { key: 'health', label: 'Estado', opts: (['ok', 'warn', 'bad', 'none'] as LocHealth[]).map((h) => [h, HEALTH_LABEL[h]]) },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;

type Quick = 'all' | 'indoor' | 'outdoor' | 'com' | 'sem' | 'falha';
type SortKey = 'name' | 'kind' | 'zone' | 'devs' | 'subs' | 'health';
const H_RANK: Record<LocHealth, number> = { bad: 0, warn: 1, ok: 2, none: 3 };
const byName = (a: Loc, b: Loc) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true });

export function LocationsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const navigate = useNavigate();
  const [locs, setLocs] = useState<Loc[]>(LOCS);
  const [view, setView] = useState<View>('lista');
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'name', dir: 1 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mapScope, setMapScope] = useState<'campus' | 'cidade'>('campus');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ edit?: Loc; parentId?: string } | null>(null);
  const [del, setDel] = useState<string[] | null>(null);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; l: Loc } | null>(null);
  const [refreshed, setRefreshed] = useState(() => Date.now());
  const [spin, setSpin] = useState(false);
  useEffect(() => { setPage(0); }, [quick, q, f, size, view]);

  const info = useMemo(() => {
    const m = new Map<string, { devs: Device[]; health: LocHealth; subs: number }>();
    locs.forEach((l) => { const devs = devicesOf(l, locs, DEVICES); m.set(l.id, { devs, health: healthOf(devs), subs: childrenOf(l.id, locs).length }); });
    return m;
  }, [locs]);
  const I = (l: Loc) => info.get(l.id)!;

  const matches = (l: Loc, fl: Filters) => {
    const has = (k: FKey, v: string) => fl[k].length === 0 || fl[k].includes(v);
    return has('env', l.env) && has('zone', l.zone) && has('kind', l.kind) && has('exposure', l.exposure) && has('placeType', l.placeType ?? '-') && has('health', I(l).health);
  };
  const quickMatch = (k: Quick, l: Loc) => k === 'all' || (k === 'indoor' || k === 'outdoor' ? l.env === k : k === 'com' ? I(l).devs.length > 0 : k === 'sem' ? I(l).devs.length === 0 : I(l).health === 'bad');
  const nq = norm(q.trim());
  const textMatch = (l: Loc) => !nq || norm(`${l.name} ${l.zone} ${l.placeType ?? ''} ${l.building ?? ''} ${l.sector ?? ''} ${l.district ?? ''} ${l.street ?? ''} ${pathOf(l, locs).map((p) => p.name).join(' ')}`).includes(nq);
  const base = useMemo(() => locs.filter((l) => matches(l, f) && textMatch(l)), [locs, f, nq, info]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = useMemo(() => base.filter((l) => quickMatch(quick, l)), [base, quick]); // eslint-disable-line react-hooks/exhaustive-deps
  const hitIds = useMemo(() => new Set(hits.map((l) => l.id)), [hits]);
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';

  const cmp = (a: Loc, b: Loc) => {
    const r = sort.k === 'name' ? byName(a, b) : sort.k === 'kind' ? a.kind.localeCompare(b.kind) || a.env.localeCompare(b.env)
      : sort.k === 'zone' ? a.zone.localeCompare(b.zone) : sort.k === 'devs' ? I(a).devs.length - I(b).devs.length
        : sort.k === 'subs' ? I(a).subs - I(b).subs : H_RANK[I(a).health] - H_RANK[I(b).health];
    return r * sort.dir || byName(a, b);
  };
  // Lista: na ordem padrão os internos (instalações) vêm antes dos externos, como no sistema atual.
  const listRows = useMemo(() => [...hits].sort((a, b) => (sort.k === 'name' && sort.dir === 1 ? (a.env === b.env ? 0 : a.env === 'indoor' ? -1 : 1) : 0) || cmp(a, b)), [hits, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  // Árvore: mostra os ancestrais de quem bate no filtro, para manter o contexto.
  const treeRows = useMemo(() => {
    const keep = new Set<string>();
    hits.forEach((l) => { keep.add(l.id); pathOf(l, locs).forEach((p) => keep.add(p.id)); });
    const out: { l: Loc; depth: number }[] = [];
    const walk = (id: string | null, depth: number) => {
      locs.filter((l) => l.parentId === id && keep.has(l.id)).sort((a, b) => (id === null && a.env !== b.env ? (a.env === 'indoor' ? -1 : 1) : cmp(a, b))).forEach((l) => {
        out.push({ l, depth });
        if (expanded.has(l.id) || (nq && keep.has(l.id) && !hitIds.has(l.id))) walk(l.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  }, [hits, locs, expanded, sort, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = view === 'arvore' ? treeRows : listRows.map((l) => ({ l, depth: 0 }));
  const paged = view === 'lista';
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const pg = Math.min(page, pages - 1);
  const shown = paged ? rows.slice(pg * size, pg * size + size) : rows;

  const count = (k: Quick) => base.filter((l) => quickMatch(k, l)).length;
  const nInst = base.filter((l) => l.kind === 'instalacao').length;
  const nTerr = base.filter((l) => l.kind === 'territorio').length;
  const roots = locs.filter((l) => !l.parentId).length;
  const open = openId ? locs.find((l) => l.id === openId) ?? null : null;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
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
    const head = ['Local', 'Local pai', 'Tipo', 'Ambiente', 'Exposição', 'Zona', 'Tipo de lugar', 'Dispositivos', 'Sub-locais', 'Estado', 'Prédio/Bloco', 'Andar', 'Setor', 'UF', 'Cidade', 'Bairro', 'Rua', 'Latitude', 'Longitude'];
    const lines = list.map((l) => [l.name, pathOf(l, locs).map((p) => p.name).join(' / '), KIND_LABEL[l.kind], ENV_LABEL[l.env], EXPO_LABEL[l.exposure], l.zone, l.placeType ?? '', I(l).devs.length, I(l).subs, HEALTH_LABEL[I(l).health],
      l.building ?? '', l.floor ?? '', l.sector ?? '', l.uf ?? '', l.city ?? '', l.district ?? '', l.street ?? '', l.lat, l.lng].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'locais.csv';
    a.click();
    toast(`${list.length} locais exportados (CSV)`);
  };

  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Total', icon: 'pin', tone: 'neutral', hint: 'Todos os locais cadastrados' },
    { k: 'indoor', label: 'Internos', icon: 'stack', tone: 'neutral', hint: 'Instalações: prédios, portarias e áreas' },
    { k: 'outdoor', label: 'Externos', icon: 'map', tone: 'neutral', hint: 'Via pública: cidades, bairros e ruas' },
    { k: 'com', label: 'Com dispositivos', icon: 'dev', tone: 'ok', hint: 'Locais com algum equipamento instalado' },
    { k: 'sem', label: 'Sem dispositivos', icon: 'plug', tone: 'neutral', hint: 'Locais ainda sem equipamento' },
    { k: 'falha', label: 'Com falha', icon: 'nosignal', tone: 'bad', hint: 'Algum dispositivo do local está offline' },
  ];
  const allOn = shown.length > 0 && shown.every(({ l }) => sel.has(l.id));
  const someOn = shown.some(({ l }) => sel.has(l.id));

  // Mapa: projeta lat/lng dos locais do recorte escolhido.
  const mapLocs = hits.filter((l) => (mapScope === 'campus' ? l.kind === 'instalacao' : l.kind === 'territorio' && l.zone !== 'Cidade'));
  const pins = useMemo(() => {
    if (!mapLocs.length) return [];
    const la = mapLocs.map((l) => l.lat), ln = mapLocs.map((l) => l.lng);
    const [a0, a1, n0, n1] = [Math.min(...la), Math.max(...la), Math.min(...ln), Math.max(...ln)];
    return mapLocs.map((l) => ({
      id: l.id, label: l.name, env: l.env, h: I(l).health, on: openId === l.id,
      x: 8 + ((l.lng - n0) / (n1 - n0 || 1)) * 84, y: 8 + (1 - (l.lat - a0) / (a1 - a0 || 1)) * 84,
    }));
  }, [mapLocs, openId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dv lc">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Onde os equipamentos estão: internos (instalação) ou externos (via pública). Um local reúne vários dispositivos."
          icon="pin"
          actions={
            <>
              <Button icon="dev" onClick={() => navigate('/dispositivos')}>Dispositivos</Button>
              <Button icon="download" onClick={() => exportCsv(listRows)}>Exportar</Button>
              <Button variant="primary" icon="plus" onClick={() => setForm({})}>Novo local</Button>
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
                    className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${c.k === 'falha' && n > 0 ? ' is-alarm' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </CardBtn>
                );
              })}
            </div>
            <div className="dv-meters">
              <div className="dv-meter lc-split">
                <div className="dv-meter__top"><span>Instalações e territórios</span></div>
                <div className="lc-split__vals">
                  <button type="button" onClick={() => setF({ ...EMPTY, kind: ['instalacao'] })}><b>{nInst}</b><span>Instalações</span></button>
                  <button type="button" onClick={() => setF({ ...EMPTY, kind: ['territorio'] })}><b>{nTerr}</b><span>Territórios</span></button>
                </div>
                <div className="lc-split__bar"><i style={{ width: `${(nInst / Math.max(1, nInst + nTerr)) * 100}%` }} /></div>
              </div>
            </div>
          </section>

          <div className="dv-tools">
            <Segmented label="Visualização" value={view} onChange={setView} options={[
              { value: 'lista', label: <><Icon name="grid" size={14} />Lista</> },
              { value: 'arvore', label: <><Icon name="nodes" size={14} />Árvore</> },
              { value: 'mapa', label: <><Icon name="map" size={14} />Mapa</> },
            ]} />
            <label className="nx-input dv-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, zona, bairro ou rua" aria-label="Buscar locais"
                onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
              {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
            </label>
            <span className="dv-tools__sp" />
            {view === 'arvore' && (
              <>
                <span className="dv-upd">{roots} raízes · {locs.length} locais</span>
                <IconButton icon="unfold" label="Expandir tudo" onClick={() => setExpanded(new Set(locs.filter((l) => childrenOf(l.id, locs).length).map((l) => l.id)))} tipPlace="bottom" />
                <IconButton icon="fold" label="Recolher tudo" onClick={() => setExpanded(new Set())} tipPlace="bottom" />
              </>
            )}
            {view !== 'arvore' && <span className="dv-upd" aria-live="polite">{spin ? 'Atualizando…' : `Atualizado ${ago((Date.now() - refreshed) / 1000)}`}</span>}
            <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={refresh} tipPlace="bottom" />
          </div>

          <div className="dv-filters" role="group" aria-label="Filtros">
            {F_GROUPS.map((g) => (
              <button key={g.key} type="button" className={`dv-fdrop${f[g.key].length ? ' is-on' : ''}${filterBtn?.key === g.key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={filterBtn?.key === g.key}
                onClick={(e) => setFilterBtn(filterBtn?.key === g.key ? null : { key: g.key, el: e.currentTarget })}>
                <span className="dv-fdrop__k">{g.label}:</span>
                <span className="dv-fdrop__v">{f[g.key].length === 0 ? 'todos' : f[g.key].length === 1 ? fLabel(g.key, f[g.key][0]) : `${f[g.key].length} selecionados`}</span>
                <Icon name="chevron" size={14} />
              </button>
            ))}
          </div>

          {anyFilter && (
            <div className="dv-chips">
              <span className="dv-chips__n"><b>{hits.length}</b> de {locs.length}</span>
              {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
              {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
              {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
              <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
            </div>
          )}

          {view === 'mapa' ? (
            <div className="lc-mapview">
              <MapCanvas pins={pins} onPin={setOpenId} tall>
                <div className="lc-mapc__top">
                  <Segmented label="Recorte" size="sm" value={mapScope} onChange={setMapScope} options={[{ value: 'campus', label: 'Campus' }, { value: 'cidade', label: 'Curitiba' }]} />
                  <span className="dv-tools__sp" />
                  <LayersButton />
                  <button type="button" className="lc-mapbtn" onClick={() => toast('Importar KML · simulado no protótipo')}><Icon name="upload" size={14} />Importar KML</button>
                </div>
              </MapCanvas>
              <div className="lc-maplist">
                <span className="lc-maplist__n">{mapLocs.length} locais no mapa</span>
                {[...mapLocs].sort((a, b) => H_RANK[I(a).health] - H_RANK[I(b).health] || byName(a, b)).map((l) => (
                  <button key={l.id} type="button" className={`lc-mapitem${openId === l.id ? ' is-on' : ''}`} onClick={() => setOpenId(l.id)}>
                    <span className="dv-name"><b>{l.name}</b><span>{l.zone} · {I(l).devs.length} dispositivos</span></span>
                    <HealthPill h={I(l).health} compact />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="dv-table lc-table" role={view === 'arvore' ? 'treegrid' : 'table'} aria-label="Locais">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c dv-c--chk" role="columnheader">
                  <Checkbox label="Selecionar página" checked={allOn} indeterminate={!allOn && someOn}
                    onChange={() => setSel((s) => { const n = new Set(s); shown.forEach(({ l }) => (allOn ? n.delete(l.id) : n.add(l.id))); return n; })} />
                </span>
                <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Local</Th>
                <Th k="kind" sort={sort} onSort={sortBy} cls="lc-c--type">Tipo · Ambiente</Th>
                <Th k="zone" sort={sort} onSort={sortBy} cls="lc-c--zone">Zona</Th>
                <Th k="devs" sort={sort} onSort={sortBy} cls="lc-c--devs">Dispositivos</Th>
                <Th k="subs" sort={sort} onSort={sortBy} cls="lc-c--subs">Sub-locais</Th>
                <Th k="health" sort={sort} onSort={sortBy} cls="lc-c--health">Estado</Th>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {shown.map(({ l, depth }) => (
                <Row key={l.id} l={l} depth={depth} tree={view === 'arvore'} parent={pathOf(l, locs).at(-1)} x={I(l)}
                  dim={view === 'arvore' && anyFilter && !hitIds.has(l.id)} expanded={expanded.has(l.id)} onToggle={() => toggleTree(l.id)}
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
        </div>

        <footer className="dv-foot">
          {paged
            ? <span>{rows.length ? `${pg * size + 1}–${Math.min(rows.length, pg * size + size)} de ${rows.length}` : '0 locais'}</span>
            : <span>{view === 'mapa' ? `${mapLocs.length} locais no mapa` : `${hits.length} de ${locs.length} locais`}</span>}
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
            <Button icon="download" onClick={() => exportCsv(locs.filter((l) => sel.has(l.id)))}>Exportar</Button>
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

      {filterBtn && (() => {
        const g = F_GROUPS.find((x) => x.key === filterBtn.key)!;
        return (
          <Menu anchor={filterBtn.el} align="left" onClose={() => setFilterBtn(null)} className="dv-fmenu">
            <div className="dv-fmenu__body">
              <div className="nx-menu__title">{g.label}</div>
              {g.opts.map(([v, lb]) => (
                <Checkbox key={v} label={lb} checked={f[g.key].includes(v)} onChange={() => toggleF(g.key, v)}>
                  <span className="dv-fmenu__l">{lb}</span>
                  <span className="dv-fmenu__n">{locs.filter((l) => textMatch(l) && matches(l, { ...f, [g.key]: [v] })).length}</span>
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

      {rowMenu && (
        <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
          {(() => {
            const l = locs.find((x) => x.id === rowMenu.l.id) ?? rowMenu.l;
            const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
            return (
              <>
                <NavItem role="menuitem" icon="panel" label="Ver detalhes" onClick={close(() => setOpenId(l.id))} />
                <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => setForm({ edit: l }))} />
                <NavItem role="menuitem" icon="plus" label="Adicionar sub-local" onClick={close(() => setForm({ parentId: l.id }))} />
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
            text={`${del.length === 1 ? `“${locs.find((l) => l.id === del[0])?.name}” sai` : 'Os locais saem'} do cadastro${sub ? `, junto com ${sub} ${sub === 1 ? 'sub-local' : 'sub-locais'}` : ''}.${nd ? ` ${nd} ${nd === 1 ? 'dispositivo fica' : 'dispositivos ficam'} sem local e ${nd === 1 ? 'precisa' : 'precisam'} ser realocados.` : ''}`}
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
function CardBtn({ hint, ...rest }: { hint: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = useTooltip(hint, undefined, true, 'bottom');
  return <button type="button" {...tip} {...rest} />;
}

type RowProps = {
  l: Loc; depth: number; tree: boolean; parent?: Loc; x: { devs: Device[]; health: LocHealth; subs: number }; dim: boolean; expanded: boolean;
  sel: boolean; open: boolean; onToggle: () => void; onSel: (v: boolean) => void; onOpen: () => void; onMural: () => void; onEdit: () => void; onMore: (el: HTMLElement) => void;
};
function Row({ l, depth, tree, parent, x, dim, expanded, sel, open, onToggle, onSel, onOpen, onMural, onEdit, onMore }: RowProps) {
  const cams = x.devs.filter((d) => d.kind === 'camera' && d.situacao !== 'inativo').length;
  const online = x.devs.filter((d) => d.situacao === 'ativo' && d.conn === 'online').length;
  const active = x.devs.filter((d) => d.situacao === 'ativo').length;
  const sub = tree ? [l.placeType, l.building && l.building !== l.name ? l.building : null, l.sector].filter(Boolean).join(' · ') : parent ? `↳ ${parent.name}` : [l.placeType, l.sector].filter(Boolean).join(' · ');
  return (
    <div role="row" tabIndex={0} aria-selected={sel} aria-level={tree ? depth + 1 : undefined} aria-expanded={tree && x.subs ? expanded : undefined}
      className={`dv-tr${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${dim ? ' is-dim' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter') onOpen();
        if (e.key === ' ') { e.preventDefault(); onSel(!sel); }
        if (tree && x.subs && ((e.key === 'ArrowRight' && !expanded) || (e.key === 'ArrowLeft' && expanded))) onToggle();
      }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${l.name}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell" style={tree ? { paddingLeft: depth * 24 } : undefined}>
        {tree && (x.subs
          ? <button type="button" className={`lc-twisty${expanded ? ' is-open' : ''}`} aria-label={expanded ? 'Recolher' : 'Expandir'} onClick={(e) => { e.stopPropagation(); onToggle(); }}><Icon name="chevron" size={14} /></button>
          : <span className="lc-twisty is-leaf" />)}
        <span className={`dv-kind lc-kind is-${l.env}`}><Icon name={l.env === 'indoor' ? 'stack' : l.zone === 'Via' ? 'share' : 'map'} size={16} /></span>
        <span className="dv-name">
          <b>{l.name}</b>
          {sub ? <span>{sub}</span> : null}
        </span>
      </span>
      <span className="dv-c lc-c--type" role="cell"><span className="dv-two"><b>{KIND_LABEL[l.kind]}</b><span className="lc-envline"><EnvBadge env={l.env} />{EXPO_LABEL[l.exposure]}</span></span></span>
      <span className="dv-c lc-c--zone" role="cell"><span className="lc-zone">{l.zone}</span></span>
      <span className="dv-c lc-c--devs" role="cell"><DevCounts devs={x.devs} /></span>
      <span className="dv-c lc-c--subs" role="cell">{x.subs ? <b className="lc-num">{x.subs}</b> : <span className="lc-none">0</span>}</span>
      <span className="dv-c lc-c--health" role="cell">
        <span className="dv-two">
          <HealthPill h={x.health} />
          <span>{active ? `${online}/${active} online${cams ? ` · ${cams} câm.` : ''}` : 'Nenhum equipamento'}</span>
        </span>
      </span>
      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="tv" label="Ver câmeras no mural" onClick={onMural} tipPlace="top" disabled={!cams} />
        <IconButton icon="edit" label="Editar" onClick={onEdit} tipPlace="top" />
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}
