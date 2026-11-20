import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Button, Checkbox, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { copy, norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import {
  ageText, buildPeople, camLabel, credExpired, credExpiring, docText, isMonitored, listsOf, NOW, P_STATUS, P_STATUS_ORDER, P_TYPES, pendingAlerts, RISK_LABEL, shortId, typeName,
  type Person, type PStatus, type Risk,
} from './data';
import { CardBtn, Chip, PersonPic, PStatusDot, RiskTag, Th, ThPlain } from './parts';
import { PersonDrawer } from './PersonDrawer';
import { PersonProfile } from './PersonProfile';
import { MonitorSheet, PersonForm, PhotoSearch, TypesSheet } from './PeopleSheets';
import '../devices/devices.css';
import '../locations/locations.css';
import '../watchlists/watchlists.css';
import './identity.css';

type FKey = 'status' | 'risk' | 'doc';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { status: [], risk: [], doc: [] };
const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'status', label: 'Status', opts: P_STATUS_ORDER.map((s) => [s, P_STATUS[s]]) },
  { key: 'risk', label: 'Risco', opts: (['alto', 'medio', 'baixo'] as Risk[]).map((r) => [r, RISK_LABEL[r]]) },
  { key: 'doc', label: 'Documento', opts: [['com', 'Com documento'], ['sem', 'Sem documento'], ['foto', 'Com foto'], ['semfoto', 'Sem foto']] },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;

type Quick = 'all' | 'monitoradas' | 'procuradas' | 'bloqueadas' | 'vencidas' | 'avencer';
type SortKey = 'name' | 'activity' | 'events' | 'risk' | 'updated';
const SORT_OPTS: [SortKey, string][] = [['name', 'Nome'], ['activity', 'Última atividade'], ['events', 'Eventos'], ['risk', 'Risco'], ['updated', 'Atualização do cadastro']];
const RISK_N: Record<Risk, number> = { baixo: 0, medio: 1, alto: 2 };
const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
const lastSeen = (p: Person) => p.sightings[0]?.at ?? 0;
const events30 = (p: Person) => p.sightings.filter((s) => NOW - s.at < 30 * 864e5).length;

export function PeoplePage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [sp, setSp] = useSearchParams();
  const [people, setPeople] = useState<Person[]>(buildPeople);
  const [quick, setQuick] = useState<Quick>('all');
  const [type, setType] = useState<string>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'activity', dir: -1 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ edit?: Person } | null>(null);
  const [sheet, setSheet] = useState<'tipos' | 'foto' | null>(null);
  const [monitor, setMonitor] = useState<Person | null>(null);
  const [status, setStatus] = useState<{ ids: string[]; to: PStatus } | null>(null);
  const [del, setDel] = useState<Person | null>(null);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [spin, setSpin] = useState(false);

  const profileId = sp.get('id');
  const profile = profileId ? people.find((p) => p.id === profileId) ?? null : null;
  const openProfile = (id: string, tab?: string) => { setOpenId(null); setSp(tab ? { id, aba: tab } : { id }); };

  const matches = (p: Person, fl: Filters) => {
    const ok = (k: FKey, test: (v: string) => boolean) => fl[k].length === 0 || fl[k].some(test);
    return ok('status', (v) => p.status === v) && ok('risk', (v) => p.risk === v)
      && ok('doc', (v) => (v === 'com' ? !!p.doc : v === 'sem' ? !p.doc : v === 'foto' ? p.photo != null : p.photo == null));
  };
  const quickMatch = (k: Quick, p: Person) => k === 'all' || (k === 'monitoradas' ? isMonitored(p) : k === 'procuradas' ? !!p.wanted : k === 'bloqueadas' ? p.status === 'bloqueada' : k === 'vencidas' ? credExpired(p) : credExpiring(p));
  const nq = norm(q.trim());
  const textMatch = (p: Person) => !nq || norm(`${p.name} ${p.social ?? ''} ${docText(p)} ${p.externalId ?? ''} ${p.attrs.map((a) => a[1]).join(' ')}`).includes(nq);
  const base = useMemo(() => people.filter((p) => matches(p, f) && textMatch(p)), [people, f, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const afterQuick = useMemo(() => base.filter((p) => quickMatch(quick, p)), [base, quick]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = useMemo(() => afterQuick.filter((p) => type === 'all' || (type === 'none' ? p.types.length === 0 : p.types.includes(type))), [afterQuick, type]);
  const rows = useMemo(() => [...hits].sort((a, b) => {
    const r = sort.k === 'name' ? byName(a, b) : sort.k === 'activity' ? lastSeen(a) - lastSeen(b) : sort.k === 'events' ? events30(a) - events30(b)
      : sort.k === 'risk' ? RISK_N[a.risk] - RISK_N[b.risk] : a.updated - b.updated;
    return r * sort.dir || byName(a, b);
  }), [hits, sort]);
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all' || type !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const count = (k: Quick) => base.filter((p) => quickMatch(k, p)).length;
  const open = openId ? people.find((p) => p.id === openId) ?? null : null;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); setType('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }));
  const patch = (id: string, fn: (p: Person) => Person) => setPeople((l) => l.map((p) => (p.id === id ? { ...fn(p), updated: NOW } : p)));
  const applyStatus = (ids: string[], to: PStatus) => {
    ids.forEach((id) => patch(id, (p) => ({ ...p, status: to })));
    setStatus(null); setSel(new Set());
    toast(ids.length === 1 ? `Status alterado para ${P_STATUS[to]}` : `${ids.length} pessoas · status ${P_STATUS[to]}`);
  };
  const exportCsv = (list: Person[]) => {
    const head = ['Nome', 'Status', 'Documento', 'Tipos', 'Risco', 'Monitorada', 'Último avistamento', 'Avistamentos (30 dias)'];
    const lines = list.map((p) => [p.name, P_STATUS[p.status], docText(p), p.types.map(typeName).join(', '), RISK_LABEL[p.risk], isMonitored(p) ? 'Sim' : 'Não',
      p.sightings[0] ? new Date(p.sightings[0].at).toLocaleString('pt-BR') : '', events30(p)].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'pessoas.csv';
    a.click();
    toast(`${list.length} ${list.length === 1 ? 'pessoa exportada' : 'pessoas exportadas'} (CSV)`);
  };
  const refresh = () => { setSpin(true); setTimeout(() => setSpin(false), 600); };

  const cards: { k: Quick; label: string; icon: IconName; hint: string; alarm?: boolean }[] = [
    { k: 'all', label: 'Cadastradas', icon: 'people', hint: 'Todas as pessoas do cadastro único' },
    { k: 'monitoradas', label: 'Monitoradas', icon: 'eye', hint: 'Em pelo menos uma lista de observação ativa' },
    { k: 'procuradas', label: 'Procuradas', icon: 'alert', hint: 'Com mandado ou pedido de localização', alarm: true },
    { k: 'bloqueadas', label: 'Bloqueadas', icon: 'lock', hint: 'Acesso negado em todos os recursos' },
    { k: 'vencidas', label: 'Credenciais vencidas', icon: 'idcard', hint: 'Com cartão, QR ou facial vencido' },
    { k: 'avencer', label: 'Vencem em 30 dias', icon: 'calendar', hint: 'Credenciais que vencem nos próximos 30 dias' },
  ];
  const typeCount = (id: string) => afterQuick.filter((p) => (id === 'none' ? p.types.length === 0 : p.types.includes(id))).length;
  const allOn = rows.length > 0 && rows.every((p) => sel.has(p.id));
  const someOn = rows.some((p) => sel.has(p.id));
  const selPeople = people.filter((p) => sel.has(p.id));

  const overlays = (
    <>
      {form && (
        <PersonForm edit={form.edit} onClose={() => setForm(null)}
          onSave={(data) => {
            if (form.edit) {
              patch(form.edit.id, (p) => ({ ...p, ...data }));
              toast('Cadastro atualizado');
            } else {
              const id = `p-${Math.random().toString(16).slice(2, 10)}`;
              setPeople((l) => [{
                id, ...data, status: 'ativa', risk: 'baixo', created: NOW, updated: NOW, attrs: [],
                sightings: [], alerts: [], creds: [], links: [], contacts: [], consents: data.photo != null ? [{ purpose: 'Reconhecimento facial para controle de acesso', at: NOW, until: null }] : [], qualifications: [], assignments: [],
              }, ...l]);
              setOpenId(id);
              toast(`${data.name} cadastrada`);
            }
            setForm(null);
          }} />
      )}
      {sheet === 'tipos' && <TypesSheet people={people} onClose={() => setSheet(null)} />}
      {sheet === 'foto' && <PhotoSearch people={people} onClose={() => setSheet(null)} onOpen={(id) => { setSheet(null); openProfile(id); }} />}
      {monitor && (
        <MonitorSheet p={monitor} onClose={() => setMonitor(null)}
          onSave={(l) => { patch(monitor.id, (p) => ({ ...p, extraLists: [...(p.extraLists ?? []), l] })); toast(`${monitor.name} incluída em ${l.name}`); setMonitor(null); }} />
      )}
      {status && status.ids.length > 0 && (() => {
        const one = status.ids.length === 1 ? people.find((p) => p.id === status.ids[0]) : undefined;
        const hard = status.to === 'bloqueada' || status.to === 'falecida' || status.to === 'inativa' || status.to === 'suspensa';
        return (
          <ConfirmDialog type={hard ? 'warning' : 'information'}
            title={one ? `Mudar ${one.name} para ${P_STATUS[status.to]}?` : `Mudar ${status.ids.length} pessoas para ${P_STATUS[status.to]}?`}
            text={status.to === 'bloqueada' ? 'O acesso é negado em todos os recursos e as credenciais ficam suspensas. A mudança fica na trilha de auditoria.'
              : status.to === 'ativa' ? 'As credenciais vigentes voltam a valer conforme as regras de acesso.'
                : 'As credenciais deixam de valer enquanto o status durar. A mudança fica na trilha de auditoria.'}
            confirm={`Mudar para ${P_STATUS[status.to]}`} onConfirm={() => applyStatus(status.ids, status.to)} onCancel={() => setStatus(null)} />
        );
      })()}
      {del && (
        <ConfirmDialog type="error" title={`Excluir ${del.name}?`}
          text="O cadastro, as credenciais e os vínculos são removidos. Avistamentos e alertas antigos continuam no histórico, sem identificação. Não dá para desfazer."
          confirm="Excluir pessoa"
          onConfirm={() => { setPeople((l) => l.filter((p) => p.id !== del.id)); toast(`${del.name} excluída`); setDel(null); setOpenId(null); if (profileId === del.id) setSp({}); }}
          onCancel={() => setDel(null)} />
      )}
    </>
  );

  if (profileId) {
    return (
      <>
        <PersonProfile key={profileId} p={profile} people={people} tab={sp.get('aba')} onTab={(t) => setSp({ id: profileId, aba: t }, { replace: true })}
          onBack={() => setSp({})} onOpenPerson={(id) => setSp({ id })}
          onEdit={() => profile && setForm({ edit: profile })} onMonitor={() => profile && setMonitor(profile)}
          onStatus={(to) => profile && setStatus({ ids: [profile.id], to })} onDelete={() => profile && setDel(profile)}
          onChange={(fn) => profile && patch(profile.id, fn)} />
        {overlays}
      </>
    );
  }

  return (
    <div className="dv lc wl id">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Cadastro único de pessoas: a base para credenciais, acesso e monitoramento."
          icon="people"
          actions={
            <>
              <Button icon="idcard" onClick={() => setSheet('tipos')}>Tipos de pessoa</Button>
              <Button icon="faces" onClick={() => setSheet('foto')}>Buscar por foto</Button>
              <Button variant="primary" icon="plus" onClick={() => setForm({})}>Cadastrar pessoa</Button>
            </>
          }
        />

        <div className="dv-body">
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards id-cards6" role="group" aria-label="Filtrar">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-neutral${on ? ' is-on' : ''}${c.alarm && n > 0 ? ' is-alarm' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </CardBtn>
                );
              })}
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Pessoas">
            <div className="dv-tools">
              <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'pessoa' : 'pessoas'}</span>
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, documento ou matrícula" aria-label="Buscar pessoas"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />
              <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={refresh} tipPlace="bottom" />
            </div>

            <div className="id-types" role="group" aria-label="Tipo de pessoa">
              <button type="button" className={`id-type${type === 'all' ? ' is-on' : ''}`} onClick={() => setType('all')}>Todos<span>{afterQuick.length}</span></button>
              {P_TYPES.map((t) => {
                const n = typeCount(t.id);
                return <button key={t.id} type="button" className={`id-type${type === t.id ? ' is-on' : ''}${n ? '' : ' is-zero'}`} onClick={() => setType(type === t.id ? 'all' : t.id)}>{t.name}<span>{n}</span></button>;
              })}
              <button type="button" className={`id-type${type === 'none' ? ' is-on' : ''}`} onClick={() => setType(type === 'none' ? 'all' : 'none')}>Sem tipo<span>{typeCount('none')}</span></button>
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
                <span className="dv-chips__n"><b>{hits.length}</b> de {people.length}</span>
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {type !== 'all' && <Chip onRemove={() => setType('all')}><span className="dv-chip__k">Tipo:</span> {type === 'none' ? 'Sem tipo' : typeName(type)}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            <div className="dv-table id-ptable" role="table" aria-label="Pessoas">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c dv-c--chk" role="columnheader">
                  <Checkbox label="Selecionar todas" checked={allOn} indeterminate={!allOn && someOn}
                    onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id))); return n; })} />
                </span>
                <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Pessoa</Th>
                <ThPlain cls="id-c--doc">Documento</ThPlain>
                <ThPlain cls="id-c--types">Tipos</ThPlain>
                <ThPlain cls="id-c--flag">Sinalização</ThPlain>
                <Th k="events" sort={sort} onSort={sortBy} cls="id-c--ev">Eventos · 30 dias</Th>
                <Th k="activity" sort={sort} onSort={sortBy} cls="id-c--last">Última atividade</Th>
                <Th k="risk" sort={sort} onSort={sortBy} cls="id-c--risk">Risco</Th>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {rows.map((p) => (
                <Row key={p.id} p={p} sel={sel.has(p.id)} open={openId === p.id}
                  onSel={(v) => setSel((s) => { const n = new Set(s); if (v) n.add(p.id); else n.delete(p.id); return n; })}
                  onOpen={() => setOpenId(openId === p.id ? null : p.id)}
                  onProfile={() => openProfile(p.id)}
                  onEdit={() => setForm({ edit: p })}
                  onMore={(el) => setRowMenu(rowMenu?.id === p.id ? null : { el, id: p.id })} />
              ))}
              {rows.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name="search" /></span>
                  <b>Nenhuma pessoa encontrada</b>
                  <span>Revise a busca ou os filtros. Para procurar pelo rosto, use Buscar por foto.</span>
                  <Button onClick={clearAll}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="dv-foot">
          <span>{hits.length} de {people.length} pessoas</span>
          <span className="dv-tools__sp" />
          <span className="wl-foot">Documentos aparecem mascarados. A consulta completa fica na trilha de auditoria.</span>
        </footer>

        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para as selecionadas">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionada' : 'selecionadas'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="check" onClick={() => setStatus({ ids: selPeople.filter((p) => p.status !== 'ativa').map((p) => p.id), to: 'ativa' })} disabled={!selPeople.some((p) => p.status !== 'ativa')}>Ativar</Button>
            <Button icon="lock" onClick={() => setStatus({ ids: selPeople.filter((p) => p.status !== 'bloqueada').map((p) => p.id), to: 'bloqueada' })} disabled={!selPeople.some((p) => p.status !== 'bloqueada')}>Bloquear</Button>
            <Button icon="download" onClick={() => exportCsv(selPeople)}>Exportar</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <PersonDrawer key={open.id} p={open} onClose={() => setOpenId(null)} onProfile={(t) => openProfile(open.id, t)}
              onEdit={() => setForm({ edit: open })} onMonitor={() => setMonitor(open)} />
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
                  <span className="dv-fmenu__n">{people.filter((p) => textMatch(p) && matches(p, { ...f, [g.key]: [v] })).length}</span>
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
        const p = people.find((x) => x.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="external" label="Abrir ficha" onClick={close(() => openProfile(p.id))} />
            <NavItem role="menuitem" icon="edit" label="Editar cadastro" onClick={close(() => setForm({ edit: p }))} />
            <NavItem role="menuitem" icon="eye" label="Incluir em lista de observação" onClick={close(() => setMonitor(p))} />
            <NavItem role="menuitem" icon="copy" label="Copiar ID" onClick={close(() => copy(p.id, toast, 'ID copiado'))} />
            <div className="nx-menu__sep" />
            <div className="nx-menu__title">Mudar status</div>
            {P_STATUS_ORDER.filter((s) => s !== p.status && s !== 'pendente').map((s) => (
              <NavItem key={s} role="menuitem" icon={s === 'bloqueada' ? 'lock' : s === 'ativa' ? 'check' : 'pause'} label={P_STATUS[s]} onClick={close(() => setStatus({ ids: [p.id], to: s }))} />
            ))}
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="trash" label="Excluir pessoa" className="is-danger" onClick={close(() => setDel(p))} />
          </Menu>
        );
      })()}

      {overlays}
    </div>
  );
}

type RowProps = { p: Person; sel: boolean; open: boolean; onSel: (v: boolean) => void; onOpen: () => void; onProfile: () => void; onEdit: () => void; onMore: (el: HTMLElement) => void };
function Row({ p, sel, open, onSel, onOpen, onProfile, onEdit, onMore }: RowProps) {
  const last = p.sightings[0];
  const ev = events30(p);
  const lists = listsOf(p).filter((l) => l.active);
  const pend = pendingAlerts(p);
  return (
    <div role="row" tabIndex={0} aria-selected={sel}
      className={`dv-tr${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${p.status === 'inativa' || p.status === 'falecida' ? ' is-inactive' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter') onOpen(); if (e.key === ' ') { e.preventDefault(); onSel(!sel); } }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${p.name}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell">
        <PersonPic p={p} size={36} />
        <span className="dv-name"><b>{p.name}</b><span className="id-sub"><PStatusDot s={p.status} /><span className="id-mono">ID {shortId(p.id)}</span></span></span>
      </span>
      <span className="dv-c id-c--doc" role="cell"><span className={`id-mono${p.doc ? '' : ' is-none'}`}>{docText(p)}</span></span>
      <span className="dv-c id-c--types" role="cell">
        {p.types.length ? <span className="id-tags">{p.types.slice(0, 2).map((t) => <span key={t} className="id-tag">{typeName(t)}</span>)}{p.types.length > 2 && <span className="id-tag">+{p.types.length - 2}</span>}</span> : <span className="lc-none">—</span>}
      </span>
      <span className="dv-c id-c--flag" role="cell">
        {p.wanted ? <span className="id-flag is-bad"><Icon name="alert" size={14} />Procurada</span>
          : pend ? <span className="id-flag is-warn"><Icon name="alert" size={14} />{pend} {pend === 1 ? 'alerta pendente' : 'alertas pendentes'}</span>
            : lists.length ? <span className="id-flag"><Icon name="eye" size={14} />{lists.length === 1 ? lists[0].name : `${lists.length} listas`}</span>
              : <span className="lc-none">—</span>}
      </span>
      <span className="dv-c id-c--ev" role="cell">{ev ? <span className="id-num">{ev}</span> : <span className="lc-none">—</span>}</span>
      <span className="dv-c id-c--last" role="cell">
        {last ? <span className="dv-two"><b>{ageText(last.at)}</b><span className="id-cam"><Icon name="camera" size={12} />{camLabel(last.camId)}</span></span> : <span className="lc-none">Sem avistamento</span>}
      </span>
      <span className="dv-c id-c--risk" role="cell"><RiskTag r={p.risk} /></span>
      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="external" label="Abrir ficha" onClick={onProfile} tipPlace="top" />
        <IconButton icon="edit" label="Editar" onClick={onEdit} tipPlace="top" />
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}
