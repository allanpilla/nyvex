import { useState } from 'react';
import { faceUrl, photoUrl } from './faceArt';

/** Recorte da face: foto gerada por IA com tratamento de câmera (P&B em câmeras noturnas). */
export function FaceImg({ seed, night, alt = '' }: { seed: number; night: boolean; alt?: string }) {
  const [fail, setFail] = useState(false);
  return (
    <img className={`fc-img${night ? ' is-night' : ''}${fail ? ' is-art' : ''}`} src={fail ? faceUrl(seed, night) : photoUrl(seed)} alt={alt}
      loading="lazy" draggable={false} onError={() => setFail(true)} />
  );
}
