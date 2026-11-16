import { Icon } from '../../ds/components';
import { FaceImg } from '../faces/FaceImg';
import { KIND, type Alert } from './data';

export function Thumb({ a, lg }: { a: Alert; lg?: boolean }) {
  if (a.kind === 'face' && a.seed != null) return <span className={`al-thumb is-face${lg ? ' is-lg' : ''}`}><FaceImg seed={a.seed} night={false} /></span>;
  return <span className={`al-thumb${lg ? ' is-lg' : ''}`}><Icon name={KIND[a.kind].icon} size={lg ? 20 : 16} /></span>;
}
