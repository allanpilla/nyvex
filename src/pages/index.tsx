import type { ComponentType } from 'react';
import type { Screen } from '../navigation';
import { MuralPage } from './mural/MuralPage';
import { DevicesPage } from './devices/DevicesPage';
import { LocationsPage } from './locations/LocationsPage';

/**
 * Telas já desenhadas, por id do menu. Ao criar uma tela nova:
 * 1) crie o componente em src/pages/MinhaTela.tsx
 * 2) registre aqui: { alertas: AlertasPage }
 * Itens sem entrada aqui usam a tela provisória.
 */
export const PAGES: Partial<Record<string, ComponentType<{ screen: Screen }>>> = {
  mural: MuralPage,
  disp: DevicesPage,
  locais: LocationsPage,
};
