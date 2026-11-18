import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconButton, PageHeader } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { FaceDrawer } from './FaceDrawer';
import { FaceImg } from './FaceImg';
import { FEED_MAX, initialFaces, makeFace, rand, SRC, srcName, hms, type Face } from './data';
import '../mural/mural.css';
import '../devices/devices.css';
import './faces.css';

/** Faces ao vivo, versão enxuta: só a grade de recortes chegando em tempo real. Detalhes ficam no painel ao clicar. */
export function FacesPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [faces, setFaces] = useState<Face[]>(() => initialFaces(Date.now()));
  const [paused, setPaused] = useState(false);
  const [queued, setQueued] = useState<Face[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
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

  const resume = () => {
    setFaces((l) => [...queued, ...l].slice(0, FEED_MAX));
    setFresh(new Set(queued.map((f) => f.id)));
    setTimeout(() => setFresh(new Set()), 1600);
    setQueued([]); setPaused(false);
    wallRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const open = openId ? faces.find((f) => f.id === openId) ?? null : null;

  return (
    <div className="mv fc">
      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="faces"
          actions={
            <>
              <Button icon={paused ? 'play' : 'pause'} className={paused ? 'is-active' : undefined} onClick={() => (paused ? resume() : setPaused(true))}>
                {paused ? 'Retomar' : 'Pausar'}
              </Button>
              <IconButton icon="expand" label="Tela cheia" tipPlace="bottom" onClick={() => wallRef.current?.requestFullscreen?.()} />
            </>
          }
        />

        <div className="fc-body">
          <div className="fc-wall" ref={wallRef}>
            <div className="fc-grid">
              {faces.map((f) => <FaceCard key={f.id} f={f} fresh={fresh.has(f.id)} on={openId === f.id} onOpen={() => setOpenId(openId === f.id ? null : f.id)} />)}
            </div>
          </div>
        </div>
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <FaceDrawer key={open.id} f={open} all={faces} onOpen={setOpenId} onClose={() => setOpenId(null)} toast={toast} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ───────────── card: só o recorte ───────────── */

function FaceCard({ f, fresh, on, onOpen }: { f: Face; fresh: boolean; on: boolean; onOpen: () => void }) {
  const s = SRC[f.src];
  return (
    <button type="button" className={`fc-card${fresh ? ' is-fresh' : ''}${on ? ' is-on' : ''}`} onClick={onOpen}
      aria-label={`Face capturada em ${srcName(s)} às ${hms(f.at)}`}>
      <FaceImg seed={f.seed} night={s.night} />
    </button>
  );
}
