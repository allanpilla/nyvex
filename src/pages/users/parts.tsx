import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton } from '../../ds/components';
import { MODULES, PERM_TOTAL, type Role } from './data';

/* Peças compartilhadas pelas telas de usuários e papéis. */

export function RoleTag({ role, plain }: { role: Role; plain?: boolean }) {
  return (
    <span className={`us-role is-${role.tone}${plain ? ' is-plain' : ''}`}>
      <i />{role.label}
    </span>
  );
}

/** Quantas permissões de cada módulo o papel libera. */
export function ModuleBars({ perms, compact }: { perms: string[]; compact?: boolean }) {
  return (
    <ul className={`us-mods${compact ? ' is-compact' : ''}`}>
      {MODULES.map((m) => {
        const n = m.perms.filter((p) => perms.includes(p.key)).length;
        return (
          <li key={m.id} className={n === 0 ? 'is-zero' : undefined}>
            <Icon name={m.icon} size={14} />
            <span className="us-mods__l">{m.label}</span>
            <span className="us-mods__bar"><i style={{ width: `${(n / m.perms.length) * 100}%` }} /></span>
            <em>{n}/{m.perms.length}</em>
          </li>
        );
      })}
    </ul>
  );
}

export const permCount = (perms: string[]) => `${perms.length} de ${PERM_TOTAL} permissões`;

/** Senha temporária: aparece uma vez só, com cópia. */
export function PasswordModal({ name, email, pw, onClose }: { name: string; email: string; pw: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onClose]);
  const copy = () => { navigator.clipboard?.writeText(pw).catch(() => {}); setCopied(true); };
  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="us-pw" role="dialog" aria-modal="true" aria-labelledby="us-pw-t">
        <header>
          <span className="us-pw__ic"><Icon name="successFill" size={20} /></span>
          <div>
            <h2 id="us-pw-t">Senha temporária de {name.split(' ')[0]}</h2>
            <p>Copie agora e entregue por um canal seguro. Ela não aparece de novo, e {email} vai precisar trocá-la no primeiro acesso.</p>
          </div>
          <IconButton icon="close" label="Fechar" onClick={onClose} tipPlace="bottom" />
        </header>
        <div className="us-pw__box">
          <code>{pw}</code>
          <Button icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? 'Copiada' : 'Copiar'}</Button>
        </div>
        <footer><Button variant="primary" onClick={onClose}>Pronto</Button></footer>
      </div>
    </div>,
    document.body,
  );
}
