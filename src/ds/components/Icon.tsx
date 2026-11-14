import { icons, type IconName } from '../icons/icons';

type Props = { name: IconName; size?: number | null; className?: string };

/** Ícone do DS. Herda a cor do texto (currentColor). */
export function Icon({ name, size = 20, className }: Props) {
  return (
    <span
      className={['nx-icon', className].filter(Boolean).join(' ')}
      style={size == null ? undefined : { width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
