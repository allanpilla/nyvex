import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, PageHeader, Segmented, Switch, useTooltip, useTooltipApi } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { FaceDrawer } from './FaceDrawer';
import { FaceImg } from './FaceImg';
import { initialFaces, KIND_LABEL, LOCAIS, makeFace, rand, SOURCES, SRC, srcName, STATUS_LABEL, hms, type Face, type SrcStatus } from './data';
import '../mural/mural.css';
import '../devices/devices.css';
import './faces.css';

type Density = 'grande' | 'medio' | 'compacto';
type KindF = 'todas' | 'observacao' | 'watchlist';
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const START = Date.now() - (3 * 86400e3 + 7 * 3600e3 + 12 * 60e3);

export function FacesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const { hide: hideTip } = useTooltipApi();
  const [faces, setFaces] = useState<Face[]>(() => initialFaces(Date.now()));
  const [density, setDensity] = useState<Density>('medio');
  const [kind, setKind] = useState<KindF>('todas');
  const [minDet, setMinDet] = useState(0);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const [queued, setQueued] = useState<Face[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [frames, setFrames] = useState(7168715);
  const [fps, setFps] = useState(4.0);
  const [now, setNow] = useState(Date.now());
  const wallRef = useRef<HTMLDivElement>(null);

  // Feed ao vivo: novas faces chegam em intervalos irregulares; pausado, elas ficam na fila.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const f = makeFace(Date.now(), rand);
      if (paused) setQueued((q) => [f, ...q]);
      else {
        setFaces((l) => [f, ...l].slice(0, 400));
        setFresh((s) => new Set(s).add(f.id));
        setTimeout(() => setFresh((s) => { const n = new Set(s); n.delete(f.id); return n; }), 1600);
      }
      t = setTimeout(tick, 2500 + rand() * 4500);
    };
    t = setTimeout(tick, 2500);
    return () => clearTimeout(t);
  }, [paused]);
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); setFrames((n) => n + 3 + Math.round(rand() * 3)); setFps(Math.round((3.4 + rand() * 1.2) * 10) / 10); }, 1000);
    return () => clearInterval(t);
  }, []);

  const resume = () => {
    setFaces((l) => [...queued, ...l].slice(0, 400));
    setFresh(new Set(queued.map((f) => f.id)));
    setTimeout(() => setFresh(new Set()), 1600);
    setQueued([]); setPaused(false);
    wallRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const bySrc = useMemo(() => faces.filter((f) => !off.has(f.src)), [faces, off]);
  const counts = { todas: bySrc.length, observacao: bySrc.filter((f) => f.kind === 'observacao').length, watchlist: bySrc.filter((f) => f.kind === 'watchlist').length };
  const shown = bySrc.filter((f) => (kind === 'todas' || f.kind === kind) && f.det >= minDet);
  const lastMin = faces.filter((f) => now - f.at < 60e3).length;
  const open = openId ? faces.find((f) => f.id === openId) ?? null : null;
  const activeSrc = SOURCES.filter((s) => s.status !== 'offline' && !off.has(s.id)).length;
  const up = now - START;
  const uptime = `${Math.floor(up / 86400e3)} d ${Math.floor((up % 86400e3) / 3600e3)} h`;

  const stats: [string, string, string?][] = [
    ['Backlog', '0'],
    ['Faces / min', String(lastMin)],
    ['Frames', frames.toLocaleString('pt-BR')],
    ['FPS', fps.toLocaleString('pt-BR', { minimumFractionDigits: 1 })],
    ['Frame médio', '142 ms'],
    ['Fontes ativas', `${activeSrc}/${SOURCES.length}`],
    ['Uptime', uptime],
  ];

  return (
    <div className="mv fc">
      <div className={`mv-side${panel ? ' is-open' : ''}`}>
        {panel ? (
          <SourcePanel faces={faces} off={off} setOff={setOff} onHide={() => { hideTip(); setPanel(false); }} />
        ) : (
          <aside className="mv-rail" aria-label="Fontes">
            <div className="mv-rail__head"><IconButton icon="panel" label="Mostrar fontes" onClick={() => setPanel(true)} /></div>
            <div className="mv-rail__group" aria-label="Fontes">
              <RailBtn label={`${SOURCES.length} fontes`} onClick={() => setPanel(true)}><Icon name="camera" size={16} /><b>{SOURCES.length}</b></RailBtn>
              <RailBtn label="Fontes que pedem atenção" onClick={() => setPanel(true)}><span className="mv-dot is-atencao" /><b>{SOURCES.filter((s) => s.status === 'atencao').length}</b></RailBtn>
            </div>
            <div className="mv-rail__sep" />
            <RailBtn label="Buscar fonte" onClick={() => setPanel(true)}><Icon name="search" size={18} /></RailBtn>
          </aside>
        )}
      </div>

      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="faces"
          description={`${shown.length} faces na tela · ${activeSrc} fontes no feed`}
          actions={
            <>
              <Segmented<Density> label="Tamanho das faces" value={density} onChange={setDensity} options={[
                { value: 'grande', label: 'Grande' }, { value: 'medio', label: 'Médio' }, { value: 'compacto', label: 'Compacto' },
              ]} />
              <Button icon={paused ? 'play' : 'pause'} className={paused ? 'is-active' : undefined} onClick={() => (paused ? resume() : setPaused(true))}>
                {paused ? `Retomar${queued.length ? ` (${queued.length})` : ''}` : 'Pausar feed'}
              </Button>
              <IconButton icon="expand" label="Tela cheia" tipPlace="bottom" onClick={() => wallRef.current?.parentElement?.requestFullscreen?.()} />
            </>
          }
        />

        <div className="fc-body">
          <div className="fc-stats" aria-label="Telemetria do reconhecimento">
            <span className={`mv-pill fc-live${paused ? ' is-paused' : ''}`}><i />{paused ? 'Pausado' : 'Ao vivo'}</span>
            {stats.map(([k, v]) => <span key={k} className="fc-stat"><b>{v}</b>{k}</span>)}
            <span className="dv-tools__sp" />
            <span className="fc-node"><Icon name="server" size={14} />Origem: nó GPU</span>
          </div>

          <div className="fc-bar">
            <Segmented<KindF> label="Mostrar" size="sm" value={kind} onChange={setKind} options={[
              { value: 'todas', label: <>Todas <span className="nx-seg__n">{counts.todas}</span></> },
              { value: 'observacao', label: <><i className="fc-sw is-observacao" />Em observação <span className="nx-seg__n">{counts.observacao}</span></> },
              { value: 'watchlist', label: <><i className="fc-sw is-watchlist" />Watchlist <span className="nx-seg__n">{counts.watchlist}</span></> },
            ]} />
            <label className="fc-min">
              Detecção mínima
              <select className="nx-select" value={minDet} onChange={(e) => setMinDet(Number(e.target.value))} aria-label="Detecção mínima">
                {[0, 70, 75, 80].map((n) => <option key={n} value={n}>{n ? `${n}%` : 'Qualquer'}</option>)}
              </select>
            </label>
            {off.size > 0 && <button type="button" className="dv-chip fc-offchip" onClick={() => setOff(new Set())}>{SOURCES.length - off.size} de {SOURCES.length} fontes<Icon name="close" size={12} /></button>}
            <span className="dv-tools__sp" />
            {paused && queued.length > 0 && <Button variant="primary" icon="arrowRight" className="fc-newbtn" onClick={resume}>{queued.length} {queued.length === 1 ? 'nova face' : 'novas faces'}</Button>}
          </div>

          <div className="fc-wall" ref={wallRef}>
            {shown.length ? (
              <div className={`fc-grid is-${density}`}>
                {shown.map((f) => <FaceCard key={f.id} f={f} fresh={fresh.has(f.id)} on={openId === f.id} onOpen={() => setOpenId(openId === f.id ? null : f.id)} />)}
              </div>
            ) : (
              <div className="mv-empty fc-empty">
                <Icon name="faces" size={28} />
                <b>Nenhuma face com esses filtros</b>
                <span>Volte para “Todas”, reduza a detecção mínima ou mostre mais fontes.</span>
                <Button onClick={() => { setKind('todas'); setMinDet(0); setOff(new Set()); }}>Limpar filtros</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <FaceDrawer key={open.id} f={open} all={faces} onOpen={setOpenId} onClose={() => setOpenId(null)} toast={toast}
              onOnlySource={() => { setOff(new Set(SOURCES.filter((s) => s.id !== open.src).map((s) => s.id))); setOpenId(null); toast(`Mostrando só ${srcName(SRC[open.src])}`); }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ───────────── card ───────────── */

function FaceCard({ f, fresh, on, onOpen }: { f: Face; fresh: boolean; on: boolean; onOpen: () => void }) {
  const s = SRC[f.src];
  const tip = useTooltip(f.kind === 'observacao' ? 'Pessoa não cadastrada · em observação' : f.kind === 'watchlist' ? `Match: ${f.match!.person} · ${f.match!.list}` : '', undefined, f.kind !== 'comum', 'top');
  return (
    <button type="button" className={`fc-card is-${f.kind}${fresh ? ' is-fresh' : ''}${on ? ' is-on' : ''}`} onClick={onOpen}
      aria-label={`${KIND_LABEL[f.kind]}, ${srcName(s)}, ${hms(f.at)}, detecção ${f.det}%`}>
      <FaceImg seed={f.seed} night={s.night} />
      <span className="fc-card__top">
        <span className="fc-det">{f.det.toLocaleString('pt-BR')}%</span>
        {f.kind !== 'comum' && (
          <span className={`fc-tag is-${f.kind}`} {...tip}>
            <Icon name={f.kind === 'watchlist' ? 'eye' : 'warn'} size={12} />
            <span className="fc-tag__l">{f.kind === 'watchlist' ? f.match!.person : 'Observação'}</span>
          </span>
        )}
      </span>
      <span className="fc-card__info">
        <b className={s.name ? undefined : 'is-id'}>{srcName(s)}</b>
        <span><time>{hms(f.at)}</time><em>#{f.track}</em></span>
      </span>
    </button>
  );
}

/* ───────────── painel de fontes (mesmo padrão do Mural) ───────────── */

function SourcePanel({ faces, off, setOff, onHide }: { faces: Face[]; off: Set<string>; setOff: (s: Set<string>) => void; onHide: () => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<SrcStatus | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const hour = Date.now() - 3600e3;
  const n1h = (id: string) => faces.filter((f) => f.src === id && f.at > hour).length;
  const list = SOURCES.filter((s) => (!status || s.status === status) && (!q || norm(`${srcName(s)} ${s.id} ${s.local}`).includes(norm(q))));
  const filtering = !!q || !!status;
  const toggle = (id: string, show: boolean) => { const n = new Set(off); if (show) n.delete(id); else n.add(id); setOff(n); };
  const solo = (id: string) => setOff(off.size === SOURCES.length - 1 && !off.has(id) ? new Set() : new Set(SOURCES.filter((s) => s.id !== id).map((s) => s.id)));

  return (
    <aside className="mv-panel" aria-label="Fontes">
      <div className="mv-panel__head">
        <div>
          <h2>Fontes</h2>
          <p>{SOURCES.length} fontes · {SOURCES.length - off.size} no feed</p>
        </div>
        <IconButton icon="panel" label="Ocultar fontes" tipPlace="bottom" onClick={onHide} />
      </div>
      <div className="mv-panel__tools">
        <label className="nx-input">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fonte, local ou ID" aria-label="Buscar fonte" />
          {q && <button type="button" className="mv-clear" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={16} /></button>}
        </label>
        <div className="mv-chips fc-chips" role="group" aria-label="Filtrar fontes">
          <button type="button" aria-pressed={!status} className={`mv-chip${!status ? ' is-on' : ''}`} onClick={() => setStatus(null)}>
            Todas<span className="mv-chip__n">{SOURCES.length}</span>
          </button>
          <button type="button" aria-pressed={status === 'atencao'} className={`mv-chip${status === 'atencao' ? ' is-on' : ''}`} onClick={() => setStatus(status === 'atencao' ? null : 'atencao')}>
            <span className="mv-dot is-atencao" />Atenção<span className="mv-chip__n">{SOURCES.filter((s) => s.status === 'atencao').length}</span>
          </button>
        </div>
      </div>
      <div className="mv-list">
        {LOCAIS.map((local) => {
          const items = list.filter((s) => s.local === local);
          if (!items.length) return null;
          const isOpen = filtering || !closed.has(local);
          const total = SOURCES.filter((s) => s.local === local);
          const shownN = total.filter((s) => !off.has(s.id)).length;
          return (
            <section key={local} className="mv-grp">
              <button type="button" className={`mv-grp__head${isOpen ? ' is-open' : ''}`} aria-expanded={isOpen}
                onClick={() => setClosed((p) => { const n = new Set(p); if (n.has(local)) n.delete(local); else n.add(local); return n; })}>
                <Icon name="chevron" size={16} className="mv-grp__chev" />
                <span className="mv-grp__name">{local}</span>
                <span className="mv-grp__n">{shownN < total.length ? `${shownN}/${total.length}` : total.length}</span>
              </button>
              {isOpen && items.map((s) => {
                const on = !off.has(s.id);
                const n = n1h(s.id);
                return (
                  <div key={s.id} role="button" tabIndex={0} className={`mv-row fc-srow${on ? ' is-on' : ''}`} onClick={() => toggle(s.id, !on)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s.id, !on); } }} aria-pressed={on}>
                    <span className={`mv-dot is-${s.status}`} aria-label={STATUS_LABEL[s.status]} />
                    <span className="mv-row__txt">
                      <b className={s.name ? undefined : 'is-id'}>{s.name ?? s.id.slice(0, 18) + '…'}</b>
                      {s.status === 'offline' ? <span className="is-offline">Sem sinal · sem novas faces</span>
                        : s.status === 'atencao' ? <span className="is-atencao">FPS baixo · {n} na última hora</span>
                          : <span className="fc-srow__n">{n ? `${n} ${n === 1 ? 'face' : 'faces'} na última hora` : 'Nenhuma face na última hora'}</span>}
                    </span>
                    <span className="fc-srow__end" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon="filter" label="Ver só esta fonte" tipPlace="top" className="fc-solo" onClick={() => solo(s.id)} />
                      <Switch size="sm" checked={on} label={`${on ? 'Ocultar' : 'Mostrar'} ${srcName(s)} no feed`} onChange={(v) => toggle(s.id, v)} />
                    </span>
                  </div>
                );
              })}
            </section>
          );
        })}
        {list.length === 0 && <div className="mv-empty"><b>Nenhuma fonte encontrada</b><span>Tente outro nome ou limpe os filtros.</span></div>}
      </div>
      <div className="mv-panel__foot">
        <div className="mv-panel__acts fc-acts">
          <Button icon="check" disabled={off.size === 0} onClick={() => setOff(new Set())}>Mostrar todas</Button>
          <Button icon="eyeOff" disabled={off.size === SOURCES.length} onClick={() => setOff(new Set(SOURCES.map((s) => s.id)))}>Desmarcar todas</Button>
        </div>
        <span className="mv-panel__hint fc-hint">{SOURCES.filter((s) => !s.name).length} fontes sem nome: cadastre-as em Dispositivos.</span>
      </div>
    </aside>
  );
}

function RailBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  const tip = useTooltip(label);
  return <button type="button" className="mv-rail__btn" aria-label={label} {...tip} onClick={onClick}>{children}</button>;
}
