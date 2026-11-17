import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, Select, StatusModal, Switch, Tabs, useTooltip } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import { Thumb } from './Thumb';
import {
  ago, ALERTS, CAMS, camName, FP_REASONS, groupAlerts, KIND, makeAlert, ME, PRIO_LABEL, PRIO_RANK, rand, REASON, span, STATUS_LABEL, subtitle, target, targetSub, title, USERS, when,
  type Alert, type Cat, type Group, type Kind, type Prio, type Status,
} from './data';
import { AlertDrawer, type Act, type Form } from './AlertDrawer';
import { ClipChip, ClipModal } from './Clip';
import '../devices/devices.css';
import '../locations/locations.css';
import './alerts.css';

type FKey = 'cam' | 'prio';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { cam: [], prio: [] };
const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'prio', label: 'Prioridade', opts: [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']] },
  { key: 'cam', label: 'Câmera', opts: Object.entries(CAMS).map(([k, c]) => [k, camName(c)]) },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;
type Quick = 'all' | Cat;
type SortKey = 'prio' | 'recent' | 'count';
const SORT_OPTS: [SortKey, string][] = [['prio', 'Prioridade'], ['recent', 'Mais recente'], ['count', 'Ocorrências']];
const PAGE = 40;
const LIVE_MIX: [Kind, string, Partial<Alert>][] = [
  ['permanencia', 'c8', { note: 'Parado há 4 min na porta' }],
  ['aglomeracao', 'c6', { note: '12 pessoas · limite 10' }],
  ['objeto', 'c3', { note: 'Mochila sem dono há 5 min' }],
  ['contramao', 'c10', { note: 'Veículo na contramão da saída' }],
  ['face', 'c7', { person: 'Marcos Vieira Lopes', score: 87, list: 'Mandados em aberto', seed: 148 }],
  ['placa', 'c10', { plate: 'RVK2C19', list: 'Furto e roubo · SINESP', score: 98 }],
];
const prioOf = (a: Alert): Prio => KIND[a.kind].prio;

export function AlertsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [alerts, setAlerts] = useState<Alert[]>(ALERTS);
  const [tab, setTab] = useState<Status>('pendente');
  const [mine, setMine] = useState(false);
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'recent', dir: 1 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; key: string } | null>(null);
  const [bulkFp, setBulkFp] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [spin, setSpin] = useState(false);
  const [sound, setSound] = useState(true);
  const [startForm, setStartForm] = useState<Form>(null);
  const [fpKeys, setFpKeys] = useState<string[] | null>(null);
  const [fwdKey, setFwdKey] = useState<string | null>(null);
  const [clip, setClip] = useState<Alert | null>(null);
  const openWith = (key: string, f: Form) => { setStartForm(f); setOpenKey(key); };
  const pausedRef = useRef(paused); pausedRef.current = paused;

  // Ao vivo: chegam alertas de perímetro e linha. Com agrupamento, eles somam no grupo da câmera em vez de virar linhas novas.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!pausedRef.current) {
        const r = rand();
        const v = LIVE_MIX[Math.floor(rand() * LIVE_MIX.length)];
        const a = r < 0.5 ? makeAlert('perimetro', r < 0.3 ? 'c1' : 'c3', Date.now()) : r < 0.75 ? makeAlert('linha', r < 0.65 ? 'c2' : 'c4', Date.now()) : makeAlert(v[0], v[1], Date.now(), v[2]);
        setAlerts((l) => [a, ...l]);
        setFresh((s) => new Set(s).add(a.id));
        setTimeout(() => setFresh((s) => { const n = new Set(s); n.delete(a.id); return n; }), 2200);
      }
      t = setTimeout(tick, 9000 + rand() * 14000);
    };
    t = setTimeout(tick, 6000);
    const c = setInterval(() => setNow(Date.now()), 15000);
    return () => { clearTimeout(t); clearInterval(c); };
  }, []);

  const nq = norm(q.trim());
  const textMatch = (a: Alert) => !nq || norm(`${title(a)} ${subtitle(a)} ${camName(CAMS[a.cam])} ${CAMS[a.cam].local} ${CAMS[a.cam].id} ${a.id} ${a.ackBy ?? ''} ${a.fwdTo ?? ''}`).includes(nq);
  const fMatch = (a: Alert, fl: Filters) => (fl.cam.length === 0 || fl.cam.includes(a.cam)) && (fl.prio.length === 0 || fl.prio.includes(prioOf(a)));
  const mineMatch = (a: Alert) => !mine || a.fwdTo === ME || a.ackBy === ME;
  const inTab = useMemo(() => alerts.filter((a) => a.status === tab), [alerts, tab]);
  const base = useMemo(() => inTab.filter((a) => mineMatch(a) && fMatch(a, f) && textMatch(a)), [inTab, mine, f, nq]); // eslint-disable-line react-hooks/exhaustive-deps
  const hits = useMemo(() => base.filter((a) => quick === 'all' || KIND[a.kind].cat === quick), [base, quick]);
  const groups = useMemo(() => {
    const g = groupAlerts(hits, grouped);
    return g.sort((a, b) => {
      const r = sort.k === 'prio' ? PRIO_RANK[prioOf(a.head)] - PRIO_RANK[prioOf(b.head)] || b.last - a.last
        : sort.k === 'count' ? b.items.length - a.items.length || b.last - a.last : b.last - a.last;
      return r * sort.dir;
    });
  }, [hits, grouped, sort]);
  const shown = groups.slice(0, limit);
  const open = openKey ? groups.find((g) => g.key === openKey) ?? null : null;
  const counts = (st: Status) => alerts.filter((a) => a.status === st).length;
  const kcount = (k: Quick) => base.filter((a) => k === 'all' || KIND[a.kind].cat === k).length;
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all' || mine;
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const lastHour = alerts.filter((a) => a.status === 'pendente' && now - a.at < 3600e3).length;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); setMine(false); };
  const changeTab = (t: Status) => { setTab(t); setSel(new Set()); setOpenKey(null); setLimit(PAGE); };

  /** Aplica uma ação a todos os alertas dos grupos indicados. */
  const act = (keys: string[], a: Act) => {
    const ids = new Set(groups.filter((g) => keys.includes(g.key)).flatMap((g) => g.items.map((x) => x.id)));
    const t = Date.now();
    setAlerts((l) => l.map((x) => {
      if (!ids.has(x.id)) return x;
      if (a.type === 'ack') return { ...x, status: 'reconhecido', ackBy: ME, ackAt: t };
      if (a.type === 'fp') return { ...x, status: 'encerrado', closedBy: ME, closedAt: t, outcome: 'Falso positivo', fpReason: a.reason, reeval: a.reeval, justification: a.note };
      if (a.type === 'close') return { ...x, status: 'encerrado', closedBy: ME, closedAt: t, outcome: a.outcome, justification: a.note };
      if (a.type === 'reopen') return { ...x, status: 'pendente', ackBy: undefined, ackAt: undefined, closedBy: undefined, closedAt: undefined, outcome: undefined, justification: undefined, fpReason: undefined, reeval: undefined };
      return { ...x, fwdTo: a.to, fwdNote: a.note, fwdAt: t };
    }));
    const n = ids.size, s = n === 1 ? '' : 's';
    const msg = a.type === 'ack' ? `${n} alerta${s} reconhecido${s}` : a.type === 'fp' ? `${n} alerta${s} encerrado${s} como falso positivo` : a.type === 'close' ? `${n} alerta${s} encerrado${s}` : a.type === 'reopen' ? `${n} alerta${s} reaberto${s}` : `Encaminhado a ${a.to}`;
    toast(msg);
    setSel(new Set());
    if (a.type !== 'fwd') {
      // Segue para o próximo grupo da lista, como numa caixa de entrada.
      const i = groups.findIndex((g) => g.key === openKey);
      const next = groups.slice(i + 1).find((g) => !keys.includes(g.key)) ?? groups.slice(0, i).reverse().find((g) => !keys.includes(g.key));
      setOpenKey(openKey && keys.includes(openKey) ? next?.key ?? null : openKey);
    }
  };

  const exportCsv = (list: Group[]) => {
    const head = ['ID', 'Tipo', 'Prioridade', 'Assunto', 'Câmera', 'Local', 'Quando', 'Situação', 'Reconhecido por', 'Encerrado por', 'Desfecho', 'Encaminhado a'];
    const rows = list.flatMap((g) => g.items).map((a) => [a.id, KIND[a.kind].label, PRIO_LABEL[prioOf(a)], title(a), camName(CAMS[a.cam]), CAMS[a.cam].local, new Date(a.at).toLocaleString('pt-BR'), STATUS_LABEL[a.status], a.ackBy ?? '', a.closedBy ?? '', a.outcome ?? '', a.fwdTo ?? '']
      .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }));
    el.download = 'fila-de-alertas.csv';
    el.click();
    toast(`${rows.length} alertas exportados (CSV)`);
  };

  const cards: { k: Quick; label: string; icon: 'alert' | 'eye' | 'car' | 'shield' | 'activity' | 'people' | 'nosignal'; hint: string }[] = [
    { k: 'all', label: 'Todos', icon: 'alert', hint: 'Todos os alertas desta aba' },
    { k: 'face', label: 'Watchlist', icon: 'eye', hint: 'Match de face com pessoa de uma watchlist' },
    { k: 'placa', label: 'Placas', icon: 'car', hint: 'Placa de uma watchlist lida por câmera LPR' },
    { k: 'perimetro', label: 'Perímetro', icon: 'shield', hint: 'Pessoa em área de divisa' },
    { k: 'linha', label: 'Linha', icon: 'activity', hint: 'Cruzamento de linha virtual' },
    { k: 'comport', label: 'Comportamento', icon: 'people', hint: 'Permanência, objeto abandonado, aglomeração e sentido proibido' },
    { k: 'camera', label: 'Câmeras', icon: 'nosignal', hint: 'Câmera sem vídeo ou com a imagem obstruída' },
  ];
  const allOn = shown.length > 0 && shown.every((g) => sel.has(g.key));
  const someOn = shown.some((g) => sel.has(g.key));
  const selN = groups.filter((g) => sel.has(g.key)).reduce((n, g) => n + g.items.length, 0);

  // Atalhos: J/K ou ↑/↓ percorrem a fila com o painel aberto.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!open || (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]') || document.querySelector('.nx-menu, .nx-smodal, .al-cmodal')) return;
      const i = groups.findIndex((g) => g.key === open.key);
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); const n = groups[i + 1]; if (n) { setOpenKey(n.key); if (i + 1 >= limit) setLimit((x) => x + PAGE); } }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); const n = groups[i - 1]; if (n) setOpenKey(n.key); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, groups, limit]);

  return (
    <div className="dv lc al">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Alertas de face, placa e vídeo aguardando triagem."
          icon="alert"
          actions={
            <>
              <button type="button" className={`al-live${paused ? ' is-paused' : ''}`} onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
                <i />{paused ? 'Pausado' : 'Ao vivo'}<span>{paused ? 'Retomar' : 'Pausar'}</span>
              </button>
              <SoundBtn on={sound} onClick={() => { setSound((v) => !v); toast(sound ? 'Alerta sonoro desativado' : 'Alerta sonoro ativado'); }} />
              <Button icon="download" onClick={() => exportCsv(groups)}>Exportar</Button>
            </>
          }
        />

        <div className="dv-body">
          <div className="al-tabs">
            <Tabs label="Situação" value={tab} onChange={changeTab}
              options={[
                { value: 'pendente', label: 'Pendentes', count: counts('pendente') },
                { value: 'reconhecido', label: 'Reconhecidos', count: counts('reconhecido') },
                { value: 'encerrado', label: 'Encerrados', count: counts('encerrado') },
              ]} />
            <span className="dv-tools__sp" />
            {tab === 'pendente' && <span className="al-hour"><b>{lastHour}</b> na última hora</span>}
            <label className="al-mine"><Switch size="sm" checked={mine} onChange={setMine} label="Só os meus" />Só os meus</label>
          </div>

          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards al-cards" role="group" aria-label="Filtrar por tipo">
              {cards.map((c) => {
                const n = kcount(c.k);
                const on = quick === c.k;
                return (
                  <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                    className={`dv-card is-neutral${on ? ' is-on' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => { setQuick(on || c.k === 'all' ? 'all' : c.k); setLimit(PAGE); }}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n.toLocaleString('pt-BR')}</b>
                  </CardBtn>
                );
              })}
            </div>
          </section>

          <section className="dv-tcard is-t2" aria-label="Alertas">
            <div className="dv-tools">
              <span className="al-title">
                <b>{groups.length.toLocaleString('pt-BR')}</b> {grouped ? (groups.length === 1 ? 'grupo' : 'grupos') : (groups.length === 1 ? 'alerta' : 'alertas')}
                {grouped && <span> · {hits.length.toLocaleString('pt-BR')} alertas</span>}
              </span>
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Buscar pessoa, placa, câmera ou ID" aria-label="Buscar alertas"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <label className="al-group"><Switch size="sm" checked={grouped} onChange={(v) => { setGrouped(v); setSel(new Set()); setOpenKey(null); }} label="Agrupar repetidos" />Agrupar repetidos</label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
              <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />
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
                <span className="dv-chips__n"><b>{hits.length.toLocaleString('pt-BR')}</b> de {inTab.length.toLocaleString('pt-BR')}</span>
                {mine && <Chip onRemove={() => setMine(false)}>Só os meus</Chip>}
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
              </div>
            )}

            <div className="dv-table al-table" role="table" aria-label="Alertas">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c dv-c--chk" role="columnheader">
                  <Checkbox label="Selecionar todos" checked={allOn} indeterminate={!allOn && someOn}
                    onChange={() => setSel((s) => { const n = new Set(s); shown.forEach((g) => (allOn ? n.delete(g.key) : n.add(g.key))); return n; })} />
                </span>
                <span className="dv-c dv-c--name" role="columnheader">Alerta</span>
                <span className="dv-c al-c--reason" role="columnheader">Motivo</span>
                <span className="dv-c al-c--cam" role="columnheader">Câmera</span>
                <span className="dv-c al-c--when" role="columnheader">Quando</span>
                <span className="dv-c al-c--trail" role="columnheader">{tab === 'pendente' ? 'Responsável' : tab === 'reconhecido' ? 'Reconhecido por' : 'Desfecho'}</span>
                <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {shown.map((g) => (
                <Row key={g.key} g={g} now={now} tab={tab} sel={sel.has(g.key)} open={openKey === g.key} fresh={g.items.some((x) => fresh.has(x.id))}
                  onSel={(v) => setSel((s) => { const n = new Set(s); if (v) n.add(g.key); else n.delete(g.key); return n; })}
                  onOpen={() => { setStartForm(null); setOpenKey(openKey === g.key ? null : g.key); }}
                  onAck={() => act([g.key], { type: 'ack' })}
                  onQuick={(f) => (f === 'fp' ? setFpKeys([g.key]) : f === 'fwd' ? setFwdKey(g.key) : f === 'reopen' ? act([g.key], { type: 'reopen' }) : openWith(g.key, f))}
                  onClip={() => setClip(g.head)}
                  onMore={(el) => setRowMenu(rowMenu?.key === g.key ? null : { el, key: g.key })} />
              ))}
              {groups.length > limit && (
                <div className="al-more"><Button onClick={() => setLimit((x) => x + PAGE)}>Mostrar mais {Math.min(PAGE, groups.length - limit)}</Button><span>{limit} de {groups.length.toLocaleString('pt-BR')}</span></div>
              )}
              {groups.length === 0 && (
                <div className="dv-empty">
                  <span className="dv-empty__ic"><Icon name={anyFilter ? 'search' : 'check'} /></span>
                  <b>{anyFilter ? 'Nenhum alerta encontrado' : tab === 'pendente' ? 'Fila zerada' : 'Nada por aqui'}</b>
                  <span>{anyFilter ? 'Revise a busca ou os filtros aplicados.' : tab === 'pendente' ? 'Novos alertas aparecem aqui assim que chegam.' : `Alertas ${tab === 'reconhecido' ? 'reconhecidos' : 'encerrados'} aparecem aqui.`}</span>
                  {anyFilter && <Button onClick={clearAll}>Limpar filtros</Button>}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="dv-foot">
          <span>{hits.length.toLocaleString('pt-BR')} de {inTab.length.toLocaleString('pt-BR')} alertas {STATUS_LABEL[tab].toLowerCase()}s</span>
          <span className="dv-tools__sp" />
          <span className="al-foot"><kbd>↑</kbd><kbd>↓</kbd> percorrem a fila com o painel aberto</span>
        </footer>

        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para os selecionados">
            <span className="dv-bulk__n"><b>{selN}</b> {selN === 1 ? 'alerta' : 'alertas'}</span>
            <span className="dv-bulk__sep" />
            {tab === 'pendente' && <Button icon="check" onClick={() => act([...sel], { type: 'ack' })}>Reconhecer</Button>}
            {tab !== 'encerrado' && <Button icon="thumbDown" onClick={() => setBulkFp(true)}>Falso positivo</Button>}
            {tab === 'encerrado' && <Button icon="replay" onClick={() => act([...sel], { type: 'reopen' })}>Reabrir</Button>}
            <Button icon="download" onClick={() => exportCsv(groups.filter((g) => sel.has(g.key)))}>Exportar</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenKey(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(520px, 100%)' }}>
            <AlertDrawer key={open.key + (startForm ?? '')} g={open} startForm={startForm} onClip={() => setClip(open.head)} now={now} pos={[groups.findIndex((x) => x.key === open.key) + 1, groups.length]}
              onPrev={() => { const i = groups.findIndex((x) => x.key === open.key); if (i > 0) setOpenKey(groups[i - 1].key); }}
              onNext={() => { const i = groups.findIndex((x) => x.key === open.key); if (groups[i + 1]) setOpenKey(groups[i + 1].key); }}
              onClose={() => { setOpenKey(null); setStartForm(null); }} onAct={(a) => act([open.key], a)} toast={toast} />
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
                  <span className="dv-fmenu__n">{inTab.filter((a) => mineMatch(a) && textMatch(a) && fMatch(a, { ...f, [g.key]: [v] })).length.toLocaleString('pt-BR')}</span>
                </Checkbox>
              ))}
            </div>
            <div className="dv-fmenu__foot">
              <Button disabled={!f[g.key].length} onClick={() => setF((o) => ({ ...o, [g.key]: [] }))}>Limpar</Button>
              <Button variant="primary" onClick={() => setFilterBtn(null)}>Ver {hits.length.toLocaleString('pt-BR')}</Button>
            </div>
          </Menu>
        );
      })()}

      {rowMenu && (() => {
        const g = groups.find((x) => x.key === rowMenu.key);
        if (!g) return null;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir detalhes" onClick={close(() => setOpenKey(g.key))} />
            {tab !== 'encerrado' && <NavItem role="menuitem" icon="thumbDown" label="Falso positivo…" onClick={close(() => setFpKeys([g.key]))} />}
            {tab !== 'encerrado' && <NavItem role="menuitem" icon="forward" label="Encaminhar…" onClick={close(() => setFwdKey(g.key))} />}
            {tab !== 'encerrado' && <NavItem role="menuitem" icon="outcome" label="Encerrar com desfecho…" onClick={close(() => openWith(g.key, 'close'))} />}
            {g.head.kind !== 'camera' && <NavItem role="menuitem" icon="play" label="Ver clipe de 20 s" onClick={close(() => setClip(g.head))} />}
            {tab === 'encerrado' && <NavItem role="menuitem" icon="replay" label="Reabrir" onClick={close(() => act([g.key], { type: 'reopen' }))} />}
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="filter" label="Só esta câmera" onClick={close(() => { setF({ ...EMPTY, cam: [g.head.cam] }); setShowF(true); })} />
            <NavItem role="menuitem" icon="download" label="Exportar" onClick={close(() => exportCsv([g]))} />
          </Menu>
        );
      })()}

      {fpKeys && <FpDialog a={fpKeys.length === 1 ? groups.find((g) => g.key === fpKeys[0])?.head : undefined} n={groups.filter((g) => fpKeys.includes(g.key)).reduce((n, g) => n + g.items.length, 0)} onCancel={() => setFpKeys(null)} onConfirm={(reason, reeval, note) => { const k = fpKeys; setFpKeys(null); act(k, { type: 'fp', reason, reeval, note }); }} />}
      {fwdKey && (() => { const g = groups.find((x) => x.key === fwdKey); return g && <FwdDialog a={g.head} n={g.items.length} onCancel={() => setFwdKey(null)} onConfirm={(to, note) => { setFwdKey(null); act([g.key], { type: 'fwd', to, note }); }} />; })()}
      {clip && <ClipModal a={clip} onClose={() => setClip(null)} toast={toast} />}
      {bulkFp && <FpDialog n={selN} onCancel={() => { setBulkFp(false); }} onConfirm={(reason, reeval, note) => { setBulkFp(false); act([...sel], { type: 'fp', reason, reeval, note }); }} />}
    </div>
  );
}

/* ───────────── peças ───────────── */

function FpDialog({ a, n, onCancel, onConfirm }: { a?: Alert; n: number; onCancel: () => void; onConfirm: (reason: string, reeval: boolean, note: string) => void }) {
  const [reason, setReason] = useState(FP_REASONS[3]);
  const [reeval, setReeval] = useState(true);
  const [note, setNote] = useState('');
  const ok = note.trim().length > 0;
  return (
    <StatusModal type="warning" title={n === 1 ? 'Encerrar como falso positivo?' : `Encerrar ${n} alertas como falso positivo?`}
      description={<span className="al-fpd">
        <span>{n === 1 ? 'O alerta sai' : 'Os alertas saem'} da fila e {n === 1 ? 'vai' : 'vão'} para Encerrados com a causa e a justificativa abaixo.</span>
        {a && <AlertSum a={a} n={n} />}
        <span className="dv-field"><span className="dv-field__l">Causa-raiz do falso positivo</span>
          <Select label="Causa-raiz do falso positivo" value={reason} onChange={setReason} options={FP_REASONS.map((r) => ({ value: r, label: r }))} />
        </span>
        <Checkbox label="Enviar para reavaliação do modelo" checked={reeval} onChange={setReeval}><span>Enviar para reavaliação do modelo</span></Checkbox>
        <label className="dv-field"><span className="dv-field__l">Justificativa<i>*</i></span>
          <textarea className="nx-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que foi verificado e por que é falso positivo" />
        </label>
      </span>}
      confirm="Encerrar" confirmDisabled={!ok} onConfirm={() => ok && onConfirm(reason, reeval, note.trim())} onCancel={onCancel} />
  );
}

/** Resumo do alerta no topo dos modais de ação. */
function AlertSum({ a, n }: { a: Alert; n: number }) {
  return (
    <span className="al-sum">
      <span><i>Alerta</i><b>{title(a)}</b>{n > 1 && <em>{n} ocorrências</em>}</span>
      <span><i>Câmera</i><b>{camName(CAMS[a.cam])}</b></span>
    </span>
  );
}

function FwdDialog({ a, n, onCancel, onConfirm }: { a: Alert; n: number; onCancel: () => void; onConfirm: (to: string, note: string) => void }) {
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  return (
    <StatusModal type="information" title="Encaminhar alerta"
      description={<span className="al-fpd">
        <span>O alerta continua pendente, agora com responsável.</span>
        <AlertSum a={a} n={n} />
        <span className="dv-field"><span className="dv-field__l">Para<i>*</i></span>
          <Select label="Para" value={to} onChange={setTo} placeholder="Escolha quem recebe" options={USERS.filter((u) => u !== ME).map((u) => ({ value: u, label: u }))} />
        </span>
        <label className="dv-field"><span className="dv-field__l">Nota <span className="al-opt">opcional</span></span>
          <textarea className="nx-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que a pessoa precisa saber ou verificar" />
        </label>
      </span>}
      confirm="Encaminhar" confirmDisabled={!to} onConfirm={() => to && onConfirm(to, note.trim())} onCancel={onCancel} />
  );
}

function SoundBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  const t = useTooltip(on ? 'Desativar alerta sonoro' : 'Ativar alerta sonoro', undefined, true, 'bottom');
  return (
    <button type="button" className={`al-snd${on ? ' is-on' : ''}`} onClick={onClick} aria-pressed={on} aria-label="Alerta sonoro" {...t}>
      <Icon name={on ? 'sound' : 'soundOff'} size={18} />
    </button>
  );
}
function QA({ icon, label, onClick, className }: { icon: 'outcome' | 'thumbDown' | 'forward'; label: string; onClick: () => void; className?: string }) {
  return <IconButton icon={icon} label={label} onClick={onClick} tipPlace="top" className={className} />;
}

function Prio() {
  const t = useTooltip('Prioridade alta', undefined, true, 'top');
  return <span className="al-prio" {...t} />;
}
function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}
function CardBtn({ hint, ...rest }: { hint: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = useTooltip(hint, undefined, true, 'bottom');
  return <button type="button" {...tip} {...rest} />;
}


type Quick2 = 'close' | 'fp' | 'fwd' | 'reopen';
type RowProps = { g: Group; now: number; tab: Status; sel: boolean; open: boolean; fresh: boolean; onSel: (v: boolean) => void; onOpen: () => void; onAck: () => void; onQuick: (f: Quick2) => void; onClip: () => void; onMore: (el: HTMLElement) => void };
function Row({ g, now, tab, sel, open, fresh, onSel, onOpen, onAck, onQuick, onClip, onMore }: RowProps) {
  const a = g.head;
  const c = CAMS[a.cam];
  const n = g.items.length;
  const p = prioOf(a);
  const r = REASON[a.kind];
  return (
    <div role="row" tabIndex={0} aria-selected={sel}
      className={`dv-tr al-row is-${p}${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${fresh ? ' is-fresh' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter') onOpen(); if (e.key === ' ') { e.preventDefault(); onSel(!sel); } }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${title(a)}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell">
        <Thumb a={a} />
        <span className="dv-name">
          <b>
            {a.kind === 'placa' ? <span className="al-plate">{a.plate}</span> : <span className={a.kind === 'face' && !a.person ? 'al-noname' : undefined}>{target(a)}</span>}
            {n > 1 && <N n={n} sp={span(g.first, g.last)} />}
            {p === 'alta' && <Prio />}
          </b>
          <span>{targetSub(a)}</span>
        </span>
        {a.kind !== 'camera' && <ClipChip onClick={onClip} />}
      </span>
      <span className="dv-c al-c--reason" role="cell"><span className={`al-reason is-${r.tone}`}><Icon name={KIND[a.kind].icon} size={14} />{r.label}</span></span>
      <span className="dv-c al-c--cam" role="cell"><span className="dv-two"><b className={c.name ? undefined : 'al-noname'}>{camName(c)}</b></span></span>
      <span className="dv-c al-c--when" role="cell"><span className="dv-two"><b title={when(g.last, now)}>{ago(g.last, now)}</b></span></span>
      <span className="dv-c al-c--trail" role="cell">
        {tab === 'pendente' ? (a.fwdTo ? <span className="dv-two"><b>{a.fwdTo}</b><span>Encaminhado</span></span> : <span className="lc-none">—</span>)
          : tab === 'reconhecido' ? <span className="dv-two"><b>{a.ackBy}</b><span>{ago(a.ackAt!, now)}</span></span>
          : <span className="dv-two"><b>{a.outcome}</b><span>{a.closedBy} · {ago(a.closedAt!, now)}</span></span>}
      </span>
      <span className="dv-c dv-c--act al-acts-row" role="cell" onClick={(e) => e.stopPropagation()}>
        {tab !== 'encerrado' && <>
          <QA className="al-qa" icon="outcome" label="Encerrar com desfecho e justificativa" onClick={() => onQuick('close')} />
          <QA className="al-qa" icon="thumbDown" label="Falso positivo" onClick={() => onQuick('fp')} />
          <QA className="al-qa" icon="forward" label="Encaminhar" onClick={() => onQuick('fwd')} />
        </>}
        {tab === 'pendente' && <Button icon="check" className="al-ack" onClick={onAck}>{n > 1 ? `Reconhecer ${n}` : 'Reconhecer'}</Button>}
        {tab === 'encerrado' && <Button icon="replay" className="al-ack" onClick={() => onQuick('reopen')}>Reabrir</Button>}
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}

function N({ n, sp }: { n: number; sp: string }) {
  const t = useTooltip(`${n} ocorrências agrupadas ${sp}`, undefined, true, 'top');
  return <span className="al-n" {...t}>×{n}</span>;
}
