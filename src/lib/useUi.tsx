import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from './storage';

type Theme = 'dark' | 'light';
type Ui = {
  theme: Theme;
  toggleTheme: () => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (o: boolean) => void;
  toast: (msg: string) => void;
};

const UiCtx = createContext<Ui | null>(null);
const isNarrow = () => window.matchMedia('(max-width: 720px)').matches;

/** Estado global da interface: tema, menu recolhido, paleta de comando e avisos. */
export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (storage.get('nx-theme') === 'light' ? 'light' : 'dark'));
  // O menu sempre começa fechado ao abrir o app; abrir/fechar vale só durante a visita.
  const [collapsed, setCollapsedState] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.set('nx-theme', theme);
  }, [theme]);

  const setCollapsed = useCallback((c: boolean) => {
    setCollapsedState(c);
  }, []);

  const toast = useCallback((msg: string) => setToastMsg(msg), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Atalhos globais: ⌘K / Ctrl+K abre a paleta; [ recolhe/expande o menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '[' && !e.metaKey && !e.ctrlKey) setCollapsed(!collapsed);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [collapsed, setCollapsed]);

  return (
    <UiCtx.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
        collapsed,
        setCollapsed,
        paletteOpen,
        setPaletteOpen,
        toast,
      }}
    >
      {children}
      {toastMsg && <div className="nx-toast" role="status">{toastMsg}</div>}
    </UiCtx.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiCtx);
  if (!ctx) throw new Error('useUi precisa estar dentro de <UiProvider>');
  return ctx;
}

export { isNarrow };
