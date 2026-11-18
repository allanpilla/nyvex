import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { copy, norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import {
  BREAKER_HINT, BREAKER_LABEL, ENGINES, KIND_ICON, KIND_LABEL, LAT_WARN, probe, PROBE_TIMEOUT_S, REFETCH_MS, STATE_LABEL, STATE_RANK, stateOf, whyOf,
  type BreakerState, type Engine, type Kind, type State,
} from './data';
import '../devices/devices.css';
import '../watchlists/watchlists.css';
import '../audit/audit.css';
import './engines.css';

type FKey = 'kind' | 'state' | 'breaker';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { kind: [], state: [], breaker: [] };
type Quick = 'all' | State;
type SortKey = 'state' | 'name' | 'kind' | 'latency';
const SORT_OPTS: [SortKey, string][] = [['state', 'Estado'], ['name', 'Engine'], ['kind', 'Tipo'], ['latency', 'Latência']];

const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'kind', label: 'Tipo', opts: (Object.keys(KIND_LABEL) as Kind[]).map((k) => [k, KIND_LABEL[k]]) },
  { key: 'state', label: 'Estado', opts: (Object.keys(STATE_LABEL) as State[]).map((k) => [k, STATE_LABEL[k]]) },
  { key: 'breaker', label: 'Circuito', opts: [...(Object.keys(BREAKER_LABEL) as BreakerState[]).map((k) => [k, BREAKER_LABEL[k]] as [string, string]), ['none', 'Sem circuito']] },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;
const keyOf: Record<FKey, (e: Engine) => string> = { kind: (e) => e.kind, state: (e) => stateOf(e), breaker: (e) => e.breaker?.state ?? 'none' };
const matches = (e: Engine, fl: Filters) => (Object.keys(fl) as FKey[]).every((k) => fl[k].length === 0 || fl[k].includes(keyOf[k](e)));

const pad = (n: number) => String(n).padStart(2, '0');
const hms = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const latCls = (ms: number | null) => (ms == null ? '' : ms > LAT_WARN ? 'is-warn' : '');

/**
 * Engines: saúde dos serviços especialistas (face, placas, vídeo, rotas…), sondada agora.
 * Mesmo conteúdo da tela do sistema (/v1/engines, sonda a cada 30 s, timeout por serviço),
 * no padrão de tabela das outras listagens: cartões de resumo que filtram, tabela em card e painel lateral.
 */
export function EnginesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [list, setList] = useState<Engine[]>(ENGINES);
  const [probedAt, setProbedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'state', dir: 1 });
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; slug: string } | null>(null);

  const runProbe = (manual: boolean) => {
    setBusy(true);
    setTimeout(() => {
      setList((l) => probe(l));
      setProbedAt(Date.now());
      setBusy(false);
      if (manual) toast('Engines sondados agora');
    }, 650);
  };
  useEffect(() => { const t = setInterval(() => runProbe(false), REFETCH_MS); return () => clearInterval(t); }, []);

  const nq = norm(q.trim());
  const textMatch = (e: Engine) => !nq || norm(`${e.name} ${e.slug} ${e.role} ${KIND_LABEL[e.kind]}`).includes(nq);
  const base = list.filter((e) => matches(e, f) && textMatch(e));
  const hits = base.filter((e) => quick === 'all' || stateOf(e) === quick);
  const rows = useMemo(() => [...hits].sort((a, b) => {
    const r = sort.k === 'name' ? a.name.localeCompare(b.name, 'pt-BR')
      : sort.k === 'kind' ? KIND_LABEL[a.kind].localeCompare(KIND_LABEL[b.kind], 'pt-BR')
        : sort.k === 'latency' ? (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity)
          : STATE_RANK[stateOf(a)] - STATE_RANK[stateOf(b)];
    return r * sort.dir || a.name.localeCompare(b.name, 'pt-BR');
  }), [hits, sort]);
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const open = openSlug ? list.find((e) => e.slug === openSlug) ?? null : null;

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.nx-menu')) setOpenSlug(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }));

  const configured = list.filter((e) => e.configured).length;
  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Engines', icon: 'stack', tone: 'neutral', hint: `${configured} de ${list.length} com URL configurada` },
    { k: 'up', label: 'No ar', icon: 'successFill', tone: 'ok', hint: 'Responderam 2xx na sonda de saúde' },
    { k: 'degraded', label: 'Degradados', icon: 'warnFill', tone: 'warn', hint: 'Responderam, mas fora do caminho da sonda de saúde' },
    { k: 'down', label: 'Fora do ar', icon: 'errorFill', tone: 'bad', hint: 'Configurados que não responderam' },
    { k: 'unconfigured', label: 'Não configurados', icon: 'plug', tone: 'neutral', hint: 'Sem URL declarada. Não é falha' },
  ];
  const count = (k: Quick) => base.filter((e) => k === 'all' || stateOf(e) === k).length;
  const downN = list.filter((e) => stateOf(e) === 'down').length;

  return (
    <div className="dv wl au eg">
      <div className="dv-main">
        <PageHeader title={screen.label} icon="stack" description="Saúde dos serviços especialistas (face, placas, vídeo e rotas), sondada agora."
          actions={<Button icon="refresh" className={busy ? 'is-spin' : undefined} disabled={busy} onClick={() => runProbe(true)}>{busy ? 'Sondando…' : 'Sondar agora'}</Button>} />

        <div className="dv-body">
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards eg-cards" role="group" aria-label="Filtrar por estado">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}${c.k === 'down' && downN > 0 ? ' is-alarm' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </CardBtn>
                );
              })}
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Engines">
            <div className="dv-tools">
              <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'engine' : 'engines'}</span>
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar engine ou slug" aria-label="Buscar engines"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />
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
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{STATE_LABEL[quick]}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            <div className={`dv-table eg-table${busy ? ' is-busy' : ''}`} role="table" aria-label="Engines">
              <div className="dv-tr dv-th" role="row">
                <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Engine</Th>
                <Th k="kind" sort={sort} onSort={sortBy} cls="eg-c--kind">Tipo</Th>
                <Th k="state" sort={sort} onSort={sortBy} cls="eg-c--st">Estado</Th>
                <Th k="latency" sort={sort} onSort={sortBy} cls="eg-c--lat">Latência</Th>
                <span className="dv-c eg-c--http" role="columnheader"><span className="au-th">HTTP</span></span>
                <span className="dv-c eg-c--br" role="columnheader"><span className="au-th">Circuito</span></span>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {rows.map((e) => {
                const st = stateOf(e);
                return (
                  <div key={e.slug} role="row" tabIndex={0} className={`dv-tr${openSlug === e.slug ? ' is-open' : ''}${st === 'unconfigured' ? ' is-inactive' : ''}`}
                    onClick={() => setOpenSlug(openSlug === e.slug ? null : e.slug)}
                    onKeyDown={(ev) => { if (ev.target === ev.currentTarget && ev.key === 'Enter') setOpenSlug(openSlug === e.slug ? null : e.slug); }}>
                    <span className="dv-c dv-c--name" role="cell">
                      <span className="dv-kind"><Icon name={KIND_ICON[e.kind]} size={16} /></span>
                      <span className="dv-name"><b>{e.name}</b><span className="eg-slug">{e.slug}</span></span>
                    </span>
                    <span className="dv-c eg-c--kind" role="cell"><span className="eg-muted">{KIND_LABEL[e.kind]}</span></span>
                    <span className="dv-c eg-c--st" role="cell"><StatePill e={e} /></span>
                    <span className="dv-c eg-c--lat" role="cell">{e.latency_ms != null ? <b className={`eg-num ${latCls(e.latency_ms)}`}>{e.latency_ms}<small> ms</small></b> : <span className="eg-dash">—</span>}</span>
                    <span className="dv-c eg-c--http" role="cell">{e.status_code != null ? <code className={`eg-code${e.status_code >= 400 ? ' is-warn' : ''}`}>{e.status_code}</code> : <span className="eg-dash">—</span>}</span>
                    <span className="dv-c eg-c--br" role="cell"><BreakerVal e={e} /></span>
                    <span className="dv-c dv-c--act" role="cell" onClick={(ev) => ev.stopPropagation()}>
                      <IconButton icon="copy" label="Copiar slug" onClick={() => copy(e.slug, toast, 'Slug copiado')} tipPlace="top" />
                      <IconButton icon="more" label="Mais ações" onClick={(ev) => setRowMenu(rowMenu?.slug === e.slug ? null : { el: ev.currentTarget, slug: e.slug })} tipPlace="top" />
                    </span>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name="search" /></span>
                  <b>Nenhum engine encontrado</b>
                  <span>Revise a busca ou os filtros aplicados.</span>
                  <Button onClick={clearAll}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </section>
        </div>
        <footer className="dv-foot">
          <span className="eg-foot"><Icon name="infoFill" size={14} /><span>Sondagem em paralelo via <code>/v1/engines</code>, timeout de {PROBE_TIMEOUT_S} s por serviço. Nenhum engine expõe throughput, fila ou GPU.</span></span>
          <span className="dv-tools__sp" />
          <span className="eg-probed">{busy ? 'Sondando…' : `Sondado às ${hms(probedAt)}`} · a cada 30 s</span>
        </footer>
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) setOpenSlug(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(440px, 100%)' }}>
            <EnginePanel key={open.slug} e={open} busy={busy} probedAt={probedAt} onClose={() => setOpenSlug(null)} onProbe={() => runProbe(true)} />
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
                  <span className="dv-fmenu__n">{list.filter((e) => textMatch(e) && matches(e, { ...f, [g.key]: [v] })).length}</span>
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
        const e = list.find((x) => x.slug === rowMenu.slug)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir detalhes" onClick={close(() => setOpenSlug(e.slug))} />
            <NavItem role="menuitem" icon="refresh" label="Sondar agora" onClick={close(() => runProbe(true))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="copy" label="Copiar slug" onClick={close(() => copy(e.slug, toast, 'Slug copiado'))} />
            {e.payload && <NavItem role="menuitem" icon="copy" label="Copiar resposta" onClick={close(() => copy(JSON.stringify(e.payload), toast, 'Resposta copiada'))} />}
          </Menu>
        );
      })()}
    </div>
  );
}

/** Painel do engine: estado e por quê, medidas da sonda, circuito e resposta. Ações no rodapé fixo. */
function EnginePanel({ e, busy, probedAt, onClose, onProbe }: { e: Engine; busy: boolean; probedAt: number; onClose: () => void; onProbe: () => void }) {
  const { toast } = useUi();
  const st = stateOf(e);
  const alertType = st === 'down' ? 'error' : st === 'degraded' ? 'warning' : st === 'up' ? 'success' : 'information';
  return (
    <aside className="dv-drawer eg-drawer" aria-label={`Engine ${e.name}`}>
      <header className="dv-drawer__head">
        <span className="dv-kind is-lg"><Icon name={KIND_ICON[e.kind]} size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{e.name}</h2>
          <p>{KIND_LABEL[e.kind]} · <span className="eg-slug">{e.slug}</span></p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>
      <div className="dv-drawer__body">
        <Alert type={alertType} title={STATE_LABEL[st]}>{whyOf(e)}</Alert>
        <p className="eg-role">{e.role}</p>

        {e.configured ? (
          <div className="dv-tele">
            <Stat icon="clock" k="Latência" v={e.latency_ms != null ? <b className={latCls(e.latency_ms)}>{e.latency_ms}<small> ms</small></b> : <b className="eg-dash">—</b>}
              sub={e.latency_ms != null && e.latency_ms > LAT_WARN ? `Acima de ${LAT_WARN} ms` : undefined} />
            <Stat icon="server" k="HTTP" v={<b className={e.status_code && e.status_code >= 400 ? 'is-warn' : e.status_code ? '' : 'eg-dash'}>{e.status_code ?? '—'}</b>} />
            <Stat icon="plug" k="Circuito" v={<b className={`eg-br is-${e.breaker?.state ?? 'none'}`}>{e.breaker ? BREAKER_LABEL[e.breaker.state] : '—'}</b>} sub={e.breaker ? BREAKER_HINT[e.breaker.state] : undefined} />
            <Stat icon="warn" k="Falhas" v={<b className={e.breaker?.failures ? 'is-bad' : ''}>{e.breaker ? e.breaker.failures : '—'}</b>} sub={e.breaker ? 'Seguidas, no circuito' : undefined} />
          </div>
        ) : null}

        <dl className="dv-info au-info">
          <div className="dv-info__row"><dt>Slug</dt><dd><code className="au-id">{e.slug}</code></dd></div>
          <div className="dv-info__row"><dt>Endereço</dt><dd>{e.url ? <code className="au-id">{e.url}</code> : <span className="eg-dash">Não declarado</span>}</dd></div>
          <div className="dv-info__row"><dt>Última sonda</dt><dd>{busy ? 'Sondando…' : `às ${hms(probedAt)}`}</dd></div>
        </dl>

        {e.breaker?.last_error && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Último erro do circuito</h3></div>
            <pre className="eg-pre is-err">{e.breaker.last_error}</pre>
          </section>
        )}
        {e.payload && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Resposta do engine</h3>
              <button type="button" className="eg-link" onClick={() => copy(JSON.stringify(e.payload), toast, 'Resposta copiada')}><Icon name="copy" size={14} />Copiar</button>
            </div>
            <pre className="eg-pre">{JSON.stringify(e.payload, null, 2)}</pre>
          </section>
        )}
        {!e.configured && <p className="au-note"><Icon name="infoFill" size={14} />Para monitorar este engine, declare a URL dele na configuração do backend. Ele já aparece no menu, mas não há endereço para sondar.</p>}
      </div>
      <footer className="dv-drawer__foot">
        <IconButton icon="copy" label="Copiar slug" onClick={() => copy(e.slug, toast, 'Slug copiado')} tipPlace="top" />
        <span className="dv-tools__sp" />
        <Button icon="external" onClick={() => toast(`Abre a tela do ${e.name} · simulado no protótipo`)} disabled={!e.configured}>Abrir engine</Button>
        <Button variant="primary" icon="refresh" disabled={busy} onClick={onProbe}>{busy ? 'Sondando…' : 'Sondar agora'}</Button>
      </footer>
    </aside>
  );
}

function StatePill({ e }: { e: Engine }) {
  const st = stateOf(e);
  const tip = useTooltip(whyOf(e), undefined, true, 'top');
  return <span className={`dv-conn eg-st is-${st}`} {...tip}><i />{STATE_LABEL[st]}</span>;
}
function BreakerVal({ e }: { e: Engine }) {
  if (!e.breaker) return <span className="eg-dash">—</span>;
  const { state, failures } = e.breaker;
  return (
    <span className="dv-two">
      <b className={`eg-br is-${state}`}>{BREAKER_LABEL[state]}</b>
      <span>{failures === 0 ? 'sem falhas' : `${failures} ${failures === 1 ? 'falha' : 'falhas'}`}</span>
    </span>
  );
}
function Stat({ icon, k, v, sub }: { icon: IconName; k: string; v: ReactNode; sub?: string }) {
  return (
    <div className="dv-stat">
      <span className="dv-stat__k"><Icon name={icon} size={14} />{k}</span>
      <span className="dv-stat__v">{v}</span>
      {sub && <span className="dv-stat__s">{sub}</span>}
    </div>
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
