import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UiProvider } from './lib/useUi';
import { TooltipProvider } from './ds/components';
import './ds/tokens.css';
import './ds/base.css';
import './ds/components.css';
import './layout/layout.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </UiProvider>
  </StrictMode>,
);
