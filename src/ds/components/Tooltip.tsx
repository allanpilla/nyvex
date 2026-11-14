import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Kbd } from './Kbd';

export type TipPlace = 'right' | 'bottom' | 'top';
type TipState = { label: string; shortcut?: string; x: number; y: number; place: TipPlace } | null;
type Ctx = { show: (el: HTMLElement, label: string, shortcut?: string, place?: TipPlace) => void; hide: () => void };

const TooltipCtx = createContext<Ctx>({ show: () => {}, hide: () => {} });

/** Provider único de tooltip: renderiza um balão fixo à direita do elemento. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);
  const show = useCallback((el: HTMLElement, label: string, shortcut?: string, place: TipPlace = 'right') => {
    const r = el.getBoundingClientRect();
    if (place === 'right') setTip({ label, shortcut, place, x: r.right + 10, y: r.top + r.height / 2 - 13 });
    else setTip({ label, shortcut, place, x: r.left + r.width / 2, y: place === 'bottom' ? r.bottom + 8 : r.top - 34 });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return (
    <TooltipCtx.Provider value={{ show, hide }}>
      {children}
      <div
        role="tooltip"
        className={`nx-tip${tip ? ' is-on' : ''}${tip && tip.place !== 'right' ? ' nx-tip--v' : ''}`}
        style={tip ? { left: tip.x, top: tip.y } : undefined}
      >
        {tip?.label}
        {tip?.shortcut && <Kbd>{tip.shortcut}</Kbd>}
      </div>
    </TooltipCtx.Provider>
  );
}

export const useTooltipApi = () => useContext(TooltipCtx);

/** Props para ligar o tooltip em qualquer elemento. `enabled=false` desliga (ex.: menu aberto). */
export function useTooltip(label: string, shortcut?: string, enabled = true, place?: TipPlace) {
  const { show, hide } = useTooltipApi();
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => enabled && show(e.currentTarget, label, shortcut, place),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) =>
      enabled && e.currentTarget.matches(':focus-visible') && show(e.currentTarget, label, shortcut, place),
    onBlur: hide,
  };
}
