import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, Segmented, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { copy, norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import { initials, ROLES } from '../users/data';
import { ACTIONS, EVENTS, TARGETS, USERS_BY_ID, type ActionKey, type AuditEvent, type TargetKey } from './data';
import '../devices/devices.css';
import '../watchlists/watchlists.css';
import './audit.css';

type Period = '1' | '7' | '30' | '90';
type FKey = 'actor' | 'action' | 'target' | 'origin';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { actor: [], action: [], target: [], origin: [] };
type Quick = 'all' | 'access' | 'create' | 'update' | 'delete' | 'export';
type SortKey = 'at' | 'actor' | 'action' | 'target';
const SORT_OPTS: [SortKey, string][] = [['at', 'Data/Hora'], ['actor', 'Usuário'], ['action', 'Ação'], ['target', 'Recurso']];
const PERIOD_LABEL: Record<Period, string> = { '1': 'nas últimas 24 h', '7': 'nos últimos 7 dias', '30': 'nos últimos 30 dias', '90': 'nos últimos 90 dias' };

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
function dayLabel(d: Date) {
  const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Hoje';
  if (sameDay(d, y)) return 'Ontem';
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`;
}
const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const full = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${time(d)}`;

const actorName = (e: AuditEvent) => (e.actorId ? USERS_BY_ID[e.actorId]?.full_name ?? e.actorId : 'Sistema');
const quickOf = (e: AuditEvent): Quick => (e.action === 'login' || e.action === 'logout' || e.action === 'playback' ? 'access' : e.action);

/**
 * Auditoria (VMS): trilha de ações dos usuários e do sistema, somente leitura.
 * Colunas do sistema atual (Data/Hora, Usuário, Ação, Recurso, ID do recurso), período 7/30/90 dias e exportação CSV/PDF.
 * Mesmo padrão de tabela das outras telas (cards de resumo, tabela em card, painel lateral).
 */
export function AuditPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [period, setPeriod] = useState<Period>('30');
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'at', dir: -1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [exportMenu, setExportMenu] = useState<HTMLElement | null>(null);
  const [spin, setSpin] = useState(false);
  const [limit, setLimit] = useState(50);

  const actorOpts: [string, string][] = useMemo(() => {
    const ids = [...new Set(EVENTS.map((e) => e.actorId ?? 'system'))];
    return ids.map((id) => [id, id === 'system' ? 'Sistema' : USERS_BY_ID[id]?.full_name ?? id] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, []);
  const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
    { key: 'actor', label: 'Usuário', opts: actorOpts },
    { key: 'action', label: 'Ação', opts: (Object.keys(ACTIONS) as ActionKey[]).map((k) => [k, ACTIONS[k].label]) },
    { key: 'target', label: 'Recurso', opts: (Object.keys(TARGETS) as TargetKey[]).map((k) => [k, TARGETS[k].label]) },
    { key: 'origin', label: 'Origem', opts: [['Web', 'Web'], ['API', 'API'], ['Sistema', 'Sistema']] },
  ];
  const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;
  const keyOf: Record<FKey, (e: AuditEvent) => string> = { actor: (e) => e.actorId ?? 'system', action: (e) => e.action, target: (e) => e.target, origin: (e) => e.origin };

  const since = Date.now() - Number(period) * 86_400_000;
  const inPeriod = EVENTS.filter((e) => e.at.getTime() >= since);
  const matches = (e: AuditEvent, fl: Filters) => (Object.keys(fl) as FKey[]).every((k) => fl[k].length === 0 || fl[k].includes(keyOf[k](e)));
  const nq = norm(q.trim());
  const textMatch = (e: AuditEvent) => !nq || norm(`${actorName(e)} ${ACTIONS[e.action].label} ${ACTIONS[e.action].code} ${TARGETS[e.target].label} ${e.targetName} ${e.targetId} ${e.ip}`).includes(nq);
  const base = inPeriod.filter((e) => matches(e, f) && textMatch(e));
  const hits = base.filter((e) => quick === 'all' || quickOf(e) === quick);
  const rows = [...hits].sort((a, b) => {
    const r = sort.k === 'actor' ? actorName(a).localeCompare(actorName(b), 'pt-BR')
      : sort.k === 'action' ? ACTIONS[a.action].label.localeCompare(ACTIONS[b.action].label, 'pt-BR')
        : sort.k === 'target' ? TARGETS[a.target].label.localeCompare(TARGETS[b.target].label, 'pt-BR') : 0;
    return r * sort.dir || (a.at.getTime() - b.at.getTime()) * (sort.k === 'at' ? sort.dir : -1);
  });
  const shown = rows.slice(0, limit);
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const open = openId ? EVENTS.find((e) => e.id === openId) ?? null : null;

  useEffect(() => { setLimit(50); }, [period, quick, q, f, sort]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === 'at' ? -1 : 1 }));
  const byActor = (e: AuditEvent) => { setF({ ...EMPTY, actor: [e.actorId ?? 'system'] }); setQ(''); setQuick('all'); setShowF(true); setOpenId(null); };
  const byTarget = (e: AuditEvent) => { setF(EMPTY); setQ(e.targetId); setQuick('all'); setOpenId(null); };
  const doExport = (fmt: 'CSV' | 'PDF') => { setExportMenu(null); toast(`Exportando ${hits.length} eventos ${PERIOD_LABEL[period]} em ${fmt} · simulado no protótipo`); };

  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Eventos', icon: 'audit', tone: 'neutral', hint: 'Todas as ações registradas no período' },
    { k: 'access', label: 'Acessos', icon: 'door', tone: 'neutral', hint: 'Login, logout e gravações reproduzidas' },
    { k: 'create', label: 'Criações', icon: 'plus', tone: 'ok', hint: 'Cadastros novos' },
    { k: 'update', label: 'Edições', icon: 'edit', tone: 'warn', hint: 'Alterações em cadastros, alertas e configurações' },
    { k: 'delete', label: 'Exclusões', icon: 'trash', tone: 'bad', hint: 'Itens removidos' },
    { k: 'export', label: 'Exportações', icon: 'download', tone: 'neutral', hint: 'Clipes e relatórios baixados' },
  ];
  const count = (k: Quick) => base.filter((e) => k === 'all' || quickOf(e) === k).length;

  return (
    <div className="dv wl au">
      <div className="dv-main">
        <PageHeader title={screen.label} icon="audit" description="Quem fez o quê no VMS: acessos, cadastros, alterações e exportações."
          actions={<Button icon="download" aria-haspopup="true" aria-expanded={!!exportMenu} onClick={(e) => setExportMenu(exportMenu ? null : e.currentTarget)}>Exportar</Button>} />

        <div className="dv-body">
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards au-cards" role="group" aria-label="Filtrar">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n.toLocaleString('pt-BR')}</b>
                  </CardBtn>
                );
              })}
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Eventos">
            <div className="dv-tools">
              <span className="wl-title"><b>{rows.length.toLocaleString('pt-BR')}</b> {rows.length === 1 ? 'evento' : 'eventos'}</span>
              <Segmented<Period> label="Período" size="sm" value={period} onChange={setPeriod}
                options={[{ value: '1', label: '24 h' }, { value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }, { value: '90', label: '90 dias' }]} />
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuário, recurso ou ID" aria-label="Buscar eventos"
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
                <span className="dv-chips__n"><b>{hits.length}</b> de {inPeriod.length}</span>
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            <div className="dv-table au-table" role="table" aria-label="Eventos de auditoria">
              <div className="dv-tr dv-th" role="row">
                <Th k="at" sort={sort} onSort={sortBy} cls="au-c--at">Data/Hora</Th>
                <Th k="actor" sort={sort} onSort={sortBy} cls="dv-c--name">Usuário</Th>
                <Th k="action" sort={sort} onSort={sortBy} cls="au-c--act">Ação</Th>
                <Th k="target" sort={sort} onSort={sortBy} cls="au-c--res">Recurso</Th>
                <span className="dv-c au-c--id" role="columnheader"><span className="au-th">ID do recurso</span></span>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {shown.map((e) => {
                const a = ACTIONS[e.action];
                const t = TARGETS[e.target];
                const u = e.actorId ? USERS_BY_ID[e.actorId] : null;
                return (
                  <div key={e.id} role="row" tabIndex={0} className={`dv-tr${openId === e.id ? ' is-open' : ''}`}
                    onClick={() => setOpenId(openId === e.id ? null : e.id)}
                    onKeyDown={(ev) => { if (ev.target === ev.currentTarget && ev.key === 'Enter') setOpenId(openId === e.id ? null : e.id); }}>
                    <span className="dv-c au-c--at" role="cell"><span className="dv-two"><b>{dayLabel(e.at)}</b><span>{time(e.at)}</span></span></span>
                    <span className="dv-c dv-c--name" role="cell">
                      {u ? <span className="dv-kind au-kind">{initials(u.full_name || u.email)}</span> : <span className="dv-kind au-kind is-sys"><Icon name="server" size={16} /></span>}
                      <span className="dv-name"><b>{u ? u.full_name : 'Sistema'}</b><span>{u ? u.email : 'Ação automática'}</span></span>
                    </span>
                    <span className="dv-c au-c--act" role="cell"><Badge tone={a.tone}>{a.label}</Badge></span>
                    <span className="dv-c au-c--res" role="cell">
                      <span className="au-res"><Icon name={t.icon} size={16} />
                        <span className="dv-two"><b>{e.targetName}</b><span>{t.label}</span></span>
                      </span>
                    </span>
                    <span className="dv-c au-c--id" role="cell"><code className="au-id" title={e.targetId}>{e.targetId}</code></span>
                    <span className="dv-c dv-c--act" role="cell" onClick={(ev) => ev.stopPropagation()}>
                      <IconButton icon="copy" label="Copiar ID do recurso" onClick={() => copy(e.targetId, toast, 'ID copiado')} tipPlace="top" />
                      <IconButton icon="more" label="Mais ações" onClick={(ev) => setRowMenu(rowMenu?.id === e.id ? null : { el: ev.currentTarget, id: e.id })} tipPlace="top" />
                    </span>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name="search" /></span>
                  <b>Nenhum evento encontrado</b>
                  <span>{anyFilter ? 'Revise a busca ou os filtros aplicados.' : `Nada registrado ${PERIOD_LABEL[period]}.`}</span>
                  {anyFilter && <Button onClick={clearAll}>Limpar filtros</Button>}
                </div>
              )}
            </div>
            {rows.length > shown.length && (
              <button type="button" className="au-more" onClick={() => setLimit((n) => n + 50)}>
                Carregar mais {Math.min(50, rows.length - shown.length)} <span>· {shown.length} de {rows.length}</span>
              </button>
            )}
          </section>
        </div>
        <footer className="dv-foot">
          <span>{shown.length} de {rows.length} eventos {PERIOD_LABEL[period]}</span>
          <span className="dv-tools__sp" />
          <span className="au-foot__note"><Icon name="lock" size={14} />Registro somente leitura. Nenhum evento pode ser editado ou apagado.</span>
        </footer>
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(440px, 100%)' }}>
            <EventPanel key={open.id} e={open} onClose={() => setOpenId(null)} onCopy={() => copy(open.targetId, toast, 'ID copiado')}
              onActor={() => byActor(open)} onTarget={() => byTarget(open)} />
          </div>
        </div>,
        document.body,
      )}

      {exportMenu && (
        <Menu anchor={exportMenu} onClose={() => setExportMenu(null)}>
          <div className="nx-menu__title">Exportar {hits.length} eventos {PERIOD_LABEL[period]}</div>
          <NavItem role="menuitem" icon="download" label="CSV (planilha)" onClick={() => doExport('CSV')} />
          <NavItem role="menuitem" icon="download" label="PDF (relatório)" onClick={() => doExport('PDF')} />
        </Menu>
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
                  <span className="dv-fmenu__n">{inPeriod.filter((e) => textMatch(e) && matches(e, { ...f, [g.key]: [v] })).length}</span>
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
        const e = EVENTS.find((x) => x.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir evento" onClick={close(() => setOpenId(e.id))} />
            <NavItem role="menuitem" icon="people" label={`Eventos de ${actorName(e)}`} onClick={close(() => byActor(e))} />
            <NavItem role="menuitem" icon="clock" label="Histórico do recurso" onClick={close(() => byTarget(e))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="copy" label="Copiar ID do recurso" onClick={close(() => copy(e.targetId, toast, 'ID copiado'))} />
          </Menu>
        );
      })()}
    </div>
  );
}

/** Painel do evento: quem, o quê, onde e o que mudou. Ações no rodapé fixo. */
function EventPanel({ e, onClose, onCopy, onActor, onTarget }: { e: AuditEvent; onClose: () => void; onCopy: () => void; onActor: () => void; onTarget: () => void }) {
  const a = ACTIONS[e.action];
  const t = TARGETS[e.target];
  const u = e.actorId ? USERS_BY_ID[e.actorId] : null;
  const role = u ? ROLES.find((r) => r.key === u.roles[0])?.label : null;
  const title = e.action === 'login' || e.action === 'logout' ? a.verb : `${a.verb} ${t.label.toLowerCase()}`;
  return (
    <aside className="dv-drawer au-drawer" aria-label="Evento de auditoria">
      <header className="dv-drawer__head">
        <span className={`au-dkind is-${a.tone}`}><Icon name={a.icon} size={18} /></span>
        <div className="dv-drawer__title">
          <h2>{title}</h2>
          <p>{full(e.at)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>
      <div className="dv-drawer__body">
        <dl className="dv-info au-info">
          <div className="dv-info__row"><dt>Usuário</dt><dd>
            {u ? <span className="au-who"><span className="au-av">{initials(u.full_name || u.email)}</span><span className="dv-name"><b>{u.full_name}</b><span>{u.email}</span></span></span>
              : <span className="au-who"><span className="au-av is-sys"><Icon name="server" size={14} /></span><span className="dv-name"><b>Sistema</b><span>Ação automática</span></span></span>}
          </dd></div>
          {role && <div className="dv-info__row"><dt>Papel</dt><dd>{role}</dd></div>}
          <div className="dv-info__row"><dt>Ação</dt><dd className="au-inline"><Badge tone={a.tone}>{a.label}</Badge><code className="au-code">{a.code}</code></dd></div>
          <div className="dv-info__row"><dt>Recurso</dt><dd className="au-inline"><Icon name={t.icon} size={14} />{t.label}<code className="au-code">{t.code}</code></dd></div>
          <div className="dv-info__row"><dt>Nome</dt><dd className="au-wrap">{e.targetName}</dd></div>
          <div className="dv-info__row"><dt>ID do recurso</dt><dd><code className="au-id is-full">{e.targetId}</code></dd></div>
          <div className="dv-info__row"><dt>Origem</dt><dd>{e.origin}{e.ip !== '—' && <span className="au-ip"> · IP {e.ip}</span>}</dd></div>
        </dl>

        {e.changes?.length ? (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Alterações</h3><span className="au-muted">{e.changes.length}</span></div>
            <ul className="au-diff">
              {e.changes.map(([field, before, after]) => (
                <li key={field}>
                  <span className="au-diff__f">{field}</span>
                  <span className="au-diff__v">
                    <span className={`au-diff__b${before === '—' ? ' is-empty' : ''}`}>{before}</span>
                    <Icon name="arrowRight" size={14} />
                    <span className="au-diff__a">{after}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {e.note && <p className="au-note"><Icon name="infoFill" size={14} />{e.note}</p>}
      </div>
      <footer className="dv-drawer__foot">
        <IconButton icon="copy" label="Copiar ID do recurso" onClick={onCopy} tipPlace="top" />
        <span className="dv-tools__sp" />
        <Button icon="people" onClick={onActor}>Eventos do usuário</Button>
        <Button variant="primary" icon="clock" onClick={onTarget}>Histórico do recurso</Button>
      </footer>
    </aside>
  );
}

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
