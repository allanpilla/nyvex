import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo: funciona no GitHub Pages (/nyvex-operation-center/) e em qualquer outro host.
export default defineConfig({
  plugins: [react()],
  base: './',
});
