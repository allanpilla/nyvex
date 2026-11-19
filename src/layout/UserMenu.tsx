import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Badge, NavItem } from '../ds/components';
import { useUi } from '../lib/useUi';

/* Renderizado no body com position: fixed para não ser cortado pelo overflow do menu lateral.
   Menu lateral fechado: abre à direita, alinhado pela base do avatar.
   Menu lateral aberto: abre acima do botão do usuário. */
export function UserMenu({ onClose, anchor }: { onClose: () => void; anchor: RefObject<HTMLElement> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast, collapsed } = useUi();
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      setPos(collapsed
        ? { left: r.right + 10, bottom: Math.max(8, window.innerHeight - r.bottom) }
        : { left: r.left, bottom: window.innerHeight - r.top + 6 });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, collapsed]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose, anchor]);

  const act = (msg: string) => () => { onClose(); toast(msg); };

  return createPortal(
    <div
      className={['nx-pop', collapsed && 'is-side'].filter(Boolean).join(' ')}
      role="menu"
      ref={ref}
      style={pos ? { left: pos.left, bottom: pos.bottom } : { visibility: 'hidden' }}
    >
      <div className="nx-pop__meta">
        <b>Nome do usuário</b>
        <span>usuario@cliente.com.br</span>
        <Badge tone="success">Operacional · admin</Badge>
      </div>
      <NavItem role="menuitem" icon="faces" label="Meu perfil" onClick={act('Meu perfil: tela ainda não desenhada')} />
      <NavItem role="menuitem" icon="settings" label="Preferências" onClick={act('Preferências: tela ainda não desenhada')} />
      <NavItem role="menuitem" icon="fold" label="Sair" onClick={act('Sair: ação simulada no protótipo')} />
    </div>,
    document.body,
  );
}
