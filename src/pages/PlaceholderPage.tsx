import { Button, PageHeader } from '../ds/components';
import { useUi } from '../lib/useUi';
import type { Screen } from '../navigation';

/** Tela provisória: substitua por uma página real em src/pages/ quando a tela for desenhada. */
export function PlaceholderPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const actions = screen.actions ?? [];
  return (
    <>
      <PageHeader
        title={screen.label}
        description={screen.description}
        actions={
          actions.length > 0 &&
          actions.map((a, i) => (
            <Button key={a} variant={i === actions.length - 1 ? 'primary' : 'secondary'} onClick={() => toast(`${a}: ação simulada no protótipo`)}>
              {a}
            </Button>
          ))
        }
      />
      <div className="nx-page">
        <div className="nx-ph">Conteúdo de “{screen.label}” entra aqui</div>
      </div>
    </>
  );
}
