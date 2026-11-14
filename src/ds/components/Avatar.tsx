type Props = { initials: string; online?: boolean };

export function Avatar({ initials, online }: Props) {
  return <span className={`nx-avatar${online ? ' nx-avatar--online' : ''}`}>{initials}</span>;
}
