import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Button, Checkbox, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { copy, norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import { ageText, buildPeople, buildVehicles, camLabel, D, fmtTime, NOW, RISK_LABEL, V_STATUS, vDesc, vRisk, type Risk, type Vehicle, type VStatus } from './data';
import { CardBtn, Chip, Plate, RiskTag, Spark, Th, ThPlain, VStatusDot } from './parts';
import { MonitorVehicle, plateMatch, VehicleDrawer, VehicleForm } from './VehicleDrawer';
import '../devices/devices.css';
import '../locations/locations.css';
import '../watchlists/watchlists.css';
import './identity.css';

type FKey = 'status' | 'type' | 'brand' | 'color' | 'interest' | 'source';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { status: [], type: [], brand: [], color: [], interest: [], source: [] };
type Quick = 'all' | 'ativo' | 'interesse' | 'bloqueado' | 'inativo';
type SortKey = 'recent' | 'plate' | 'events' | 'risk' | 'status';
const SORT_OPTS: [SortKey, string][] = [['recent', 'Mais recentes'], ['plate', 'Placa'], ['events', 'Passagens'], ['risk', 'Risco'], ['status', 'Status']];
const RISK_N: Record<Risk, number> = { baixo: 0, medio: 1, alto: 2 };
const PAGE = 25;
const PEOPLE = buildPeople();
const lastAt = (v: Vehicle) => v.passes[0]?.at ?? 0;
const ev30 = (v: Vehicle) => v.passes.filter((p) => NOW - p.at < 30 * D).length;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function VehiclesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [sp, setSp] = useSearchParams();
  const [list, setList] = useState<Vehicle[]>(buildVehicles);
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'recent', dir: -1 });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ id: string; tab?: 'resumo' | 'passagens' | 'rota' } | null>(null);
  const [form, setForm] = useState<{ edit?: Vehicle } | null>(null);
  const [monitor, setMonitor] = useState<Vehicle | null>(null);
  const [unmonitor, setUnmonitor] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<{ ids: string[]; to: VStatus } | null>(null);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [spin, setSpin] = useState(false);

  // Link de outra tela: /veiculos?placa=BRA2E19 abre o painel do veículo.
  useEffect(() => {
    const pl = sp.get('placa');
    if (!pl) return;
    const v = list.find((x) => x.plate === pl.toUpperCase());
    if (v) setOpen({ id: v.id });
    setSp({}, { replace: true });
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const brands = [...new Set(list.map((v) => v.brand).filter(Boolean))].sort();
  const colors = [...new Set(list.map((v) => cap(v.color)).filter(Boolean))].sort();
  const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
    { key: 'status', label: 'Status', opts: (Object.keys(V_STATUS) as VStatus[]).map((s) => [s, V_STATUS[s]]) },
    { key: 'type', label: 'Tipo', opts: [...[...new Set(list.map((v) => v.type).filter(Boolean))].map((t) => [t!, t!] as [string, string]), ['none', 'Não especificado']] },
    { key: 'brand', label: 'Marca', opts: [...brands.map((b) => [b, b] as [string, string]), ['none', 'Não especificada']] },
    { key: 'color', label: 'Cor', opts: colors.map((c) => [c, c]) },
    { key: 'interest', label: 'Interesse', opts: [['sim', 'De interesse'], ['nao', 'Sem marcação']] },
    { key: 'source', label: 'Origem', opts: [['LPR', 'Criado pela leitura de placa'], ['Cadastro', 'Cadastro manual']] },
  ];
  const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;

  const matches = (v: Vehicle, fl: Filters) => {
    const ok = (k: FKey, test: (x: string) => boolean) => fl[k].length === 0 || fl[k].some(test);
    return ok('status', (x) => v.status === x) && ok('type', (x) => (x === 'none' ? !v.type : v.type === x)) && ok('brand', (x) => (x === 'none' ? !v.brand : v.brand === x))
      && ok('color', (x) => cap(v.color) === x) && ok('interest', (x) => (x === 'sim' ? v.interest : !v.interest)) && ok('source', (x) => v.source === x);
  };
  const quickMatch = (k: Quick, v: Vehicle) => k === 'all' || (k === 'interesse' ? v.interest : v.status === k);
  const nq = norm(normQ(q));
  const base = useMemo(() => list.filter((v) => matches(v, f) && (!nq || plateMatch(v, nq) || norm(PEOPLE.find((p) => p.id === v.owner)?.name ?? '').includes(nq))), [list, f, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = useMemo(() => base.filter((v) => quickMatch(quick, v)), [base, quick]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => [...hits].sort((a, b) => {
    const r = sort.k === 'plate' ? a.plate.localeCompare(b.plate) : sort.k === 'recent' ? lastAt(a) - lastAt(b) || a.created - b.created : sort.k === 'events' ? ev30(a) - ev30(b)
      : sort.k === 'risk' ? RISK_N[vRisk(a)] - RISK_N[vRisk(b)] : a.status.localeCompare(b.status);
    return r * sort.dir || a.plate.localeCompare(b.plate);
  }), [hits, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pg = Math.min(page, pages - 1);
  const shown = rows.slice(pg * PAGE, pg * PAGE + PAGE);
  useEffect(() => setPage(0), [q, f, quick, sort]);
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const count = (k: Quick) => base.filter((v) => quickMatch(k, v)).length;
  const incomplete = list.filter((v) => !v.brand).length;
  const openV = open ? list.find((v) => v.id === open.id) ?? null : null;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'plate' ? 1 : -1 }));
  const patch = (id: string, fn: (v: Vehicle) => Vehicle) => setList((l) => l.map((v) => (v.id === id ? fn(v) : v)));
  const applyStatus = (ids: string[], to: VStatus) => {
    ids.forEach((id) => patch(id, (v) => ({ ...v, status: to })));
    setStatus(null); setSel(new Set());
    toast(ids.length === 1 ? `Status alterado para ${V_STATUS[to]}` : `${ids.length} veículos · ${V_STATUS[to]}`);
  };
  const exportCsv = (vs: Vehicle[]) => {
    const head = ['Placa', 'Tipo', 'Marca', 'Modelo', 'Cor', 'Ano', 'Status', 'Interesse', 'Risco', 'Pessoa vinculada', 'Último avistamento', 'Passagens (30 dias)'];
    const lines = vs.map((v) => [v.plate, v.type ?? '', v.brand, v.model, v.color, v.year ?? '', V_STATUS[v.status], v.interest ? 'Sim' : 'Não', RISK_LABEL[vRisk(v)],
      PEOPLE.find((p) => p.id === v.owner)?.name ?? '', v.passes[0] ? new Date(v.passes[0].at).toLocaleString('pt-BR') : '', ev30(v)].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'veiculos.csv';
    a.click();
    toast(`${vs.length} ${vs.length === 1 ? 'veículo exportado' : 'veículos exportados'} (CSV)`);
  };
  const monitorClick = (v: Vehicle) => (v.interest ? setUnmonitor(v) : setMonitor(v));

  const cards: { k: Quick; label: string; icon: IconName; hint: string }[] = [
    { k: 'all', label: 'Cadastrados', icon: 'car', hint: 'Todos os veículos do cadastro único' },
    { k: 'ativo', label: 'Ativos', icon: 'check', hint: 'Passam pelas cancelas conforme as regras' },
    { k: 'interesse', label: 'De interesse', icon: 'eye', hint: 'Cada leitura da placa gera alerta para a central' },
    { k: 'bloqueado', label: 'Bloqueados', icon: 'lock', hint: 'Entrada negada nas cancelas' },
    { k: 'inativo', label: 'Inativos', icon: 'pause', hint: 'Sem uso; mantidos para histórico' },
  ];
  const allOn = shown.length > 0 && shown.every((v) => sel.has(v.id));
  const someOn = shown.some((v) => sel.has(v.id));
  const selV = list.filter((v) => sel.has(v.id));

  return (
    <div className="dv lc wl id">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Cadastro único de veículos, usado pelas cancelas, listas de observação e investigações."
          icon="car"
          actions={
            <>
              <Button icon="download" onClick={() => exportCsv(rows)}>Exportar</Button>
              <Button variant="primary" icon="plus" onClick={() => setForm({})}>Cadastrar veículo</Button>
            </>
          }
        />

        <div className="dv-body">
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards id-cards5" role="group" aria-label="Filtrar">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-neutral${on ? ' is-on' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </CardBtn>
                );
              })}
            </div>
            <div className="dv-meters">
              <button type="button" className="dv-meter id-meter" onClick={() => { setF({ ...EMPTY, brand: ['none'] }); setShowF(true); }}>
                <div className="dv-meter__top"><span>Cadastro completo</span></div>
                <div className="dv-meter__val"><b>{list.length - incomplete}</b><span>de {list.length}</span><em>{incomplete} sem marca</em></div>
                <div className="dv-meter__bar is-info"><i style={{ width: `${((list.length - incomplete) / Math.max(1, list.length)) * 100}%` }} /></div>
              </button>
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Veículos">
            <div className="dv-tools">
              <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'veículo' : 'veículos'}</span>
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar placa, modelo ou pessoa" aria-label="Buscar veículos"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />
              <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }} tipPlace="bottom" />
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
                <span className="dv-chips__n"><b>{hits.length}</b> de {list.length}</span>
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            <div className="dv-table id-vtable" role="table" aria-label="Veículos">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c dv-c--chk" role="columnheader">
                  <Checkbox label="Selecionar a página" checked={allOn} indeterminate={!allOn && someOn}
                    onChange={() => setSel((s) => { const n = new Set(s); shown.forEach((v) => (allOn ? n.delete(v.id) : n.add(v.id))); return n; })} />
                </span>
                <Th k="plate" sort={sort} onSort={sortBy} cls="dv-c--name">Veículo</Th>
                <Th k="recent" sort={sort} onSort={sortBy} cls="id-c--last">Último avistamento</Th>
                <ThPlain cls="id-c--intel">Inteligência</ThPlain>
                <Th k="events" sort={sort} onSort={sortBy} cls="id-c--ev">Passagens · 14 dias</Th>
                <Th k="risk" sort={sort} onSort={sortBy} cls="id-c--risk">Risco</Th>
                <Th k="status" sort={sort} onSort={sortBy} cls="id-c--st">Status</Th>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {shown.map((v) => (
                <Row key={v.id} v={v} sel={sel.has(v.id)} open={open?.id === v.id}
                  onSel={(x) => setSel((s) => { const n = new Set(s); if (x) n.add(v.id); else n.delete(v.id); return n; })}
                  onOpen={() => setOpen(open?.id === v.id ? null : { id: v.id })}
                  onMonitor={() => monitorClick(v)}
                  onEdit={() => setForm({ edit: v })}
                  onMore={(el) => setRowMenu(rowMenu?.id === v.id ? null : { el, id: v.id })} />
              ))}
              {rows.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name="search" /></span>
                  <b>Nenhum veículo encontrado</b>
                  <span>Revise a busca ou os filtros. Placas são buscadas sem traço.</span>
                  <Button onClick={clearAll}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="dv-foot">
          <span>{rows.length ? `${pg * PAGE + 1}–${Math.min(rows.length, pg * PAGE + PAGE)} de ${rows.length} veículos` : '0 veículos'}</span>
          <span className="dv-tools__sp" />
          <div className="dv-pager">
            <IconButton icon="arrowLeft" label="Página anterior" disabled={pg === 0} onClick={() => setPage(pg - 1)} tipPlace="top" />
            <span><b>{pg + 1}</b> de {pages}</span>
            <IconButton icon="arrowRight" label="Próxima página" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} tipPlace="top" />
          </div>
        </footer>

        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para os selecionados">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionado' : 'selecionados'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="check" disabled={!selV.some((v) => v.status !== 'ativo')} onClick={() => setStatus({ ids: selV.filter((v) => v.status !== 'ativo').map((v) => v.id), to: 'ativo' })}>Ativar</Button>
            <Button icon="pause" disabled={!selV.some((v) => v.status !== 'inativo')} onClick={() => setStatus({ ids: selV.filter((v) => v.status !== 'inativo').map((v) => v.id), to: 'inativo' })}>Inativar</Button>
            <Button icon="lock" disabled={!selV.some((v) => v.status !== 'bloqueado')} onClick={() => setStatus({ ids: selV.filter((v) => v.status !== 'bloqueado').map((v) => v.id), to: 'bloqueado' })}>Bloquear</Button>
            <Button icon="download" onClick={() => exportCsv(selV)}>Exportar</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {openV && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <VehicleDrawer key={openV.id + (open?.tab ?? '')} v={openV} people={PEOPLE} tab={open?.tab} onClose={() => setOpen(null)}
              onEdit={() => setForm({ edit: openV })} onMonitor={() => monitorClick(openV)} />
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
                  <span className="dv-fmenu__n">{list.filter((x) => matches(x, { ...f, [g.key]: [v] })).length}</span>
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
        const v = list.find((x) => x.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="map" label="Ver rota" onClick={close(() => setOpen({ id: v.id, tab: 'rota' }))} />
            <NavItem role="menuitem" icon="copy" label="Copiar placa" onClick={close(() => copy(v.plate, toast, 'Placa copiada'))} />
            <NavItem role="menuitem" icon="eye" label={v.interest ? 'Deixar de monitorar' : 'Monitorar veículo'} onClick={close(() => monitorClick(v))} />
            <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => setForm({ edit: v }))} />
            <div className="nx-menu__sep" />
            <div className="nx-menu__title">Mudar status</div>
            {(Object.keys(V_STATUS) as VStatus[]).filter((s) => s !== v.status).map((s) => (
              <NavItem key={s} role="menuitem" icon={s === 'bloqueado' ? 'lock' : s === 'ativo' ? 'check' : 'pause'} label={V_STATUS[s]} onClick={close(() => setStatus({ ids: [v.id], to: s }))} />
            ))}
          </Menu>
        );
      })()}

      {form && (
        <VehicleForm edit={form.edit} plates={list.map((v) => v.plate)} people={PEOPLE} onClose={() => setForm(null)}
          onSave={(d) => {
            if (form.edit) {
              patch(form.edit.id, (v) => ({ ...v, ...d }));
              toast('Veículo atualizado');
            } else {
              const id = `v-${d.plate.toLowerCase()}`;
              setList((l) => [{ id, ...d, status: 'ativo', interest: false, passes: [], intel: 0, created: NOW, source: 'Cadastro' }, ...l]);
              setSort({ k: 'recent', dir: -1 });
              setOpen({ id });
              toast(`${d.plate} cadastrado`);
            }
            setForm(null);
          }} />
      )}

      {monitor && (
        <MonitorVehicle v={monitor} onClose={() => setMonitor(null)}
          onSave={(reason) => { patch(monitor.id, (v) => ({ ...v, interest: true, interestReason: reason })); toast(`${monitor.plate} monitorado`); setMonitor(null); }} />
      )}
      {unmonitor && (
        <ConfirmDialog type="warning" title={`Deixar de monitorar ${unmonitor.plate}?`} text="As próximas leituras da placa deixam de gerar alerta para a central. O histórico de passagens continua disponível."
          confirm="Deixar de monitorar" onConfirm={() => { patch(unmonitor.id, (v) => ({ ...v, interest: false, interestReason: undefined })); toast(`${unmonitor.plate} sem monitoramento`); setUnmonitor(null); }} onCancel={() => setUnmonitor(null)} />
      )}
      {status && status.ids.length > 0 && (() => {
        const one = status.ids.length === 1 ? list.find((v) => v.id === status.ids[0]) : undefined;
        return (
          <ConfirmDialog type={status.to === 'ativo' ? 'information' : 'warning'}
            title={one ? `Mudar ${one.plate} para ${V_STATUS[status.to]}?` : `Mudar ${status.ids.length} veículos para ${V_STATUS[status.to]}?`}
            text={status.to === 'bloqueado' ? 'A entrada passa a ser negada nas cancelas e cada leitura gera alerta. A mudança fica na trilha de auditoria.'
              : status.to === 'inativo' ? 'O veículo sai das regras de acesso, mas o histórico de passagens continua disponível.'
                : 'O veículo volta a seguir as regras de acesso das cancelas.'}
            confirm={`Mudar para ${V_STATUS[status.to]}`} onConfirm={() => applyStatus(status.ids, status.to)} onCancel={() => setStatus(null)} />
        );
      })()}
    </div>
  );
}

/** Busca por placa aceita traço e minúsculas. */
function normQ(q: string) { const t = q.trim(); return /^[a-z]{3}-?\d/i.test(t) ? t.replace('-', '') : t; }

type RowProps = { v: Vehicle; sel: boolean; open: boolean; onSel: (v: boolean) => void; onOpen: () => void; onMonitor: () => void; onEdit: () => void; onMore: (el: HTMLElement) => void };
function Row({ v, sel, open, onSel, onOpen, onMonitor, onEdit, onMore }: RowProps) {
  const last = v.passes[0];
  const n14 = v.passes.filter((p) => NOW - p.at < 14 * D).length;
  const desc = vDesc(v);
  return (
    <div role="row" tabIndex={0} aria-selected={sel}
      className={`dv-tr${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${v.status === 'inativo' ? ' is-inactive' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter') onOpen(); if (e.key === ' ') { e.preventDefault(); onSel(!sel); } }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${v.plate}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell">
        <span className="dv-kind"><Icon name="car" size={16} /></span>
        <span className="id-vname">
          <span className="id-vplate"><Plate>{v.plate}</Plate>{v.interest && <Icon name="eye" size={14} />}</span>
          <span className={desc === 'Não especificado' ? 'is-none' : undefined}>{desc}</span>
        </span>
      </span>
      <span className="dv-c id-c--last" role="cell">
        {last ? <span className="dv-two"><b>{ageText(last.at)} <span className="id-time">{fmtTime(last.at)}</span></b><span className="id-cam"><Icon name="camera" size={12} />{camLabel(last.camId)}</span></span> : <span className="lc-none">Nenhum avistamento</span>}
      </span>
      <span className="dv-c id-c--intel" role="cell">{v.intel ? <span className="id-intel is-on"><Icon name="nodes" size={14} />{v.intel} {v.intel === 1 ? 'registro' : 'registros'}</span> : <span className="id-intel">Sem sinais</span>}</span>
      <span className="dv-c id-c--ev" role="cell"><span className="id-ev"><b>{n14}</b><Spark times={v.passes.map((p) => p.at)} now={NOW} /></span></span>
      <span className="dv-c id-c--risk" role="cell"><RiskTag r={vRisk(v)} /></span>
      <span className="dv-c id-c--st" role="cell"><VStatusDot s={v.status} /></span>
      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="eye" label={v.interest ? 'Deixar de monitorar' : 'Monitorar veículo'} onClick={onMonitor} tipPlace="top" className={v.interest ? 'is-active' : undefined} />
        <IconButton icon="edit" label="Editar" onClick={onEdit} tipPlace="top" />
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}
