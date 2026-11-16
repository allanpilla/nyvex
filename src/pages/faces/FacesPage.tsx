import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, PageHeader, Segmented, useTooltip } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { FaceDrawer } from './FaceDrawer';
import { FaceImg } from './FaceImg';
import { FEED_MAX, initialFaces, KIND_LABEL, makeFace, rand, SOURCES, SRC, srcName, hms, type Face } from './data';
import '../mural/mural.css';
import '../devices/devices.css';
import './faces.css';

type Density = 'grande' | 'medio' | 'compacto';
type KindF = 'todas' | 'observacao' | 'watchlist';
const START = Date.now() - (3 * 86400e3 + 7 * 3600e3 + 12 * 60e3);

export function FacesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [faces, setFaces] = useState<Face[]>(() => initialFaces(Date.now()));
  const [density, setDensity] = useState<Density>('medio');
  const [kind, setKind] = useState<KindF>('todas');
  const [minDet, setMinDet] = useState(0);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const [queued, setQueued] = useState<Face[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [frames, setFrames] = useState(7168715);
  const [fps, setFps] = useState(4.0);
  const [now, setNow] = useState(Date.now());
  const wallRef = useRef<HTMLDivElement>(null);
  const facesRef = useRef(faces); facesRef.current = faces;
  const queuedRef = useRef(queued); queuedRef.current = queued;

  // Feed ao vivo: novas faces chegam em intervalos irregulares; pausado, elas ficam na fila.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const f = makeFace(Date.now(), rand, [...facesRef.current, ...queuedRef.current]);
      if (paused) setQueued((q) => [f, ...q].slice(0, FEED_MAX));
      else {
        setFaces((l) => [f, ...l].slice(0, FEED_MAX));
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
    setFaces((l) => [...queued, ...l].slice(0, FEED_MAX));
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
                <span>Volte para “Todas”, reduza a detecção mínima ou mostre todas as fontes.</span>
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
