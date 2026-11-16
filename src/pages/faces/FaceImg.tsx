import { photoUrl } from './faceArt';

/** Recorte da face: foto gerada por IA com tratamento de câmera (P&B em câmeras noturnas). */
export function FaceImg({ seed, night, alt = '' }: { seed: number; night: boolean; alt?: string }) {
  return <img className={`fc-img${night ? ' is-night' : ''}`} src={photoUrl(seed)} alt={alt} loading="lazy" draggable={false} />;
}
