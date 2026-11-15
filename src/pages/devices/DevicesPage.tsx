import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmDialog, Icon, IconButton, Kbd, Menu, NavItem, PageHeader, Segmented, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import {
  CONN_LABEL, DEVICES, DEV_LOCAIS, KIND_ICON, KIND_LABEL, LICENSES, SIT_LABEL, STREAM_LABEL,
  type Conn, type Device, type Kind, type Situacao,
} from './data';
import { DeviceDrawer } from './DeviceDrawer';
import { ago, ConnPill, copy, latTone, norm, SitBadge, sendToMural } from './parts';
import { DeviceForm } from './DeviceForm';
import './devices.css';

/* ───────────── filtros ───────────── */

type FKey = 'local' | 'situacao' | 'conn' | 'stream' | 'cert' | 'env';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { local: [], situacao: [], conn: [], stream: [], cert: [], env: [] };
const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
  { key: 'conn', label: 'Conexão', opts: [['online', 'Online'], ['instavel', 'Instável'], ['offline', 'Offline']] },
  { key: 'situacao', label: 'Situação', opts: [['ativo', 'Ativo'], ['manutencao', 'Em manutenção'], ['inativo', 'Inativo']] },
  { key: 'stream', label: 'Stream de vídeo', opts: [['live', 'Ao vivo'], ['sem', 'Sem vídeo']] },
  { key: 'cert', label: 'Integração', opts: [['sim', 'Certificado'], ['nao', 'Genérico (ONVIF/RTSP)']] },
  { key: 'env', label: 'Ambiente', opts: [['int', 'Interno'], ['ext', 'Externo']] },
  { key: 'local', label: 'Local', opts: DEV_LOCAIS.map((l) => [l, l]) },
];
const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;

function matches(d: Device, f: Filters) {
  const has = (k: FKey, v: string) => f[k].length === 0 || f[k].includes(v);
  return has('local', d.local) && has('situacao', d.situacao) && (f.conn.length === 0 || (d.situacao !== 'inativo' && f.conn.includes(d.conn)))
    && has('stream', d.stream) && has('cert', d.certified ? 'sim' : 'nao') && has('env', d.outdoor ? 'ext' : 'int');
}

/** Atalhos do resumo: cada cartão é um filtro de um clique. */
type Quick = 'all' | 'online' | 'instavel' | 'offline' | 'manutencao' | 'inativo';
const quickMatch = (q: Quick, d: Device) =>
  q === 'all' ? true : q === 'manutencao' || q === 'inativo' ? d.situacao === q : d.situacao !== 'inativo' && d.conn === q;

/* ───────────── ordenação ───────────── */

type SortKey = 'name' | 'local' | 'situacao' | 'conn' | 'stream' | 'latency';
const CONN_RANK: Record<Conn, number> = { offline: 0, instavel: 1, online: 2, na: 3 };
const SIT_RANK: Record<Situacao, number> = { manutencao: 0, ativo: 1, inativo: 2 };
function cmp(a: Device, b: Device, k: SortKey) {
  switch (k) {
    case 'name': return a.name.localeCompare(b.name, 'pt-BR');
    case 'local': return a.local.localeCompare(b.local, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR');
    case 'situacao': return SIT_RANK[a.situacao] - SIT_RANK[b.situacao];
    case 'conn': return (a.situacao === 'inativo' ? 3 : CONN_RANK[a.conn]) - (b.situacao === 'inativo' ? 3 : CONN_RANK[b.conn]);
    case 'stream': return a.stream.localeCompare(b.stream);
    case 'latency': return (a.latency ?? 1e6) - (b.latency ?? 1e6);
  }
}

/* ───────────── página ───────────── */

export function DevicesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const navigate = useNavigate();
  const [devs, setDevs] = useState<Device[]>(DEVICES);
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  // Por padrão, o que precisa de atenção aparece primeiro.
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'conn', dir: 1 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ edit?: Device } | null>(null);
  const [del, setDel] = useState<string[] | null>(null);
  const [filterBtn, setFilterBtn] = useState<HTMLElement | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; d: Device } | null>(null);
  const [refreshed, setRefreshed] = useState(() => Date.now());
  const [spin, setSpin] = useState(false);
  const [, tick] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { setPage(0); }, [kind, quick, q, f, size]);

  const inKind = useMemo(() => devs.filter((d) => kind === 'all' || d.kind === kind), [devs, kind]);
  const base = useMemo(() => {
    const nq = norm(q.trim());
    return inKind.filter((d) => matches(d, f) && (!nq || norm(`${d.name} ${d.ip} ${d.model} ${d.vendor} ${d.type} ${d.local} ${d.area}`).includes(nq)));
  }, [inKind, f, q]);
  const rows = useMemo(() => base.filter((d) => quickMatch(quick, d)).sort((a, b) => cmp(a, b, sort.k) * sort.dir || a.name.localeCompare(b.name, 'pt-BR')), [base, quick, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const pg = Math.min(page, pages - 1);
  const shown = rows.slice(pg * size, pg * size + size);

  const count = (qk: Quick) => base.filter((d) => quickMatch(qk, d)).length;
  const kindCount = (k: 'all' | Kind) => devs.filter((d) => k === 'all' || d.kind === k).length;
  const camsAll = devs.filter((d) => d.kind === 'camera' && d.situacao !== 'inativo');
  const camsLive = camsAll.filter((d) => d.stream === 'live').length;
  const licensed = devs.filter((d) => d.situacao !== 'inativo').length;
  const nFilters = Object.values(f).reduce((n, a) => n + a.length, 0);
  const anyFilter = nFilters > 0 || q.trim() !== '' || quick !== 'all';
  const open = openId ? devs.find((d) => d.id === openId) ?? null : null;
  // Mantém o conteúdo enquanto o painel fecha (animação).
  const lastOpen = useRef<Device | null>(null);
  if (open) lastOpen.current = open;
  const shownDrawer = open ?? lastOpen.current;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }));

  const update = (ids: string[], patch: Partial<Device> | ((d: Device) => Partial<Device>)) =>
    setDevs((list) => list.map((d) => (ids.includes(d.id) ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)));

  const setSituacao = (ids: string[], s: Situacao) => {
    update(ids, (d) => ({
      situacao: s,
      conn: s === 'inativo' ? 'na' : d.conn === 'na' ? 'online' : d.conn,
      hb: s === 'inativo' ? null : d.hb ?? 3,
      latency: s === 'inativo' ? null : d.latency ?? 20,
      note: s === 'manutencao' ? 'Em manutenção · alertas silenciados' : s === 'inativo' ? 'Desativado pelo operador' : undefined,
    }));
    const n = ids.length;
    toast(s === 'manutencao' ? `${n === 1 ? 'Dispositivo colocado' : `${n} dispositivos colocados`} em manutenção · alertas silenciados`
      : s === 'inativo' ? `${n === 1 ? 'Dispositivo desativado' : `${n} dispositivos desativados`}` : `${n === 1 ? 'Dispositivo reativado' : `${n} dispositivos reativados`}`);
  };
  const restart = (ids: string[]) => {
    const cams = devs.filter((d) => ids.includes(d.id) && d.kind === 'camera');
    if (!cams.length) { toast('Nenhuma câmera na seleção'); return; }
    toast(cams.length === 1 ? `Reiniciando stream de ${cams[0].name}…` : `Reiniciando ${cams.length} streams…`);
  };
  const refresh = () => {
    setSpin(true);
    setTimeout(() => {
      setDevs((list) => list.map((d) => (d.conn === 'online' && d.latency != null ? { ...d, latency: Math.max(4, Math.round(d.latency * (0.85 + Math.random() * 0.3))), hb: 1 + Math.floor(Math.random() * 8) } : d)));
      setRefreshed(Date.now());
      setSpin(false);
    }, 650);
  };
  const exportCsv = (list: Device[]) => {
    const head = ['Nome', 'Categoria', 'Tipo', 'Fabricante', 'Modelo', 'Local', 'IP', 'Situação', 'Conexão', 'Stream', 'Latência (ms)'];
    const lines = list.map((d) => [d.name, KIND_LABEL[d.kind], d.type, d.vendor, d.model, d.local, d.ip, SIT_LABEL[d.situacao], d.situacao === 'inativo' ? 'Não monitorado' : CONN_LABEL[d.conn], STREAM_LABEL[d.stream], d.latency ?? ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dispositivos.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`${list.length} dispositivos exportados (CSV)`);
  };
  const remove = (ids: string[]) => {
    setDevs((list) => list.filter((d) => !ids.includes(d.id)));
    setSel((s) => new Set([...s].filter((x) => !ids.includes(x))));
    if (openId && ids.includes(openId)) setOpenId(null);
    setDel(null);
    toast(ids.length === 1 ? 'Dispositivo excluído' : `${ids.length} dispositivos excluídos`);
  };
  const toMural = (d: Device) => { if (d.camId) { sendToMural(d.camId); navigate('/mural-de-video'); toast(`${d.name} no mural`); } };

  const allOnPage = shown.length > 0 && shown.every((d) => sel.has(d.id));
  const someOnPage = shown.some((d) => sel.has(d.id));
  const selList = devs.filter((d) => sel.has(d.id));

  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Total', icon: KIND_ICON[kind === 'all' ? 'camera' : kind], tone: 'neutral', hint: 'Todos os dispositivos cadastrados' },
    { k: 'online', label: 'Online', icon: 'signal', tone: 'ok', hint: 'Respondendo ao heartbeat' },
    { k: 'instavel', label: 'Instáveis', icon: 'activity', tone: 'warn', hint: 'Latência alta ou heartbeat atrasado' },
    { k: 'offline', label: 'Offline', icon: 'nosignal', tone: 'bad', hint: 'Sem resposta' },
    { k: 'manutencao', label: 'Em manutenção', icon: 'wrench', tone: 'maint', hint: 'Alertas silenciados' },
    { k: 'inativo', label: 'Inativos', icon: 'eyeOff', tone: 'neutral', hint: 'Fora do monitoramento' },
  ];

  return (
    <div className="dv">
      <div className="dv-main">
        <PageHeader
          title={screen.label}
          description="Inventário, conexão e saúde dos equipamentos"
          icon="dev"
          actions={
            <>
              <Button icon="pin" onClick={() => navigate('/locais')}>Locais</Button>
              <Button icon="tv" onClick={() => navigate('/mural-de-video')}>Mural de vídeo</Button>
              <Button icon="download" onClick={() => exportCsv(rows)}>Exportar</Button>
              <Button variant="primary" icon="plus" onClick={() => setForm({})}>Adicionar dispositivo</Button>
            </>
          }
        />

        <div className="dv-body">
          {/* Resumo: cada cartão filtra a tabela */}
          <section className="dv-sum" aria-label="Resumo">
            <div className="dv-cards" role="group" aria-label="Filtrar por estado">
              {cards.map((c) => {
                const n = count(c.k);
                const on = quick === c.k;
                return (
                  <button key={c.k} type="button" aria-pressed={on} title={c.hint}
                    className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${c.k === 'offline' && n > 0 ? ' is-alarm' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                    onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                    <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                    <b>{n}</b>
                  </button>
                );
              })}
            </div>
            <div className="dv-meters">
              <Meter label="Câmeras com vídeo" value={camsLive} total={camsAll.length} tone={camsLive < camsAll.length ? 'warn' : 'ok'}
                action={camsLive < camsAll.length ? { label: 'Ver sem vídeo', run: () => { setKind('camera'); setQuick('all'); setF({ ...EMPTY, stream: ['sem'] }); } } : undefined} />
              <Meter label="Licenças em uso" value={licensed} total={LICENSES} tone="info" />
            </div>
          </section>

          {/* Barra de ferramentas */}
          <div className="dv-tools">
            <Segmented
              label="Categoria"
              value={kind}
              onChange={(v) => { setKind(v); setSel(new Set()); }}
              options={(['all', 'camera', 'acesso', 'infra'] as const).map((k) => ({
                value: k,
                label: <>{k === 'all' ? 'Todos' : KIND_LABEL[k]}<span className="nx-seg__n">{kindCount(k)}</span></>,
              }))}
            />
            <label className="nx-input dv-search">
              <Icon name="search" size={16} />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, IP, modelo ou local" aria-label="Buscar dispositivos"
                onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
              {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : <Kbd>/</Kbd>}
            </label>
            <Button icon="filter" className={nFilters ? 'is-active' : undefined} aria-expanded={!!filterBtn} onClick={(e) => setFilterBtn(filterBtn ? null : e.currentTarget)}>
              Filtros{nFilters > 0 && <span className="dv-fcount">{nFilters}</span>}
            </Button>
            <span className="dv-tools__sp" />
            <span className="dv-upd" aria-live="polite">{spin ? 'Atualizando…' : `Atualizado ${ago((Date.now() - refreshed) / 1000)}`}</span>
            <IconButton icon="refresh" label="Atualizar status" className={spin ? 'is-spin' : undefined} onClick={refresh} tipPlace="bottom" />
          </div>

          {anyFilter && (
            <div className="dv-chips">
              <span className="dv-chips__n"><b>{rows.length}</b> de {inKind.length}</span>
              {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
              {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
              {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
              <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
            </div>
          )}

          {/* Tabela */}
          <div className="dv-table" role="table" aria-label="Dispositivos" aria-rowcount={rows.length}>
            <div className="dv-tr dv-th" role="row">
              <span className="dv-c dv-c--chk" role="columnheader">
                <Checkbox label="Selecionar página" checked={allOnPage} indeterminate={!allOnPage && someOnPage}
                  onChange={() => setSel((s) => { const n = new Set(s); shown.forEach((d) => (allOnPage ? n.delete(d.id) : n.add(d.id))); return n; })} />
              </span>
              <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Dispositivo</Th>
              <Th k="local" sort={sort} onSort={sortBy} cls="dv-c--local">Local</Th>
              <Th k="situacao" sort={sort} onSort={sortBy} cls="dv-c--sit">Situação</Th>
              <Th k="conn" sort={sort} onSort={sortBy} cls="dv-c--conn">Conexão</Th>
              <Th k="stream" sort={sort} onSort={sortBy} cls="dv-c--stream">Stream · IP</Th>
              <Th k="latency" sort={sort} onSort={sortBy} cls="dv-c--lat">Latência</Th>
              <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
            </div>

            {shown.map((d) => (
              <Row key={d.id} d={d} sel={sel.has(d.id)} open={openId === d.id}
                onSel={(v) => setSel((s) => { const n = new Set(s); if (v) n.add(d.id); else n.delete(d.id); return n; })}
                onOpen={() => setOpenId(openId === d.id ? null : d.id)}
                onMural={() => toMural(d)}
                onRestart={() => restart([d.id])}
                onTest={() => toast(`${d.name}: respondeu em ${d.latency ?? '—'} ms`)}
                onCopy={() => copy(d.ip, toast, 'IP copiado')}
                onMore={(el) => setRowMenu(rowMenu?.d.id === d.id ? null : { el, d })}
              />
            ))}

            {rows.length === 0 && (
              <div className="dv-empty">
                <span className="dv-empty__ic"><Icon name="search" /></span>
                <b>Nenhum dispositivo encontrado</b>
                <span>Revise a busca ou os filtros aplicados.</span>
                <Button onClick={clearAll}>Limpar filtros</Button>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com paginação */}
        <footer className="dv-foot">
          <span>{rows.length ? `${pg * size + 1}–${Math.min(rows.length, pg * size + size)} de ${rows.length}` : '0 dispositivos'}</span>
          <span className="dv-tools__sp" />
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
        </footer>

        {/* Ações em massa */}
        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para os selecionados">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionado' : 'selecionados'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="replay" onClick={() => restart([...sel])}>Reiniciar stream</Button>
            <Button icon="wrench" onClick={() => { setSituacao([...sel], 'manutencao'); setSel(new Set()); }}>Manutenção</Button>
            <Button icon="download" onClick={() => exportCsv(selList)}>Exportar</Button>
            <Button icon="trash" className="is-danger-ghost" onClick={() => setDel([...sel])}>Excluir</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      <div className={`dv-side${open ? ' is-open' : ''}`} {...({ inert: open ? undefined : '' } as object)}>
        {shownDrawer && (
          <DeviceDrawer key={shownDrawer.id} d={shownDrawer} onClose={() => setOpenId(null)}
            onMural={() => toMural(shownDrawer)}
            onRestart={() => restart([shownDrawer.id])}
            onEdit={() => setForm({ edit: shownDrawer })}
            onSituacao={(s) => setSituacao([shownDrawer.id], s)}
            onDelete={() => setDel([shownDrawer.id])}
          />
        )}
      </div>

      {filterBtn && (
        <Menu anchor={filterBtn} align="left" onClose={() => setFilterBtn(null)} className="dv-fmenu">
          <div className="dv-fmenu__body">
            {F_GROUPS.map((g) => (
              <div key={g.key} className="dv-fmenu__grp">
                <div className="nx-menu__title">{g.label}</div>
                {g.opts.map(([v, l]) => (
                  <Checkbox key={v} label={l} checked={f[g.key].includes(v)} onChange={() => toggleF(g.key, v)}>
                    <span className="dv-fmenu__l">{l}</span>
                    <span className="dv-fmenu__n">{inKind.filter((d) => matches(d, { ...f, [g.key]: [v] })).length}</span>
                  </Checkbox>
                ))}
              </div>
            ))}
          </div>
          <div className="dv-fmenu__foot">
            <Button disabled={!nFilters} onClick={() => setF(EMPTY)}>Limpar</Button>
            <Button variant="primary" onClick={() => setFilterBtn(null)}>Ver {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}</Button>
          </div>
        </Menu>
      )}

      {rowMenu && (
        <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
          {(() => {
            const d = devs.find((x) => x.id === rowMenu.d.id) ?? rowMenu.d;
            const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
            return (
              <>
                <NavItem role="menuitem" icon="panel" label="Ver detalhes" onClick={close(() => setOpenId(d.id))} />
                <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => setForm({ edit: d }))} />
                <NavItem role="menuitem" icon="copy" label="Copiar IP" onClick={close(() => copy(d.ip, toast, 'IP copiado'))} />
                {d.camId && <NavItem role="menuitem" icon="tv" label="Ver no mural" onClick={close(() => toMural(d))} />}
                <div className="nx-menu__sep" />
                {d.situacao === 'manutencao'
                  ? <NavItem role="menuitem" icon="check" label="Encerrar manutenção" onClick={close(() => setSituacao([d.id], 'ativo'))} />
                  : d.situacao === 'ativo' && <NavItem role="menuitem" icon="wrench" label="Colocar em manutenção" onClick={close(() => setSituacao([d.id], 'manutencao'))} />}
                {d.situacao === 'inativo'
                  ? <NavItem role="menuitem" icon="play" label="Reativar" onClick={close(() => setSituacao([d.id], 'ativo'))} />
                  : <NavItem role="menuitem" icon="eyeOff" label="Desativar" onClick={close(() => setSituacao([d.id], 'inativo'))} />}
                <NavItem role="menuitem" icon="trash" label="Excluir" className="is-danger" onClick={close(() => setDel([d.id]))} />
              </>
            );
          })()}
        </Menu>
      )}

      {form && (
        <DeviceForm
          edit={form.edit}
          existing={devs}
          onClose={() => setForm(null)}
          onSave={(d) => {
            setDevs((list) => (form.edit ? list.map((x) => (x.id === d.id ? d : x)) : [d, ...list]));
            setForm(null);
            setOpenId(d.id);
            if (!form.edit) { setKind('all'); clearAll(); setSort({ k: 'conn', dir: 1 }); }
            toast(form.edit ? 'Alterações salvas' : `${d.name} adicionado`);
          }}
        />
      )}

      {del && (
        <ConfirmDialog
          title={del.length === 1 ? 'Excluir dispositivo?' : `Excluir ${del.length} dispositivos?`}
          text={del.length === 1
            ? `“${devs.find((d) => d.id === del[0])?.name}” sai do inventário e deixa de ser monitorado. As gravações já feitas continuam disponíveis. Para só pausar, use “Desativar”.`
            : 'Os dispositivos saem do inventário e deixam de ser monitorados. As gravações já feitas continuam disponíveis. Para só pausar, use “Desativar”.'}
          confirm="Excluir"
          onConfirm={() => remove(del)}
          onCancel={() => setDel(null)}
        />
      )}
    </div>
  );
}

/* ───────────── peças da página ───────────── */

function Meter({ label, value, total, tone, action }: { label: string; value: number; total: number; tone: 'ok' | 'warn' | 'info'; action?: { label: string; run: () => void } }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="dv-meter">
      <div className="dv-meter__top">
        <span>{label}</span>
        {action && <button type="button" className="dv-link" onClick={action.run}>{action.label}</button>}
      </div>
      <div className="dv-meter__val"><b>{value}</b><span>/ {total}</span><em>{pct}%</em></div>
      <div className={`dv-meter__bar is-${tone}`} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="dv-chip">
      {children}
      <button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button>
    </span>
  );
}

function Th({ k, sort, onSort, cls, children }: { k: SortKey; sort: { k: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; cls: string; children: ReactNode }) {
  const on = sort.k === k;
  return (
    <span className={`dv-c ${cls}`} role="columnheader" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`dv-sort${on ? ' is-on' : ''}`} onClick={() => onSort(k)}>
        {children}
        <Icon name={on ? 'chevron' : 'sort'} size={14} className={on ? (sort.dir === 1 ? 'is-asc' : 'is-desc') : undefined} />
      </button>
    </span>
  );
}

type RowProps = {
  d: Device; sel: boolean; open: boolean;
  onSel: (v: boolean) => void; onOpen: () => void; onMural: () => void; onRestart: () => void; onTest: () => void; onCopy: () => void; onMore: (el: HTMLElement) => void;
};

function Row({ d, sel, open, onSel, onOpen, onMural, onRestart, onTest, onCopy, onMore }: RowProps) {
  const certTip = useTooltip(d.certified ? 'Integração certificada pela Nyvex' : 'Integração genérica (ONVIF/RTSP): recursos avançados podem não funcionar', undefined, true, 'top');
  const inactive = d.situacao === 'inativo';
  return (
    <div role="row" tabIndex={0} aria-selected={sel}
      className={`dv-tr${sel ? ' is-sel' : ''}${open ? ' is-open' : ''}${inactive ? ' is-inactive' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); onSel(!sel); } }}>
      <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${d.name}`} checked={sel} onChange={onSel} /></span>
      <span className="dv-c dv-c--name" role="cell">
        <span className={`dv-kind is-${d.kind}`}><Icon name={KIND_ICON[d.kind]} size={16} /></span>
        <span className="dv-name">
          <b title={d.name}>{d.name}</b>
          <span>{d.type} · {d.vendor === 'Genérico' ? '' : `${d.vendor} `}{d.model}
            <span className={`dv-cert${d.certified ? ' is-on' : ''}`} {...certTip}>{d.certified ? <Icon name="check" size={12} /> : null}{d.certified ? 'Certificado' : 'Genérico'}</span>
          </span>
        </span>
      </span>
      <span className="dv-c dv-c--local" role="cell"><span className="dv-two"><b>{d.local}</b><span>{d.area}</span></span></span>
      <span className="dv-c dv-c--sit" role="cell"><SitBadge s={d.situacao} /></span>
      <span className="dv-c dv-c--conn" role="cell">
        <span className="dv-two">
          <ConnPill d={d} />
          <span>{inactive ? '—' : d.conn === 'offline' ? `Visto ${ago(d.hb)}` : `Heartbeat ${ago(d.hb)}`}</span>
        </span>
      </span>
      <span className="dv-c dv-c--stream" role="cell">
        <span className="dv-two">
          {d.stream === 'live' ? <span className="dv-live"><Icon name="live" size={14} />Ao vivo</span>
            : d.stream === 'sem' ? <span className="dv-nolive"><Icon name="nosignal" size={14} />Sem vídeo</span>
              : <span className="dv-nostream">Sem stream</span>}
          <button type="button" className="dv-ip" onClick={(e) => { e.stopPropagation(); onCopy(); }} title="Copiar IP">{d.ip}<Icon name="copy" size={12} /></button>
        </span>
      </span>
      <span className={`dv-c dv-c--lat ${latTone(d.latency)}`} role="cell">{d.latency == null ? '—' : <><b>{d.latency}</b> ms</>}</span>
      <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
        {d.camId
          ? <>
              <IconButton icon="tv" label="Ver no mural" onClick={onMural} tipPlace="top" disabled={inactive} />
              <IconButton icon="replay" label="Reiniciar stream" onClick={onRestart} tipPlace="top" disabled={inactive} />
            </>
          : <IconButton icon="activity" label="Testar conexão" onClick={onTest} tipPlace="top" disabled={inactive} />}
        <IconButton icon="more" label="Mais ações" onClick={(e) => onMore(e.currentTarget)} tipPlace="top" />
      </span>
    </div>
  );
}
