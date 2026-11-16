import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton } from '../../ds/components';
import { CAMS, camName, hms, type Alert } from './data';

const LEN = 20;
const mmss = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

/** Chip "Clipe 20 s" da linha. */
export function ClipChip({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="al-cchip" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label="Ver clipe de 20 segundos">
      <Icon name="play" size={10} />20 s
    </button>
  );
}

/** Player do clipe de 20 s (10 s antes e 10 s depois do evento). No protótipo é um placeholder animado. */
export function ClipModal({ a, onClose, toast }: { a: Alert; onClose: () => void; toast: (m: string) => void }) {
  const c = CAMS[a.cam];
  const [t, setT] = useState(0);
  const [play, setPlay] = useState(true);
  const raf = useRef(0);

  useEffect(() => {
    if (!play) return;
    let last = performance.now();
    const step = (now: number) => {
      setT((x) => { const n = x + (now - last) / 1000; if (n >= LEN) { setPlay(false); return LEN; } return n; });
      last = now;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [play]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === ' ') { e.preventDefault(); toggle(); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  });

  const toggle = () => { if (!play && t >= LEN) setT(0); setPlay((p) => !p); };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setT(Math.max(0, Math.min(LEN, ((e.clientX - r.left) / r.width) * LEN)));
  };

  return createPortal(
    <div className="al-cmodal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="al-cmodal__card" role="dialog" aria-modal="true" aria-label="Clipe de 20 segundos">
        <header className="al-cmodal__head">
          <div>
            <b>Clipe 20 s</b>
            <span>{camName(c)} · {c.local} · evento às {hms(a.at)}</span>
          </div>
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>
        <button type="button" className="al-clip is-player" onClick={toggle} aria-label={play ? 'Pausar' : 'Reproduzir'}>
          <span className="al-clip__grid" />
          {a.kind === 'placa' && <span className="al-plate is-lg">{a.plate}</span>}
          <span className="al-clip__ts">{hms(a.at - (10 - t) * 1000)}</span>
          {!play && <span className="al-clip__play"><Icon name="play" size={18} /></span>}
        </button>
        <div className="al-cbar">
          <IconButton icon={play ? 'pause' : 'play'} label={play ? 'Pausar' : 'Reproduzir'} shortcut="Espaço" onClick={toggle} tipPlace="top" />
          <div className="al-cbar__track" onClick={seek} role="slider" aria-label="Posição" aria-valuemin={0} aria-valuemax={LEN} aria-valuenow={Math.round(t)}>
            <i style={{ width: `${(t / LEN) * 100}%` }} />
            <span className="al-cbar__ev" title="Momento do alerta" />
          </div>
          <span className="al-cbar__t">{mmss(t)} / {mmss(LEN)}</span>
        </div>
        <footer className="al-cmodal__foot">
          <span>10 s antes e 10 s depois do alerta</span>
          <Button icon="download" onClick={() => toast('Download do clipe iniciado')}>Baixar</Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
