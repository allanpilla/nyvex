import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton } from '../../ds/components';
import type { Cam } from './data';
import { sceneUrl } from './scene';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hms = (d: Date) => `${hm(d)}:${pad(d.getSeconds())}`;
const QUICK: [string, number][] = [['Últimos 15 min', 15], ['Última 1 h', 60], ['Últimas 6 h', 360], ['Últimas 24 h', 1440]];
const SPEEDS = [1, 2, 4, 8];

/** Gravações simuladas: trechos gravados com pequenas falhas e eventos de movimento. */
function fakeTimeline(from: number, to: number, seed: string) {
  let s = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 9);
  const r = () => ((s = (s * 1103515245 + 12345) | 0) >>> 0) / 4294967296;
  const span = to - from;
  const gaps: [number, number][] = [];
  for (let i = 0; i < 2; i++) { const a = 0.15 + r() * 0.7; gaps.push([a, a + 0.02 + r() * 0.04]); }
  const events = Array.from({ length: 6 }, () => 0.04 + r() * 0.92).sort();
  return { span, gaps, events };
}

type Props = { cam: Cam; onClose: () => void; toast: (m: string) => void };

/** Modal “Ver gravação”: escolhe o intervalo, busca e reproduz com linha do tempo. */
export function RecordingModal({ cam, onClose, toast }: Props) {
  const now = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => toLocal(new Date(now.getTime() - 60 * 60000)));
  const [to, setTo] = useState(() => toLocal(now));
  const [quick, setQuick] = useState<number | null>(60);
  const [loaded, setLoaded] = useState<{ from: number; to: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState(0); // 0..1
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onClose]);

  useEffect(() => {
    if (!playing || !loaded) return;
    const span = loaded.to - loaded.from;
    const t = setInterval(() => setPos((p) => { const n = p + (250 * speed) / span; if (n >= 1) { setPlaying(false); return 1; } return n; }), 250);
    return () => clearInterval(t);
  }, [playing, loaded, speed]);

  const tl = useMemo(() => (loaded ? fakeTimeline(loaded.from, loaded.to, cam.id) : null), [loaded, cam.id]);
  const at = loaded ? new Date(loaded.from + (loaded.to - loaded.from) * pos) : null;
  const inGap = tl ? tl.gaps.some(([a, b]) => pos >= a && pos <= b) : false;

  const search = () => {
    const f = new Date(from).getTime(), t = new Date(to).getTime();
    if (!(t > f)) return toast('O fim do intervalo precisa ser depois do início');
    setLoading(true); setPlaying(false);
    setTimeout(() => { setLoaded({ from: f, to: t }); setPos(0); setLoading(false); setPlaying(true); }, 600);
  };
  const pickQuick = (min: number) => { setQuick(min); setFrom(toLocal(new Date(now.getTime() - min * 60000))); setTo(toLocal(now)); };
  const seek = (e: React.MouseEvent) => { const r = barRef.current!.getBoundingClientRect(); setPos(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); };
  const jump = (sec: number) => loaded && setPos((p) => Math.min(1, Math.max(0, p + (sec * 1000) / (loaded.to - loaded.from))));

  return createPortal(
    <div className="mv-modal__back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mv-modal" role="dialog" aria-modal="true" aria-label={`Gravações de ${cam.name}`}>
        <header className="mv-modal__head">
          <span className="mv-modal__ic"><Icon name="replay" size={18} /></span>
          <div className="mv-modal__title">
            <b>{cam.name}</b>
            <span>Gravações · {cam.area}</span>
          </div>
          <IconButton icon="close" label="Fechar" tipPlace="bottom" onClick={onClose} />
        </header>

        <div className="mv-modal__bar">
          <label className="mv-dt"><span>De</span><input type="datetime-local" value={from} onChange={(e) => { setFrom(e.target.value); setQuick(null); }} /></label>
          <label className="mv-dt"><span>Até</span><input type="datetime-local" value={to} onChange={(e) => { setTo(e.target.value); setQuick(null); }} /></label>
          <div className="mv-quick">
            {QUICK.map(([l, m]) => (
              <button key={m} type="button" className={`mv-chip${quick === m ? ' is-on' : ''}`} onClick={() => pickQuick(m)}>{l}</button>
            ))}
          </div>
          <Button variant="primary" icon="search" onClick={search}>{loading ? 'Buscando…' : 'Buscar gravação'}</Button>
        </div>

        <div className="mv-modal__stage">
          {!loaded && !loading && (
            <div className="mv-modal__empty">
              <Icon name="replay" size={32} />
              <b>Escolha o intervalo e busque a gravação</b>
              <span>Use os atalhos (ex.: “Última 1 h”) ou defina data e hora de início e fim.</span>
            </div>
          )}
          {loading && <div className="mv-modal__empty"><span className="mv-spin" /><span>Buscando gravações…</span></div>}
          {loaded && !loading && at && (
            <>
              {inGap ? (
                <div className="mv-modal__empty"><Icon name="nosignal" size={28} /><b>Sem gravação neste trecho</b><span>A câmera ficou sem registro aqui. Avance para o próximo trecho gravado.</span></div>
              ) : (
                <img className="mv-modal__video" src={sceneUrl(cam)} alt="" />
              )}
              <span className="mv-pill is-rec mv-modal__pill"><Icon name="replay" size={14} />Gravação · {at.toLocaleDateString('pt-BR')} {hms(at)}</span>
            </>
          )}
        </div>

        {loaded && tl && (
          <div className="mv-modal__ctrl">
            <div className="mv-tl" ref={barRef} onMouseDown={seek} role="slider" aria-label="Linha do tempo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos * 100)} tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'ArrowRight') jump(10); if (e.key === 'ArrowLeft') jump(-10); }}>
              <div className="mv-tl__rec" />
              {tl.gaps.map(([a, b], i) => <div key={i} className="mv-tl__gap" style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }} />)}
              {tl.events.map((e, i) => (
                <button key={i} type="button" className="mv-tl__ev" style={{ left: `${e * 100}%` }} title="Movimento detectado" onMouseDown={(ev) => { ev.stopPropagation(); setPos(e); }} />
              ))}
              <div className="mv-tl__head" style={{ left: `${pos * 100}%` }} />
            </div>
            <div className="mv-tl__scale">
              <span>{hm(new Date(loaded.from))}</span>
              <span className="mv-tl__legend"><i className="is-rec" />Gravado<i className="is-gap" />Sem gravação<i className="is-ev" />Movimento</span>
              <span>{hm(new Date(loaded.to))}</span>
            </div>
            <div className="mv-modal__btns">
              <IconButton icon="arrowLeft" label="Voltar 10 s" tipPlace="top" onClick={() => jump(-10)} />
              <button type="button" className="mv-play" aria-label={playing ? 'Pausar' : 'Reproduzir'} onClick={() => { if (pos >= 1) setPos(0); setPlaying(!playing); }}>
                <Icon name={playing ? 'pause' : 'play'} size={18} />
              </button>
              <IconButton icon="arrowRight" label="Avançar 10 s" tipPlace="top" onClick={() => jump(10)} />
              <span className="mv-modal__time">{hms(at!)}</span>
              <div className="mv-speed" role="radiogroup" aria-label="Velocidade">
                {SPEEDS.map((s) => <button key={s} type="button" role="radio" aria-checked={speed === s} className={speed === s ? 'is-on' : ''} onClick={() => setSpeed(s)}>{s}×</button>)}
              </div>
              <span className="mv-grow" />
              <Button icon="snapshot" onClick={() => toast('Imagem do trecho salva')}>Capturar imagem</Button>
              <Button icon="external" onClick={() => toast('Exportar trecho: ação simulada no protótipo')}>Exportar trecho</Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
