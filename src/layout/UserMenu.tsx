import { useEffect, useRef } from 'react';
import { Badge, NavItem } from '../ds/components';
import { useUi } from '../lib/useUi';

export function UserMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useUi();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const act = (msg: string) => () => { onClose(); toast(msg); };

  return (
    <div className="nx-pop" role="menu" ref={ref}>
      <div className="nx-pop__meta">
        <b>Nome do usuário</b>
        <span>usuario@cliente.com.br</span>
        <Badge tone="success">Operacional · admin</Badge>
      </div>
      <NavItem role="menuitem" icon="faces" label="Meu perfil" onClick={act('Meu perfil: tela ainda não desenhada')} />
      <NavItem role="menuitem" icon="settings" label="Preferências" onClick={act('Preferências: tela ainda não desenhada')} />
      <NavItem role="menuitem" icon="fold" label="Sair" onClick={act('Sair: ação simulada no protótipo')} />
    </div>
  );
}
