import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, NavItem, PageHeader, Segmented, Switch, useTooltip, useTooltipApi } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import { useUi } from '../../lib/useUi';
import { storage } from '../../lib/storage';
import type { Screen } from '../../navigation';
import { CAMS, CAM_BY_ID, DEFAULT_MURAL, LAYOUTS, LOCAIS, PRESETS, STATUS_LABEL, type Cam, type CamStatus, type LayoutId } from './data';
import { sceneUrl } from './scene';
import { RecordingModal } from './RecordingModal';
import './mural.css';

type Slot = string | null;
type Tab = 'todas' | 'fav';
const PATROL_MS = 10000;
const DT = 'text/nx-cam';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const shortName = (c: Cam) => c.name.slice(c.local.length + 3);
const readJson = <T,>(k: string, fb: T): T => {
  try { const v = storage.get(k); return v ? (JSON.parse(v) as T) : fb; } catch { return fb; }
};
const trim = (m: Slot[]) => { const a = [...m]; while (a.length && a[a.length - 1] == null) a.pop(); return a; };
const fmt = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

/** Menu suspenso preso a um botão. */
function Menu({ anchor, onClose, align = 'right', children }: { anchor: HTMLElement; onClose: () => void; align?: 'left' | 'right'; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const r = anchor.getBoundingClientRect();
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [anchor, onClose]);
  const style = align === 'right' ? { top: r.bottom + 6, right: window.innerWidth - r.right } : { top: r.bottom + 6, left: r.left };
  return createPortal(<div ref={ref} className="nx-menu" role="menu" style={style}>{children}</div>, document.body);
}

/* ───────────── Painel lateral de câmeras ───────────── */

type PanelProps = {
  mural: Slot[];
  favs: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  onLocate: (id: string) => void;
  onHide: () => void;
  freeSlots: number;
  onAutofill: (ids: string[]) => void;
  onClear: () => void;
  init?: PanelInit;
};
type PanelInit = { tab?: Tab; status?: CamStatus | null; focus?: boolean };

function CamPanel({ mural, favs, onToggle, onLocate, onHide, freeSlots, onAutofill, onClear, init }: PanelProps) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>(init?.tab ?? 'todas');
  const [status, setStatus] = useState<CamStatus | null>(init?.status ?? null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const inMural = useMemo(() => new Set(mural.filter(Boolean) as string[]), [mural]);

  const counts = useMemo(() => {
    const c = { online: 0, atencao: 0, offline: 0 } as Record<CamStatus, number>;
    CAMS.forEach((x) => c[x.status]++);
    return c;
  }, []);

  const list = CAMS.filter((c) => {
    if (tab === 'fav' && !favs.has(c.id)) return false;
    if (status && c.status !== status) return false;
    if (q && !norm(`${c.name} ${c.area}`).includes(norm(q))) return false;
    return true;
  });
  const filtering = !!q || !!status || tab !== 'todas';
  const fillable = list.filter((c) => !inMural.has(c.id) && c.status !== 'offline').map((c) => c.id);

  return (
    <aside className="mv-panel" aria-label="Câmeras">
      <div className="mv-panel__head">
        <div>
          <h2>Câmeras</h2>
          <p>{CAMS.length} no inventário · {inMural.size} no mural</p>
        </div>
        <IconButton icon="panel" label="Ocultar lista de câmeras" tipPlace="bottom" onClick={onHide} />
      </div>

      <div className="mv-panel__tools">
        <label className="nx-input">
          <Icon name="search" size={16} />
          <input autoFocus={!!init?.focus} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar câmera ou local" aria-label="Buscar câmera ou local" />
          {q && <button type="button" className="mv-clear" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={16} /></button>}
        </label>
        <Segmented<Tab>
          label="Mostrar"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'todas', label: <>Todas <span className="nx-seg__n">{CAMS.length}</span></> },
            { value: 'fav', label: <>Favoritas <span className="nx-seg__n">{favs.size}</span></> },
          ]}
        />
        <div className="mv-chips" role="group" aria-label="Filtrar por situação">
          {(['online', 'atencao', 'offline'] as CamStatus[]).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} className={`mv-chip${status === s ? ' is-on' : ''}`} onClick={() => setStatus(status === s ? null : s)}>
              <span className={`mv-dot is-${s}`} />
              {STATUS_LABEL[s]}
              <span className="mv-chip__n">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mv-list">
        {LOCAIS.map((local) => {
          const items = list.filter((c) => c.local === local);
          if (!items.length) return null;
          const open = filtering || !closed.has(local);
          const on = CAMS.filter((c) => c.local === local && inMural.has(c.id)).length;
          const total = CAMS.filter((c) => c.local === local).length;
          return (
            <section key={local} className="mv-grp">
              <button
                type="button"
                className={`mv-grp__head${open ? ' is-open' : ''}`}
                aria-expanded={open}
                onClick={() => setClosed((p) => { const n = new Set(p); if (n.has(local)) n.delete(local); else n.add(local); return n; })}
              >
                <Icon name="chevron" size={16} className="mv-grp__chev" />
                <span className="mv-grp__name">{local}</span>
                <span className="mv-grp__n">{on > 0 ? `${on}/${total}` : total}</span>
              </button>
              {open && items.map((c) => {
                const active = inMural.has(c.id);
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    draggable
                    className={`mv-row${active ? ' is-on' : ''}`}
                    onDragStart={(e) => { e.dataTransfer.setData(DT, c.id); e.dataTransfer.effectAllowed = 'copyMove'; }}
                    onClick={() => (active ? onLocate(c.id) : onToggle(c.id, true))}
                    onKeyDown={(e) => { if (e.key === 'Enter') (active ? onLocate(c.id) : onToggle(c.id, true)); }}
                    title={active ? 'Clique para localizar no mural · arraste para trocar de posição' : 'Clique para adicionar · arraste para uma posição do mural'}
                  >
                    <Icon name="drag" size={14} className="mv-row__grip" />
                    <span className={`mv-dot is-${c.status}`} aria-label={STATUS_LABEL[c.status]} />
                    <span className="mv-row__txt">
                      <b>{shortName(c)}</b>
                      {c.note && <span className={`is-${c.status}`}>{c.note}</span>}
                    </span>
                    {favs.has(c.id) && <Icon name="starFill" size={14} className="mv-row__fav" />}
                    <Switch size="sm" checked={active} label={`${active ? 'Remover' : 'Adicionar'} ${c.name} ${active ? 'do' : 'ao'} mural`} onChange={(v) => onToggle(c.id, v)} />
                  </div>
                );
              })}
            </section>
          );
        })}
        {list.length === 0 && (
          <div className="mv-empty">
            <b>Nenhuma câmera encontrada</b>
            <span>Tente outro nome ou limpe os filtros.</span>
          </div>
        )}
      </div>

      <div className="mv-panel__foot">
        <div className="mv-panel__acts">
          <Button
            icon="flash"
            disabled={freeSlots === 0 || fillable.length === 0}
            title={freeSlots === 0 ? 'Não há posições livres no mural' : 'Preenche as posições livres com as câmeras da lista (respeita busca e filtros)'}
            onClick={() => onAutofill(fillable)}
          >
            Preencher mural{freeSlots > 0 && fillable.length > 0 ? ` (${Math.min(freeSlots, fillable.length)})` : ''}
          </Button>
          <Button icon="eraser" disabled={inMural.size === 0} onClick={onClear}>Limpar</Button>
        </div>
      </div>
    </aside>
  );
}

/* ───────────── Câmera no mural ───────────── */

type TileProps = {
  cam: Cam;
  idx: number;
  now: Date;
  fav: boolean;
  flash: boolean;
  big?: boolean;
  expanded?: boolean;
  onFav: () => void;
  onRec: () => void;
  onExpand: () => void;
  onRemove: () => void;
  onDropCam: (id: string, idx: number) => void;
  toast: (m: string) => void;
};

function TileAction({ icon, label, onClick, on }: { icon: IconName; label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; on?: boolean }) {
  return <IconButton icon={icon} label={label} tipPlace="bottom" className={`mv-act${on ? ' is-on' : ''}`} onClick={(e) => { e.stopPropagation(); onClick(e); }} />;
}

const SPEEDS = [0.5, 1, 2, 4];
const WINDOW = 30 * 60000; // linha do tempo do slot: últimos 30 min
const CLIPS: [string, number][] = [['Últimos 30 segundos', 30], ['Último 1 minuto', 60], ['Últimos 5 minutos', 300]];
const stop = { onMouseDown: (e: React.MouseEvent) => e.stopPropagation(), onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(), onDragStart: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); } };

/** Barra de controles dentro do slot: reprodução (modo híbrido) e PTZ digital. */
function SlotBar({ hyb, zoom, now, onHyb, onZoom, onLive, onClose, onSave }: {
  hyb: Hyb | null; zoom: number; now: Date;
  onHyb: (h: Hyb) => void; onZoom: (z: number) => void; onLive: () => void; onClose: () => void; onSave: () => void;
}) {
  const end = now.getTime();
  const z = (d: number) => onZoom(Math.min(4, Math.max(1, Math.round((zoom + d) * 2) / 2)));
  return (
    <div className={`mv-sbar${hyb ? ' is-hyb' : ''}`} {...stop} draggable={false}>
      {hyb && (
        <>
          <div className="mv-sbar__scrub">
            <input type="range" min={end - WINDOW} max={end} step={1000} value={hyb.t} aria-label="Posição na gravação"
              style={{ '--p': `${((hyb.t - (end - WINDOW)) / WINDOW) * 100}%` } as React.CSSProperties}
              onChange={(e) => onHyb({ ...hyb, t: +e.target.value })} />
            <span>{fmt(new Date(end - WINDOW)).slice(0, 5)}</span><span>agora</span>
          </div>
          <IconButton icon="arrowLeft" label="Voltar 10 s" tipPlace="top" className="mv-sbtn is-opt" onClick={() => onHyb({ ...hyb, t: Math.max(end - WINDOW, hyb.t - 10000) })} />
          <button type="button" className="mv-sbtn mv-sbtn--play" aria-label={hyb.playing ? 'Pausar' : 'Reproduzir'} onClick={() => onHyb({ ...hyb, playing: !hyb.playing })}>
            <Icon name={hyb.playing ? 'pause' : 'play'} size={18} />
          </button>
          <IconButton icon="arrowRight" label="Avançar 10 s" tipPlace="top" className="mv-sbtn is-opt" onClick={() => onHyb({ ...hyb, t: Math.min(end, hyb.t + 10000) })} />
          <button type="button" className="mv-sbtn mv-sbtn--txt" title="Velocidade de reprodução" onClick={() => onHyb({ ...hyb, speed: SPEEDS[(SPEEDS.indexOf(hyb.speed) + 1) % SPEEDS.length] })}>
            {hyb.speed.toFixed(1)}x
          </button>
          <span className="mv-sbar__sep" />
        </>
      )}
      <span className="mv-sbar__lbl">PTZ digital</span>
      <IconButton icon="zoomOut" label="Afastar" tipPlace="top" className="mv-sbtn" disabled={zoom <= 1} onClick={() => z(-0.5)} />
      <span className="mv-sbar__val">{zoom.toFixed(1)}x</span>
      <IconButton icon="zoomIn" label="Aproximar" tipPlace="top" className="mv-sbtn" disabled={zoom >= 4} onClick={() => z(0.5)} />
      <span className="mv-grow" />
      {hyb ? (
        <>
          <button type="button" className="mv-sbtn mv-sbtn--save" onClick={onSave}><Icon name="scissors" size={16} /><span>Salvar trecho</span></button>
          <button type="button" className="mv-sbtn mv-sbtn--live" onClick={onLive}><i /><span>Ao vivo</span></button>
        </>
      ) : (
        <IconButton icon="close" label="Fechar PTZ digital" tipPlace="top" className="mv-sbtn" onClick={onClose} />
      )}
    </div>
  );
}

type Hyb = { t: number; playing: boolean; speed: number };

function Tile({ cam, idx, now, fav, flash, big, expanded, onFav, onRec, onExpand, onRemove, onDropCam, toast }: TileProps) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [clip, setClip] = useState<HTMLElement | null>(null);
  const [over, setOver] = useState(false);
  const [hyb, setHyb] = useState<Hyb | null>(null);
  const [ptz, setPtz] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { hide } = useTooltipApi();
  const off = cam.status === 'offline';
  const bar = !off && (!!hyb || ptz);

  // Reprodução da gravação dentro do slot.
  useEffect(() => {
    if (!hyb?.playing) return;
    const t = setInterval(() => setHyb((h) => {
      if (!h) return h;
      const n = h.t + 250 * h.speed;
      return n >= Date.now() ? { ...h, t: Date.now(), playing: false } : { ...h, t: n };
    }), 250);
    return () => clearInterval(t);
  }, [hyb?.playing]);

  const toggleHyb = () => { hide(); setHyb(hyb ? null : { t: Date.now() - 5 * 60000, playing: true, speed: 1 }); };
  const saveClip = (sec: number) => toast(`Trecho de ${sec < 60 ? `${sec} s` : `${sec / 60} min`} de ${cam.name} salvo em Exportações`);

  return (
    <div
      className={`mv-tile${big ? ' is-big' : ''}${expanded ? ' is-expanded' : ''}${flash ? ' is-flash' : ''}${over ? ' is-over' : ''}${menu || clip ? ' is-menu' : ''}${bar ? ' has-bar' : ''}${hyb ? ' is-hyb' : ''}`}
      draggable={!expanded}
      onDragStart={(e) => { e.dataTransfer.setData(DT, cam.id); e.dataTransfer.effectAllowed = 'move'; hide(); }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DT)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData(DT); if (id && id !== cam.id) onDropCam(id, idx); }}
      onDoubleClick={onExpand}
      tabIndex={0}
      aria-label={`${cam.name}, ${hyb ? 'gravação' : STATUS_LABEL[cam.status]}`}
    >
      {off ? (
        <div className="mv-tile__off">
          <Icon name="nosignal" size={28} />
          <b>Sem sinal</b>
          <span>{cam.note?.replace('Sem sinal ', 'Último sinal ')}</span>
          <Button onClick={(e) => { e.stopPropagation(); toast(`Reconectando ${cam.name}…`); }}>Tentar reconectar</Button>
        </div>
      ) : (
        <img className="mv-tile__img" src={sceneUrl(cam)} alt="" draggable={false} style={zoom > 1 ? { transform: `scale(${zoom})` } : undefined} />
      )}

      <div className="mv-tile__top">
        {off ? (
          <span className="mv-pill is-offline"><Icon name="nosignal" size={14} />Sem sinal</span>
        ) : hyb ? (
          <span className="mv-pill is-rec"><Icon name="film" size={14} />Gravação · {fmt(new Date(hyb.t))}{hyb.speed !== 1 && ` · ${hyb.speed}x`}</span>
        ) : cam.status === 'atencao' ? (
          <span className="mv-pill is-atencao" title={cam.note}><Icon name="warn" size={14} />Saúde degradada</span>
        ) : (
          <span className="mv-pill is-live"><i />Ao vivo</span>
        )}
        <div className="mv-tools" onDoubleClick={(e) => e.stopPropagation()}>
          <TileAction icon={fav ? 'starFill' : 'star'} label={fav ? 'Remover dos favoritos' : 'Favoritar'} on={fav} onClick={onFav} />
          {!off && <TileAction icon="film" label={hyb ? 'Voltar ao vivo' : 'Modo híbrido: tocar gravação no slot'} on={!!hyb} onClick={toggleHyb} />}
          {!off && <TileAction icon="replay" label="Histórico de gravações" onClick={onRec} />}
          {!off && <TileAction icon="scissors" label="Salvar trecho" on={!!clip} onClick={(e) => { hide(); setClip(clip ? null : e.currentTarget); }} />}
          {!off && <TileAction icon="snapshot" label="Capturar imagem" onClick={() => toast(`Imagem de ${cam.name} salva`)} />}
          <TileAction icon={expanded ? 'collapse' : 'expand'} label={expanded ? 'Voltar ao mural' : 'Ampliar'} onClick={onExpand} />
          <TileAction icon="more" label="Mais ações" on={!!menu} onClick={(e) => { hide(); setMenu(menu ? null : e.currentTarget); }} />
          {!expanded && <span className="mv-tools__sep" />}
          {!expanded && <TileAction icon="close" label="Remover do mural" onClick={onRemove} />}
        </div>
      </div>

      <div className="mv-tile__info">
        <div className="mv-tile__name">
          <b>{cam.name}</b>
          <span>{cam.area}</span>
        </div>
        {!off && !hyb && <time>{fmt(now)}</time>}
      </div>

      {bar && (
        <SlotBar hyb={hyb} zoom={zoom} now={now} onHyb={setHyb} onZoom={setZoom}
          onLive={() => setHyb(null)} onClose={() => { setPtz(false); setZoom(1); }} onSave={() => saveClip(60)} />
      )}

      {clip && (
        <Menu anchor={clip} onClose={() => setClip(null)}>
          <div className="nx-menu__title">Salvar trecho {hyb ? 'da gravação' : 'recente'}</div>
          {CLIPS.map(([l, sec]) => (
            <NavItem key={l} role="menuitem" icon="scissors" label={l} onClick={() => { setClip(null); saveClip(sec); }} />
          ))}
          <div className="nx-menu__sep" />
          <NavItem role="menuitem" icon="calendar" label="Escolher intervalo…" onClick={() => { setClip(null); onRec(); }} />
        </Menu>
      )}

      {menu && (
        <Menu anchor={menu} onClose={() => setMenu(null)}>
          <NavItem role="menuitem" icon="zoomIn" label={ptz || hyb ? 'PTZ digital (ativo)' : 'PTZ digital (zoom)'} onClick={() => { setMenu(null); if (!off) setPtz(true); else toast('Câmera sem sinal'); }} />
          {([
            ['external', 'Abrir em nova janela'],
            ['share', 'Compartilhar câmera'],
            ['sliders', 'Ajustes de imagem'],
            ['alert', 'Ver eventos desta câmera'],
            ['flash', 'Disparar ação'],
          ] as [IconName, string][]).map(([ic, l]) => (
            <NavItem key={l} role="menuitem" icon={ic} label={l} onClick={() => { setMenu(null); toast(`${l}: ação simulada no protótipo`); }} />
          ))}
        </Menu>
      )}
    </div>
  );
}

/** Posição vazia: clique abre um seletor rápido; também aceita câmera arrastada. */
function EmptySlot({ idx, big, mural, onPick }: { idx: number; big?: boolean; mural: Slot[]; onPick: (id: string, idx: number) => void }) {
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inMural = new Set(mural);
  const opts = CAMS.filter((c) => !inMural.has(c.id) && (!q || norm(`${c.name} ${c.area}`).includes(norm(q)))).slice(0, 6);

  return (
    <div
      ref={ref}
      className={`mv-slot${big ? ' is-big' : ''}${over ? ' is-over' : ''}${picking ? ' is-picking' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DT)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData(DT); if (id) onPick(id, idx); }}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) { setPicking(false); setQ(''); } }}
    >
      {picking ? (
        <div className="mv-pick" onKeyDown={(e) => { if (e.key === 'Escape') { setPicking(false); setQ(''); } }}>
          <label className="nx-input">
            <Icon name="search" size={16} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qual câmera?" aria-label="Buscar câmera para esta posição"
              onKeyDown={(e) => { if (e.key === 'Enter' && opts[0]) onPick(opts[0].id, idx); }} />
          </label>
          <div className="mv-pick__list">
            {opts.map((c) => (
              <button key={c.id} type="button" className="mv-pick__opt" onClick={() => onPick(c.id, idx)}>
                <span className={`mv-dot is-${c.status}`} />
                <span>{c.name}</span>
              </button>
            ))}
            {opts.length === 0 && <span className="mv-pick__none">Nenhuma câmera disponível</span>}
          </div>
        </div>
      ) : (
        <button type="button" className="mv-slot__btn" onClick={() => setPicking(true)}>
          <span className="mv-slot__plus"><Icon name="plus" /></span>
          <b>Adicionar câmera</b>
          <span>Clique para escolher ou arraste da lista</span>
        </button>
      )}
    </div>
  );
}

/* ───────────── Tela ───────────── */

export function MuralPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const now = useNow();
  const [layout, setLayout] = useState<LayoutId>(() => readJson<LayoutId>('nx-mural-layout', '9'));
  const [mural, setMural] = useState<Slot[]>(() => readJson<Slot[]>('nx-mural', DEFAULT_MURAL).filter((x) => x == null || CAM_BY_ID[x]));
  const [favs, setFavs] = useState<Set<string>>(() => new Set(readJson<string[]>('nx-mural-favs', ['bloco-04-externa', 'portarias-portaria-1', 'bloco-08-porta'])));
  const [recCam, setRecCam] = useState<string | null>(null);
  const [grid, setGrid] = useState<{ c: number; r: number }>(() => readJson('nx-mural-grid', { c: 5, r: 4 }));
  const [gridBtn, setGridBtn] = useState<HTMLElement | null>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState(() => !window.matchMedia('(max-width: 900px)').matches);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [patrol, setPatrol] = useState(false);
  const [presetBtn, setPresetBtn] = useState<HTMLElement | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const { hide: hideTip } = useTooltipApi();

  const L = layout === 'custom' ? { id: 'custom' as LayoutId, label: `${grid.c}×${grid.r}`, cols: grid.c, slots: grid.c * grid.r } : LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[2];
  const N = L.slots;
  const [view, setView] = useState<{ status?: CamStatus; fav?: boolean } | null>(null);
  const [searchBtn, setSearchBtn] = useState<HTMLElement | null>(null);
  const viewIds: Slot[] | null = view ? CAMS.filter((c) => (view.fav ? favs.has(c.id) : c.status === view.status)).map((c) => c.id) : null;
  const source: Slot[] = viewIds ?? mural;
  const pages = Math.max(1, Math.ceil(source.length / N));
  const cur = Math.min(page, pages - 1);
  const count = mural.filter(Boolean).length;
  const online = CAMS.filter((c) => c.status === 'online').length;

  useEffect(() => { storage.set('nx-mural', JSON.stringify(mural)); }, [mural]);
  useEffect(() => { storage.set('nx-mural-layout', JSON.stringify(layout)); }, [layout]);
  useEffect(() => { storage.set('nx-mural-favs', JSON.stringify([...favs])); }, [favs]);
  useEffect(() => { storage.set('nx-mural-grid', JSON.stringify(grid)); }, [grid]);

  useEffect(() => {
    if (!patrol) return;
    const t = setInterval(() => setPage((p) => (Math.min(p, pages - 1) + 1) % pages), PATROL_MS);
    return () => clearInterval(t);
  }, [patrol, pages]);

  useEffect(() => {
    if (!expanded) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(null);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [expanded]);

  const locate = useCallback((id: string) => {
    const i = mural.indexOf(id);
    if (i < 0) return;
    setPage(Math.floor(i / N));
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1400);
  }, [mural, N]);

  const add = (id: string) => {
    if (mural.includes(id)) return locate(id);
    const m = [...mural];
    let i = -1;
    for (let j = cur * N; j < cur * N + N; j++) if (m[j] == null) { i = j; break; }
    if (i < 0) i = m.findIndex((x) => x == null);
    if (i < 0) i = m.length;
    while (m.length < i) m.push(null);
    m[i] = id;
    setMural(m);
    setPage(Math.floor(i / N));
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1400);
  };

  const remove = (id: string) => {
    setMural((m) => trim(m.map((x) => (x === id ? null : x))));
    if (expanded === id) setExpanded(null);
  };

  const placeAt = (id: string, idx: number) => {
    const m = [...mural];
    while (m.length <= idx) m.push(null);
    const from = m.indexOf(id);
    const prev = m[idx];
    if (from >= 0) { m[from] = prev; m[idx] = id; }
    else {
      m[idx] = id;
      if (prev) toast(`${CAM_BY_ID[id].name} substituiu ${CAM_BY_ID[prev].name}`);
    }
    setMural(trim(m));
  };

  const freeSlots = slotsFree();
  function slotsFree() { let n = 0; for (let j = cur * N; j < cur * N + N; j++) if (mural[j] == null) n++; return n; }
  const autofill = (ids: string[]) => {
    const m = [...mural];
    let k = 0;
    for (let j = cur * N; j < cur * N + N && k < ids.length; j++) if (m[j] == null) { while (m.length < j) m.push(null); m[j] = ids[k++]; }
    setMural(trim(m));
    toast(`${k} ${k === 1 ? 'câmera adicionada' : 'câmeras adicionadas'} ao mural`);
  };
  const [confirmClear, setConfirmClear] = useState(false);
  const [panelInit, setPanelInit] = useState<PanelInit | undefined>();
  const openPanel = (init?: PanelInit) => { hideTip(); setPanelInit(init); setPanel(true); };
  const clearWall = () => { setMural([]); setPage(0); setExpanded(null); setConfirmClear(false); toast('Mural limpo'); };

  const changeLayout = (id: LayoutId) => {
    setLayout(id);
    setMural((m) => m.filter(Boolean));
    setPage(0);
    setExpanded(null);
  };

  const slots: Slot[] = Array.from({ length: N }, (_, i) => source[cur * N + i] ?? null);
  const toggleView = (v: { status?: CamStatus; fav?: boolean }) => { setPage(0); setExpanded(null); setView((cv) => (cv && cv.status === v.status && !!cv.fav === !!v.fav ? null : v)); };
  const tileProps = (c: Cam, idx: number) => ({
    cam: c,
    idx,
    now,
    fav: favs.has(c.id),
    flash: flash === c.id,
    onFav: () => setFavs((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }),
    onRec: () => setRecCam(c.id),
    onRemove: () => remove(c.id),
    onDropCam: placeAt,
    toast,
  });

  return (
    <div className="mv">
      {panel ? (
        <CamPanel
          mural={mural}
          favs={favs}
          onToggle={(id, on) => (on ? add(id) : remove(id))}
          onLocate={locate}
          onHide={() => { hideTip(); setPanel(false); }}
          freeSlots={freeSlots}
          onAutofill={autofill}
          onClear={() => setConfirmClear(true)}
          init={panelInit}
        />
      ) : (
        <aside className="mv-rail" aria-label="Câmeras">
          <div className="mv-rail__head">
            <IconButton icon="panel" label="Mostrar lista de câmeras" onClick={() => openPanel()} />
          </div>
          <div className="mv-rail__group" aria-label="Situação das câmeras">
            {(['online', 'atencao', 'offline'] as CamStatus[]).map((st) => (
              <RailBtn key={st} on={view?.status === st} label={view?.status === st ? 'Voltar ao mural' : `Mostrar câmeras: ${STATUS_LABEL[st]}`} onClick={() => toggleView({ status: st })}>
                <span className={`mv-dot is-${st}`} />
                <b>{CAMS.filter((c) => c.status === st).length}</b>
              </RailBtn>
            ))}
          </div>
          <div className="mv-rail__sep" />
          <RailBtn on={!!searchBtn} label="Buscar câmera" onClick={(el) => setSearchBtn(searchBtn ? null : el)}><Icon name="search" size={18} /></RailBtn>
          <RailBtn on={!!view?.fav} label={view?.fav ? 'Voltar ao mural' : `Mostrar favoritas (${favs.size})`} onClick={() => toggleView({ fav: true })}><Icon name={view?.fav ? 'starFill' : 'star'} size={18} /></RailBtn>
        </aside>
      )}
      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="tv"
          description={`${count} ${count === 1 ? 'câmera' : 'câmeras'} no mural · ${online} de ${CAMS.length} online`}
          actions={
            <>
              <div ref={segRef} className="mv-layout">
                <Segmented<LayoutId>
                  label="Layout do mural"
                  value={layout}
                  onChange={(v) => {
                    if (v === 'custom') { setGridBtn(segRef.current!.querySelector<HTMLElement>('.nx-seg__opt:last-child')); return; }
                    changeLayout(v);
                  }}
                  options={[
                    ...LAYOUTS.map((l) => ({ value: l.id, label: <LayoutGlyph id={l.id} />, title: l.id === 'destaque' ? 'Destaque (1 grande + 5)' : `Grade ${l.label}` })),
                    { value: 'custom' as LayoutId, label: <><Icon name="sliders" size={14} />{layout === 'custom' ? `${grid.c}×${grid.r}` : 'Personalizar'}</>, title: 'Grade personalizada (colunas × linhas)' },
                  ]}
                />
              </div>
              <div className="mv-pager" aria-label="Páginas do mural">
                <IconButton icon="arrowLeft" label="Página anterior" tipPlace="bottom" disabled={pages < 2} onClick={() => setPage((cur - 1 + pages) % pages)} />
                <span title={`Página ${cur + 1} de ${pages}`}><b>{cur + 1}</b> / {pages}</span>
                <IconButton icon="arrowRight" label="Próxima página" tipPlace="bottom" disabled={pages < 2} onClick={() => setPage((cur + 1) % pages)} />
              </div>
              <Button icon={patrol ? 'pause' : 'play'} className={patrol ? 'is-active' : undefined} onClick={() => {
                if (!patrol && pages < 2) return toast('A patrulha alterna páginas: adicione mais câmeras ou use um layout menor');
                setPatrol(!patrol);
              }}>
                {patrol ? 'Pausar patrulha' : 'Patrulha'}
              </Button>
              <Button icon="bookmark" onClick={(e) => setPresetBtn(presetBtn ? null : e.currentTarget)}>Presets</Button>
              <IconButton icon="expand" label="Tela cheia" tipPlace="bottom" onClick={() => wallRef.current?.requestFullscreen?.()} />
            </>
          }
        />
        {presetBtn && (
          <Menu anchor={presetBtn} onClose={() => setPresetBtn(null)}>
            <div className="nx-menu__title">Presets salvos</div>
            {PRESETS.map((p) => (
              <NavItem key={p.id} role="menuitem" icon="grid" label={p.name} trailing={<span className="nx-count">{p.cams.length}</span>} onClick={() => {
                setLayout(p.layout); setMural(p.cams); setPage(0); setExpanded(null); setPresetBtn(null); toast(`Preset “${p.name}” aplicado`);
              }} />
            ))}
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="plus" label="Salvar mural atual como preset" onClick={() => { setPresetBtn(null); toast('Salvar preset: ação simulada no protótipo'); }} />
          </Menu>
        )}

        <div className="mv-wall" ref={wallRef}>
          {patrol && <div key={cur} className="mv-patrol" style={{ animationDuration: `${PATROL_MS}ms` }} />}
          {view && (
            <div className="mv-viewbar">
              {view.fav ? <Icon name="starFill" size={16} className="mv-viewbar__star" /> : <span className={`mv-dot is-${view.status}`} />}
              <span>
                Mostrando <b>{viewIds!.length} {viewIds!.length === 1 ? 'câmera' : 'câmeras'} {view.fav ? (viewIds!.length === 1 ? 'favorita' : 'favoritas') : `· ${STATUS_LABEL[view.status!]}`}</b> do inventário. O mural salvo não muda.
              </span>
              <Button icon="close" onClick={() => { setView(null); setPage(0); }}>Voltar ao mural</Button>
            </div>
          )}
          <div className={`mv-grid mv-grid--${layout}${L.cols >= 4 ? ' is-dense' : ''}`} style={{ ['--cols' as string]: L.cols, ['--rows' as string]: Math.ceil((layout === 'destaque' ? 9 : N) / L.cols) }}>
            {slots.map((id, i) => {
              const idx = cur * N + i;
              const big = layout === 'destaque' && i === 0;
              const c = id ? CAM_BY_ID[id] : null;
              return c ? (
                <Tile key={c.id} {...tileProps(c, idx)} {...(view ? { onDropCam: () => {} } : {})} big={big} onExpand={() => setExpanded(c.id)} />
              ) : view ? (
                <div key={`b${idx}`} className={`mv-blank${big ? ' is-big' : ''}`} />
              ) : (
                <EmptySlot key={`e${idx}`} idx={idx} big={big} mural={mural} onPick={placeAt} />
              );
            })}
          </div>
          {expanded && CAM_BY_ID[expanded] && (
            <div className="mv-zoom">
              <Tile {...tileProps(CAM_BY_ID[expanded], mural.indexOf(expanded))} expanded onExpand={() => setExpanded(null)} />
            </div>
          )}
        </div>
      </div>
      {searchBtn && (
        <SearchPop
          anchor={searchBtn}
          mural={mural}
          onClose={() => setSearchBtn(null)}
          onToggle={(id, on) => (on ? add(id) : remove(id))}
          onLocate={(id) => { setView(null); locate(id); }}
        />
      )}
      {confirmClear && (
        <ConfirmDialog
          title="Limpar o mural?"
          text={`${count} ${count === 1 ? 'câmera sai' : 'câmeras saem'} do mural. O layout e os presets salvos continuam como estão.`}
          confirm="Limpar mural"
          onConfirm={clearWall}
          onCancel={() => setConfirmClear(false)}
        />
      )}
      {recCam && CAM_BY_ID[recCam] && <RecordingModal cam={CAM_BY_ID[recCam]} onClose={() => setRecCam(null)} toast={toast} />}
      {gridBtn && (
        <Menu anchor={gridBtn} onClose={() => setGridBtn(null)}>
          <CustomGrid
            initial={grid}
            onApply={(g) => { setGrid(g); setGridBtn(null); changeLayout('custom'); }}
            onClose={() => setGridBtn(null)}
          />
        </Menu>
      )}
    </div>
  );
}

function RailBtn({ label, onClick, on, children }: { label: string; onClick: (el: HTMLElement) => void; on?: boolean; children: React.ReactNode }) {
  const tip = useTooltip(label);
  const { hide } = useTooltipApi();
  return <button type="button" className={`mv-rail__btn${on ? ' is-on' : ''}`} aria-label={label} aria-pressed={on} {...tip} onClick={(e) => { hide(); onClick(e.currentTarget); }}>{children}</button>;
}

/** Busca flutuante ao lado da faixa recolhida. */
function SearchPop({ anchor, mural, onClose, onToggle, onLocate }: { anchor: HTMLElement; mural: Slot[]; onClose: () => void; onToggle: (id: string, on: boolean) => void; onLocate: (id: string) => void }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const r = anchor.getBoundingClientRect();
  const inMural = new Set(mural.filter(Boolean) as string[]);
  const res = CAMS.filter((c) => !q || norm(`${c.name} ${c.area}`).includes(norm(q))).slice(0, 8);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [anchor, onClose]);
  return createPortal(
    <div ref={ref} className="mv-spop" style={{ left: r.right + 8, top: Math.max(8, Math.min(r.top - 8, window.innerHeight - 420)) }} role="dialog" aria-label="Buscar câmera">
      <label className="nx-input">
        <Icon name="search" size={16} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar câmera ou local" aria-label="Buscar câmera ou local"
          onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) (inMural.has(res[0].id) ? onLocate(res[0].id) : onToggle(res[0].id, true)); }} />
      </label>
      <div className="mv-spop__list">
        {res.map((c) => {
          const on = inMural.has(c.id);
          return (
            <div key={c.id} role="button" tabIndex={0} className={`mv-row${on ? ' is-on' : ''}`} onClick={() => (on ? onLocate(c.id) : onToggle(c.id, true))}>
              <span className={`mv-dot is-${c.status}`} />
              <span className="mv-row__txt"><b>{c.name}</b>{c.note ? <span className={`is-${c.status}`}>{c.note}</span> : <span className="mv-spop__area">{c.area}</span>}</span>
              <Switch size="sm" checked={on} label={`${on ? 'Remover' : 'Adicionar'} ${c.name}`} onChange={(v) => onToggle(c.id, v)} />
            </div>
          );
        })}
        {res.length === 0 && <div className="mv-empty"><b>Nenhuma câmera encontrada</b><span>Tente outro nome ou local.</span></div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmação para ações que não dá para desfazer. */
function ConfirmDialog({ title, text, confirm, onConfirm, onCancel }: { title: string; text: string; confirm: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onCancel]);
  return createPortal(
    <div className="mv-modal__back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="mv-confirm" role="alertdialog" aria-modal="true" aria-labelledby="mv-confirm-t">
        <span className="mv-confirm__ic"><Icon name="eraser" size={20} /></span>
        <h2 id="mv-confirm-t">{title}</h2>
        <p>{text}</p>
        <div className="mv-confirm__btns">
          <Button autoFocus onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" className="is-danger" onClick={onConfirm}>{confirm}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const GRID_SHORTCUTS: [number, number][] = [[5, 4], [6, 4], [6, 5], [7, 5], [8, 4], [10, 5], [10, 10]];

/** Grade personalizada: colunas × linhas, com atalhos comuns de videowall. */
function CustomGrid({ initial, onApply, onClose }: { initial: { c: number; r: number }; onApply: (g: { c: number; r: number }) => void; onClose: () => void }) {
  const [c, setC] = useState(initial.c);
  const [r, setR] = useState(initial.r);
  const clamp = (n: number) => Math.max(1, Math.min(12, n));
  const Step = ({ label, v, set }: { label: string; v: number; set: (n: number) => void }) => (
    <div className="mv-cg__step">
      <span>{label}</span>
      <div>
        <IconButton icon="arrowLeft" label={`Menos ${label.toLowerCase()}`} tipPlace="bottom" onClick={() => set(clamp(v - 1))} />
        <b>{v}</b>
        <IconButton icon="arrowRight" label={`Mais ${label.toLowerCase()}`} tipPlace="bottom" onClick={() => set(clamp(v + 1))} />
      </div>
    </div>
  );
  return (
    <div className="mv-cg">
      <div className="mv-cg__head">
        <b>Grade personalizada</b>
        <IconButton icon="close" label="Fechar" tipPlace="bottom" onClick={onClose} />
      </div>
      <p>Defina colunas e linhas para montar o mosaico.</p>
      <div className="mv-cg__row">
        <Step label="Colunas" v={c} set={setC} />
        <Step label="Linhas" v={r} set={setR} />
      </div>
      <div className="mv-cg__total"><span>Total</span><b>{c * r} câmeras ao mesmo tempo</b></div>
      <div className="mv-cg__sc">
        <span>Atalhos de videowall</span>
        <div>
          {GRID_SHORTCUTS.map(([sc, sr]) => (
            <button key={`${sc}x${sr}`} type="button" className={`mv-chip${sc === c && sr === r ? ' is-on' : ''}`} onClick={() => { setC(sc); setR(sr); }}>
              {sc}×{sr} <span className="mv-chip__n">{sc * sr}</span>
            </button>
          ))}
        </div>
      </div>
      <Button variant="primary" icon="check" onClick={() => onApply({ c, r })}>Aplicar grade</Button>
    </div>
  );
}

function LayoutGlyph({ id }: { id: LayoutId }) {
  const cells: [number, number, number, number][] =
    id === '1' ? [[0, 0, 12, 12]]
    : id === '4' ? [[0, 0, 5.5, 5.5], [6.5, 0, 5.5, 5.5], [0, 6.5, 5.5, 5.5], [6.5, 6.5, 5.5, 5.5]]
    : id === '9' ? [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => [c * 4.2, r * 4.2, 3.6, 3.6] as [number, number, number, number]))
    : id === '16' ? [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => [c * 3.15, r * 3.15, 2.6, 2.6] as [number, number, number, number]))
    : [[0, 0, 7.8, 7.8], [8.4, 0, 3.6, 3.6], [8.4, 4.2, 3.6, 3.6], [0, 8.4, 3.6, 3.6], [4.2, 8.4, 3.6, 3.6], [8.4, 8.4, 3.6, 3.6]];
  return (
    <svg className="mv-glyph" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      {cells.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="0.8" fill="currentColor" />)}
    </svg>
  );
}
