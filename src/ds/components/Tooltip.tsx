import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Kbd } from './Kbd';

type TipState = { label: string; shortcut?: string; x: number; y: number } | null;
type Ctx = { show: (el: HTMLElement, label: string, shortcut?: string) => void; hide: () => void };

const TooltipCtx = createContext<Ctx>({ show: () => {}, hide: () => {} });

/** Provider único de tooltip: renderiza um balão fixo à direita do elemento. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);
  const show = useCallback((el: HTMLElement, label: string, shortcut?: string) => {
    const r = el.getBoundingClientRect();
    setTip({ label, shortcut, x: r.right + 10, y: r.top + r.height / 2 - 13 });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return (
    <TooltipCtx.Provider value={{ show, hide }}>
      {children}
      <div
        role="tooltip"
        className={`nx-tip${tip ? ' is-on' : ''}`}
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
export function useTooltip(label: string, shortcut?: string, enabled = true) {
  const { show, hide } = useTooltipApi();
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => enabled && show(e.currentTarget, label, shortcut),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) =>
      enabled && e.currentTarget.matches(':focus-visible') && show(e.currentTarget, label, shortcut),
    onBlur: hide,
  };
}
