import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, Segmented, useTooltip, useTooltipApi } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import {
  ago, build, dur, hm, inStage, KIND_ICON, KIND_LABEL, late, ME, MINUTE, nextCode, PRIO_LABEL, PRIO_RANK, STAGE_HINT, STAGE_LABEL, STAGES, TEAM_ICON, TEAMS,
  type Kind, type Occ, type Prio, type Stage,
} from './data';
import { NewOccDrawer, OccDrawer, PrioTag, type Move, type NewOcc } from './OccDrawer';
import '../devices/devices.css';
import '../locations/locations.css';
import '../alerts/alerts.css';
import './occurrences.css';

type View = 'quadro' | 'lista' | 'mapa';
type FKey = 'prio' | 'kind' | 'team';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { prio: [], kind: [], team: [] };
const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'prio', label: 'Prioridade', opts: (Object.keys(PRIO_LABEL) as Prio[]).map((p) => [p, PRIO_LABEL[p]]) },
  { key: 'kind', label: 'Tipo', opts: (Object.keys(KIND_LABEL) as Kind[]).map((k) => [k, KIND_LABEL[k]]) },
  { key: 'team', label: 'Equipe', opts: [...TEAMS.map((t) => [t.name, t.name] as [string, string]), ['-', 'Sem equipe']] },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;
type SortKey = 'prio' | 'recent' | 'stage';
const SORT_OPTS: [SortKey, string][] = [['prio', 'Prioridade'], ['recent', 'Mais recente'], ['stage', 'Situação']];
type Quick = 'all' | 'ativas' | 'criticas' | 'atrasadas';
const ACTIVE: Stage[] = ['nova', 'despachada', 'no_local'];
/** Alertas aguardando supervisão na Fila (mesmo número da homologação). */
const QUEUE = 3923;

const FEED: [string, string, string, number][] = [
  ['LPR', 'RVK2C19', 'Estacionamento · Cancela Norte', 2], ['Perímetro', 'Pessoa', 'Bloco 08 Fundos TE', 4], ['LPR', 'GHT4E07', 'Estacionamento · Cancela Norte', 5],
  ['Face', 'Marcos Vieira Lopes · 88%', 'Bloco 04 STI TE', 11], ['Linha', 'Pessoa', 'Bloco 02 BWC 1A', 12], ['LPR', 'QWE7J81', 'Estacionamento · Cancela Norte', 14],
  ['Perímetro', 'Pessoa', 'Bloco 07 Sala Alimentação', 15], ['Objeto', 'Mochila sem dono', 'Bloco 08 Saguão', 19], ['LPR', 'BRA2E19', 'Estacionamento · Cancela Norte', 21],
];

export function OccurrencesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const navigate = useNavigate();
  const { hide: hideTip } = useTooltipApi();
  const [list, setList] = useState<Occ[]>(() => build(Date.now()));
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<View>('quadro');
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'prio', dir: 1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [startForm, setStartForm] = useState<Stage | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArch, setShowArch] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [panels, setPanels] = useState(true);
  const [cardMenu, setCardMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [spin, setSpin] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

  const busy = useMemo(() => new Set(list.filter((o) => o.team && (o.stage === 'despachada' || o.stage === 'no_local')).map((o) => o.team!)), [list]);
  const nq = norm(q.trim());
  const textMatch = (o: Occ) => !nq || norm(`${o.code} ${o.title} ${o.local} ${o.cam ?? ''} ${o.team ?? ''} ${o.parties.map((p) => p.label).join(' ')}`).includes(nq);
  const fMatch = (o: Occ) => (!f.prio.length || f.prio.includes(o.prio)) && (!f.kind.length || f.kind.includes(o.kind)) && (!f.team.length || f.team.includes(o.team ?? '-'));
  const qMatch = (o: Occ) => quick === 'all' || (quick === 'ativas' ? ACTIVE.includes(o.stage) : quick === 'criticas' ? ACTIVE.includes(o.stage) && o.prio === 'critica' : late(o, now));
  const hits = list.filter((o) => textMatch(o) && fMatch(o) && qMatch(o));
  const sorted = [...hits].sort((a, b) => {
    const r = sort.k === 'prio' ? PRIO_RANK[a.prio] - PRIO_RANK[b.prio] || b.at - a.at
      : sort.k === 'stage' ? STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || PRIO_RANK[a.prio] - PRIO_RANK[b.prio] : b.updated - a.updated;
    return r * sort.dir;
  });
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const open = openId ? list.find((o) => o.id === openId) ?? null : null;

  const active = list.filter((o) => ACTIVE.includes(o.stage));
  const waiting = list.filter((o) => o.stage === 'nova').length;
  const crit = active.filter((o) => o.prio === 'critica').length;
  const lateN = list.filter((o) => late(o, now)).length;
  const done = list.filter((o) => o.events.some((e) => e.kind === 'dispatch') && o.events.some((e) => e.what.includes('No local')));
  const avg = done.length ? done.reduce((s, o) => { const d = o.events.find((e) => e.kind === 'dispatch')!.at; const a = o.events.find((e) => e.what.includes('No local'))!.at; return s + (a - d); }, 0) / done.length : 0;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };

  const patch = (id: string, fn: (o: Occ) => Occ) => setList((l) => l.map((o) => (o.id === id ? fn(o) : o)));
  const move = (id: string, m: Move) => {
    const t = Date.now();
    patch(id, (o) => {
      if (m.to === o.stage && !m.team) return o;
      const ev = m.to === 'despachada'
        ? { at: t, who: ME, what: o.stage === 'despachada' ? `Equipe trocada para ${m.team}` : `Despachada para ${m.team}`, note: m.note, kind: 'dispatch' as const }
        : { at: t, who: ME, what: m.to === 'nova' && STAGES.indexOf(o.stage) > 2 ? 'Reaberta' : `Movida para ${STAGE_LABEL[m.to]}`, note: m.to === 'concluida' ? [m.outcome, m.note].filter(Boolean).join(' · ') : m.note, kind: 'stage' as const };
      return { ...o, stage: m.to, team: m.team ?? (m.to === 'nova' ? undefined : o.team), outcome: m.to === 'concluida' ? m.outcome : m.to === 'nova' ? undefined : o.outcome, updated: t, events: [ev, ...o.events] };
    });
    const o = list.find((x) => x.id === id)!;
    toast(m.to === 'despachada' ? `${o.code} despachada para ${m.team}` : `${o.code} em ${STAGE_LABEL[m.to]}`);
  };
  /** Arrastar no quadro: Despachar e Concluir pedem dados, então abrem o painel com o formulário. */
  const dropTo = (id: string, to: Stage) => {
    const o = list.find((x) => x.id === id);
    if (!o || o.stage === to) return;
    if (to === 'despachada' || to === 'concluida') { setStartForm(to); setOpenId(id); return; }
    move(id, { to });
  };
  const create = (n: NewOcc) => {
    const t = Date.now();
    const o: Occ = {
      id: `new${t}`, code: nextCode(), title: n.title, kind: n.kind, prio: n.prio, stage: n.team ? 'despachada' : 'nova', local: n.local, cam: n.cam, desc: n.desc, team: n.team,
      at: t, updated: t, by: ME, alerts: 0, evidence: 0, parties: [], x: 20 + Math.random() * 60, y: 20 + Math.random() * 60,
      events: [...(n.team ? [{ at: t + 1, who: ME, what: `Despachada para ${n.team}`, kind: 'dispatch' as const }] : []), { at: t, who: ME, what: 'Ocorrência registrada', kind: 'create' as const }],
    };
    setList((l) => [o, ...l]);
    setCreating(false); setOpenId(o.id); setStartForm(null);
    toast(`${o.code} registrada`);
  };

  const cards: { k: Quick; label: string; icon: 'ocor' | 'warnFill' | 'clock'; n: number; sub: string; hint: string }[] = [
    { k: 'ativas', label: 'Ativas', icon: 'ocor', n: active.length, sub: `${waiting} aguardando despacho`, hint: 'Novas, despachadas e no local' },
    { k: 'criticas', label: 'Críticas abertas', icon: 'warnFill', n: crit, sub: crit ? 'pedem atenção agora' : 'nenhuma agora', hint: 'Ativas com prioridade crítica' },
    { k: 'atrasadas', label: 'Atrasadas', icon: 'clock', n: lateN, sub: 'despacho ou chegada', hint: 'Nova há mais de 5 min ou despachada há mais de 15 min' },
  ];
  const freeTeams = TEAMS.filter((t) => !busy.has(t.name)).length;

  const allEvents = list.flatMap((o) => o.events.map((e) => ({ ...e, o }))).sort((a, b) => b.at - a.at).slice(0, 8);

  return (
    <div className="dv lc oc">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Central de despacho: do registro ao encerramento."
          icon="ocor"
          actions={<Button variant="primary" icon="plus" onClick={() => { setOpenId(null); setCreating(true); }}>Nova ocorrência</Button>}
        />

        <div className="dv-body">
          <section className="dv-sum oc-sum" aria-label="Resumo">
            <div className="dv-cards oc-cards" role="group" aria-label="Filtrar">
              {cards.map((c) => {
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on} className={`dv-card is-neutral${on ? ' is-on' : ''}${c.n === 0 ? ' is-zero' : ''}${c.k === 'criticas' && c.n ? ' is-crit' : ''}`}
                    onClick={() => setQuick(on ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{c.n}</b><span className="oc-card__sub">{c.sub}</span>
                  </CardBtn>
                );
              })}
              <div className="dv-card is-neutral is-static">
                <span className="dv-card__top"><Icon name="car" size={16} />Equipes livres</span>
                <b>{freeTeams}<small>/{TEAMS.length}</small></b><span className="oc-card__sub">{busy.size} em atendimento</span>
              </div>
              <div className="dv-card is-neutral is-static">
                <span className="dv-card__top"><Icon name="activity" size={16} />Tempo de resposta</span>
                <b>{avg ? dur(avg) : '—'}</b><span className="oc-card__sub">despacho → chegada · 7 d</span>
              </div>
              <CardBtn hint="Abrir a Fila de alertas" className="dv-card is-neutral" onClick={() => navigate('/alertas')}>
                <span className="dv-card__top"><Icon name="alert" size={16} />Alertas na fila</span>
                <b>{QUEUE.toLocaleString('pt-BR')}</b><span className="oc-card__sub oc-link">aguardando triagem <Icon name="arrowRight" size={12} /></span>
              </CardBtn>
            </div>
          </section>

          <section className="dv-tcard is-t2 oc-main" aria-label="Ocorrências">
            <div className="dv-tools">
              <Segmented<View> label="Visualização" value={view} onChange={(v) => { hideTip(); setView(v); }} options={[
                { value: 'quadro', label: <><Icon name="grid" size={14} />Quadro</> },
                { value: 'lista', label: <><Icon name="sliders" size={14} />Lista</> },
                { value: 'mapa', label: <><Icon name="map" size={14} />Mapa</> },
              ]} />
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código, título, local, placa ou pessoa" aria-label="Buscar ocorrências"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              {view === 'lista' && <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />}
              <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }} tipPlace="bottom" />
            </div>

            {showF && <div className="dv-filters" role="group" aria-label="Filtros">
              {F_GROUPS.map((g) => (
                <button key={g.key} type="button" className={`dv-fdrop${f[g.key].length ? ' is-on' : ''}${filterBtn?.key === g.key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={filterBtn?.key === g.key}
                  onClick={(e) => setFilterBtn(filterBtn?.key === g.key ? null : { key: g.key, el: e.currentTarget })}>
                  <span className="dv-fdrop__k">{g.label}:</span>
                  <span className="dv-fdrop__v">{f[g.key].length === 0 ? 'todas' : f[g.key].length === 1 ? fLabel(g.key, f[g.key][0]) : `${f[g.key].length} selecionadas`}</span>
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

            {view === 'quadro' && (
              <div className="oc-board" role="list" aria-label="Quadro de ocorrências">
                {STAGES.map((s) => {
                  const items = hits.filter((o) => o.stage === s).sort((a, b) => PRIO_RANK[a.prio] - PRIO_RANK[b.prio] || b.at - a.at);
                  const folded = s === 'arquivada' && !showArch;
                  return (
                    <section key={s} role="listitem" aria-label={STAGE_LABEL[s]}
                      className={`oc-col is-${s}${folded ? ' is-folded' : ''}${over === s ? ' is-over' : ''}`}
                      onDragOver={(e) => { if (drag) { e.preventDefault(); setOver(s); } }} onDragLeave={() => setOver((x) => (x === s ? null : x))}
                      onDrop={(e) => { e.preventDefault(); if (drag) dropTo(drag, s); setDrag(null); setOver(null); }}>
                      {folded ? (
                        <button type="button" className="oc-col__fold" onClick={() => setShowArch(true)} aria-label={`Mostrar ${STAGE_LABEL[s]}`}>
                          <span>{STAGE_LABEL[s]}</span><b>{items.length}</b>
                        </button>
                      ) : (
                        <>
                          <header className="oc-col__head">
                            <ColTitle s={s} n={items.length} />
                            {s === 'arquivada' && <IconButton icon="collapse" label="Recolher" onClick={() => setShowArch(false)} tipPlace="top" />}
                          </header>
                          <div className="oc-col__list">
                            {items.map((o) => (
                              <OccCard key={o.id} o={o} now={now} on={openId === o.id} dragging={drag === o.id}
                                onOpen={() => { setCreating(false); setStartForm(null); setOpenId(openId === o.id ? null : o.id); }}
                                onDragStart={() => { hideTip(); setDrag(o.id); }} onDragEnd={() => { setDrag(null); setOver(null); }}
                                onMenu={(el) => setCardMenu({ el, id: o.id })} />
                            ))}
                            {items.length === 0 && <span className="oc-col__empty">{drag ? 'Solte aqui' : 'Nada aqui'}</span>}
                          </div>
                        </>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {view === 'lista' && (
              <div className="dv-table oc-table" role="table" aria-label="Ocorrências">
                <div className="dv-tr dv-th" role="row">
                  <span className="dv-c dv-c--name" role="columnheader">Ocorrência</span>
                  <span className="dv-c" role="columnheader">Prioridade</span>
                  <span className="dv-c" role="columnheader">Situação</span>
                  <span className="dv-c oc-c--local" role="columnheader">Local</span>
                  <span className="dv-c oc-c--team" role="columnheader">Equipe</span>
                  <span className="dv-c oc-c--when" role="columnheader">Atualizada</span>
                  <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
                </div>
                {sorted.map((o) => {
                  const nx = o.stage === 'nova' ? 'Despachar' : o.stage === 'despachada' ? 'Chegou' : o.stage === 'no_local' ? 'Concluir' : null;
                  return (
                    <div key={o.id} role="row" tabIndex={0} className={`dv-tr${openId === o.id ? ' is-open' : ''}`} onClick={() => { setCreating(false); setStartForm(null); setOpenId(o.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setOpenId(o.id); }}>
                      <span className="dv-c dv-c--name" role="cell"><span className="al-thumb"><Icon name={KIND_ICON[o.kind]} size={16} /></span>
                        <span className="dv-name"><b>{o.title}</b><span><span className="oc-code">{o.code}</span> · {KIND_LABEL[o.kind]}</span></span></span>
                      <span className="dv-c" role="cell"><PrioTag p={o.prio} /></span>
                      <span className="dv-c" role="cell"><span className="dv-two"><b>{STAGE_LABEL[o.stage]}</b><span className={late(o, now) ? 'oc-warn' : undefined}>{o.stage === 'arquivada' || o.stage === 'concluida' ? o.outcome ?? '—' : `${late(o, now) ? 'Atrasada · ' : ''}${ago(inStage(o), now)}`}</span></span></span>
                      <span className="dv-c oc-c--local" role="cell"><span className="dv-two"><b>{o.local}</b><span>{o.cam ?? 'Sem câmera'}</span></span></span>
                      <span className="dv-c oc-c--team" role="cell">{o.team ? <span className="dv-two"><b>{o.team}</b><span>{TEAMS.find((t) => t.name === o.team)?.people.split(' · ')[0]}</span></span> : <span className="lc-none">—</span>}</span>
                      <span className="dv-c oc-c--when" role="cell"><span className="dv-two"><b>{ago(o.updated, now)}</b><span>Aberta {ago(o.at, now)}</span></span></span>
                      <span className="dv-c dv-c--act oc-acts" role="cell" onClick={(e) => e.stopPropagation()}>
                        {nx && <Button className="al-ack" onClick={() => (o.stage === 'despachada' ? move(o.id, { to: 'no_local' }) : (setStartForm(o.stage === 'nova' ? 'despachada' : 'concluida'), setOpenId(o.id)))}>{nx}</Button>}
                        <IconButton icon="more" label="Mais ações" onClick={(e) => setCardMenu({ el: e.currentTarget, id: o.id })} tipPlace="top" />
                      </span>
                    </div>
                  );
                })}
                {sorted.length === 0 && <Empty anyFilter={anyFilter} clearAll={clearAll} />}
              </div>
            )}

            {view === 'mapa' && (
              <div className="lc-mapview oc-mapview">
                <OccMap items={hits.filter((o) => o.stage !== 'arquivada')} sel={openId} onPin={(id) => { setCreating(false); setStartForm(null); setOpenId(id); }} />
                <div className="lc-maplist">
                  <span className="lc-maplist__n">{hits.filter((o) => o.stage !== 'arquivada').length} ocorrências no mapa</span>
                  {hits.filter((o) => o.stage !== 'arquivada').sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || PRIO_RANK[a.prio] - PRIO_RANK[b.prio]).map((o) => (
                    <button key={o.id} type="button" className={`lc-mapitem${openId === o.id ? ' is-on' : ''}`} onClick={() => setOpenId(o.id)}>
                      <span className="dv-name"><b>{o.title}</b><span>{o.local} · {STAGE_LABEL[o.stage]} · {ago(o.at, now)}</span></span>
                      <PrioTag p={o.prio} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="oc-panels" aria-label="Painéis operacionais">
            <button type="button" className="oc-panels__head" aria-expanded={panels} onClick={() => setPanels((v) => !v)}>
              <Icon name="chevron" size={14} className={panels ? 'is-open' : undefined} />Painéis operacionais
            </button>
            {panels && (
              <div className="oc-pgrid">
                <div className="oc-panel">
                  <header><b>Linha do tempo</b><span>{list.reduce((n, o) => n + o.events.length, 0)}</span></header>
                  <ol className="oc-feed">
                    {allEvents.map((e, i) => (
                      <li key={i}><button type="button" onClick={() => setOpenId(e.o.id)}><span className="dv-name"><b>{e.what}</b><span><span className="oc-code">{e.o.code}</span> · {e.who}</span></span><time>{ago(e.at, now)}</time></button></li>
                    ))}
                  </ol>
                </div>
                <div className="oc-panel">
                  <header><b>Eventos em tempo real</b><span className="oc-livebadge"><i />ao vivo</span></header>
                  <ol className="oc-feed">
                    {FEED.map(([k, what, where, m], i) => (
                      <li key={i}><button type="button" onClick={() => navigate('/alertas')}><span className="oc-evk">{k}</span><span className="dv-name"><b className={k === 'LPR' ? 'oc-mono' : undefined}>{what}</b><span>{where}</span></span><time>{ago(now - m * MINUTE, now)}</time></button></li>
                    ))}
                  </ol>
                </div>
                <div className="oc-panel">
                  <header><b>Equipes</b><span>{busy.size}/{TEAMS.length} em atendimento</span></header>
                  <ol className="oc-feed">
                    {TEAMS.map((t) => {
                      const job = list.find((o) => o.team === t.name && (o.stage === 'despachada' || o.stage === 'no_local'));
                      return (
                        <li key={t.id}><button type="button" onClick={() => (job ? setOpenId(job.id) : toast(`${t.name} disponível`))}>
                          <span className="al-thumb"><Icon name={TEAM_ICON[t.kind]} size={16} /></span>
                          <span className="dv-name"><b>{t.name}</b><span>{job ? `${STAGE_LABEL[job.stage]} · ${job.code}` : t.people}</span></span>
                          <span className={`oc-tstat${job ? ' is-busy' : ''}`}><i />{job ? 'Em atendimento' : 'Livre'}</span>
                        </button></li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {(open || creating) && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) { setOpenId(null); setCreating(false); } }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(500px, 100%)' }}>
            {creating ? <NewOccDrawer busy={busy} onClose={() => setCreating(false)} onCreate={create} />
              : open && <OccDrawer key={open.id + (startForm ?? '')} o={open} all={list} now={now} busy={busy} startForm={startForm}
                onClose={() => { setOpenId(null); setStartForm(null); }}
                onMove={(m) => move(open.id, m)}
                onNote={(t) => { patch(open.id, (o) => ({ ...o, updated: Date.now(), events: [{ at: Date.now(), who: ME, what: 'Nota', note: t, kind: 'note' }, ...o.events] })); }}
                onAdd={(p) => { patch(open.id, (o) => ({ ...o, parties: [...o.parties, p], updated: Date.now(), events: [{ at: Date.now(), who: ME, what: `${p.kind === 'pessoa' ? 'Pessoa' : p.kind === 'veiculo' ? 'Veículo' : 'Objeto'} adicionado`, note: p.label, kind: 'add' }, ...o.events] })); toast('Adicionado à ocorrência'); }}
                onOpen={(id) => { setStartForm(null); setOpenId(id); }} toast={toast} />}
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
                  <span className="dv-fmenu__n">{list.filter((o) => (g.key === 'prio' ? o.prio : g.key === 'kind' ? o.kind : o.team ?? '-') === v).length}</span>
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

      {cardMenu && (() => {
        const o = list.find((x) => x.id === cardMenu.id);
        if (!o) return null;
        const go = (fn: () => void) => () => { setCardMenu(null); fn(); };
        return (
          <Menu anchor={cardMenu.el} onClose={() => setCardMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir detalhes" onClick={go(() => { setStartForm(null); setOpenId(o.id); })} />
            {o.stage === 'nova' && <NavItem role="menuitem" icon="forward" label="Despachar…" onClick={go(() => { setStartForm('despachada'); setOpenId(o.id); })} />}
            {o.stage === 'despachada' && <NavItem role="menuitem" icon="pin" label="Chegou no local" onClick={go(() => move(o.id, { to: 'no_local' }))} />}
            {(o.stage === 'despachada' || o.stage === 'no_local') && <NavItem role="menuitem" icon="check" label="Concluir…" onClick={go(() => { setStartForm('concluida'); setOpenId(o.id); })} />}
            {o.stage === 'concluida' && <NavItem role="menuitem" icon="stack" label="Arquivar" onClick={go(() => move(o.id, { to: 'arquivada' }))} />}
            {(o.stage === 'concluida' || o.stage === 'arquivada') && <NavItem role="menuitem" icon="replay" label="Reabrir" onClick={go(() => move(o.id, { to: 'nova' }))} />}
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="download" label="B.O. / Termos (PDF)" onClick={go(() => toast(`B.O. / Termos de ${o.code} gerado (PDF)`))} />
          </Menu>
        );
      })()}
    </div>
  );
}

/* ───────────── peças ───────────── */

function ColTitle({ s, n }: { s: Stage; n: number }) {
  const t = useTooltip(STAGE_HINT[s], undefined, true, 'top');
  return <span className="oc-col__title" {...t}><i />{STAGE_LABEL[s]}<b>{n}</b></span>;
}

function OccCard({ o, now, on, dragging, onOpen, onDragStart, onDragEnd, onMenu }: {
  o: Occ; now: number; on: boolean; dragging: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void; onMenu: (el: HTMLElement) => void;
}) {
  const isLate = late(o, now);
  const closed = o.stage === 'concluida' || o.stage === 'arquivada';
  return (
    <div role="button" tabIndex={0} draggable className={`oc-card is-${o.prio}${on ? ' is-on' : ''}${dragging ? ' is-drag' : ''}${closed ? ' is-closed' : ''}`}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', o.id); onDragStart(); }} onDragEnd={onDragEnd}>
      <span className="oc-card__top">
        <PrioTag p={o.prio} />
        <span className="oc-code">{o.code}</span>
        <button type="button" className="oc-card__more" aria-label="Ações" onClick={(e) => { e.stopPropagation(); onMenu(e.currentTarget); }}><Icon name="more" size={14} /></button>
      </span>
      <b className="oc-card__title">{o.title}</b>
      <span className="oc-card__meta"><Icon name={KIND_ICON[o.kind]} size={12} />{o.local}</span>
      <span className="oc-card__foot">
        {closed ? <span className="oc-card__out">{o.outcome ?? 'Sem desfecho registrado'}</span>
          : o.team ? <span className="oc-card__team"><Icon name="people" size={12} />{o.team}</span>
          : <span className="oc-card__team is-none">Sem equipe</span>}
        <span className="dv-tools__sp" />
        {o.alerts > 0 && <span className="oc-card__n" title="Alertas vinculados"><Icon name="alert" size={12} />{o.alerts}</span>}
        <time className={isLate ? 'oc-warn' : undefined} title={isLate ? 'Atrasada' : undefined}>{isLate && <Icon name="clock" size={12} />}{o.stage === 'arquivada' ? ago(o.updated, now) : closed && now - o.updated < 864e5 ? hm(o.updated) : closed ? ago(o.updated, now) : ago(inStage(o), now)}</time>
      </span>
    </div>
  );
}

function OccMap({ items, sel, onPin }: { items: Occ[]; sel: string | null; onPin: (id: string) => void }) {
  const tip = useTooltipApi();
  return (
    <div className="lc-mapc is-tall oc-map">
      <div className="lc-mapc__world">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="lc-mapc__bg">
          <path d="M-5 30 C20 26 40 34 60 28 S90 22 105 26" className="lc-st is-main" />
          <path d="M-5 72 C25 70 45 78 70 70 S95 66 105 68" className="lc-st" />
          <path d="M22 -5 C24 25 18 55 26 105" className="lc-st" />
          <path d="M64 -5 C60 30 70 60 62 105" className="lc-st is-main" />
          <path d="M-5 50 L105 54" className="lc-st is-thin" />
          <path d="M40 -5 L46 105" className="lc-st is-thin" />
          <path d="M84 -5 L80 105" className="lc-st is-thin" />
          <rect x="70" y="36" width="10" height="12" rx="1" className="lc-park" />
          <rect x="30" y="56" width="8" height="10" rx="1" className="lc-park" />
        </svg>
        {items.map((o) => (
          <button key={o.id} type="button" className={`oc-pin is-${o.prio}${sel === o.id ? ' is-on' : ''}${o.stage === 'concluida' ? ' is-done' : ''}`} style={{ left: `${o.x}%`, top: `${o.y}%` }}
            aria-label={`${o.code} ${o.title}`} onClick={() => onPin(o.id)}
            onMouseEnter={(e) => tip.show(e.currentTarget, `${o.title} · ${STAGE_LABEL[o.stage]}`, undefined, 'top')} onMouseLeave={tip.hide}>
            <i />
          </button>
        ))}
      </div>
      <div className="oc-legend">{(Object.keys(PRIO_LABEL) as Prio[]).map((p) => <span key={p} className={`oc-prio is-${p}`}><i />{PRIO_LABEL[p]}</span>)}<span className="oc-prio is-done"><i />Concluída</span></div>
      <span className="lc-mapc__attr">© OpenStreetMap · CARTO</span>
    </div>
  );
}

function Empty({ anyFilter, clearAll }: { anyFilter: boolean; clearAll: () => void }) {
  return (
    <div className="dv-empty">
      <span className="dv-empty__ic"><Icon name={anyFilter ? 'search' : 'check'} /></span>
      <b>{anyFilter ? 'Nenhuma ocorrência encontrada' : 'Nenhuma ocorrência'}</b>
      <span>{anyFilter ? 'Revise a busca ou os filtros aplicados.' : 'Ocorrências registradas aparecem aqui.'}</span>
      {anyFilter && <Button onClick={clearAll}>Limpar filtros</Button>}
    </div>
  );
}
function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}
function CardBtn({ hint, ...rest }: { hint: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = useTooltip(hint, undefined, true, 'bottom');
  return <button type="button" {...tip} {...rest} />;
}
