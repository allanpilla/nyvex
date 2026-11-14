import type { Screen } from '../navigation';

/** Tela provisória: substitua por uma página real em src/pages/ quando a tela for desenhada. */
export function PlaceholderPage({ screen }: { screen: Screen }) {
  return (
    <div className="nx-page">
      <h1>{screen.label}</h1>
      <p>{screen.description}</p>
      <div className="nx-ph">Conteúdo de “{screen.label}” entra aqui</div>
    </div>
  );
}
