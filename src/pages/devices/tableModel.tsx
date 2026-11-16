import { useState } from 'react';
import { Button, Icon, Menu, NavItem, Segmented } from '../../ds/components';
import { storage } from '../../lib/storage';

/**
 * Modelo de tabela (Dispositivos e Locais). O 'novo' foi aprovado e é o padrão;
 * o 'atual' segue disponível só para referência (sem chave na interface).
 * 'novo': busca, Filtros e Ordenar dentro do card da tabela; cabeçalho arredondado, linhas mais altas.
 * 'atual': modelo anterior. A escolha fica salva no navegador.
 */
export type TableModel = 'atual' | 'novo';
const KEY = 'nx-table-model';

export function useTableModel(): [TableModel, (m: TableModel) => void] {
  const [m, setM] = useState<TableModel>('novo');
  return [m, (v) => { storage.set(KEY, v); setM(v); }];
}

export function TableModelSwitch({ value, onChange }: { value: TableModel; onChange: (m: TableModel) => void }) {
  return (
    <span className="dv-tmodel">
      <span>Modelo da tabela</span>
      <Segmented label="Modelo da tabela" size="sm" value={value} onChange={onChange}
        options={[{ value: 'atual', label: 'Atual' }, { value: 'novo', label: 'Novo (teste)' }]} />
    </span>
  );
}

export function FilterToggle({ on, count, onClick }: { on: boolean; count: number; onClick: () => void }) {
  return (
    <Button icon="filter" className={`dv-ftoggle${on ? ' is-active' : ''}`} aria-expanded={on} onClick={onClick}>
      Filtros{count > 0 && <span className="dv-fcount">{count}</span>}
    </Button>
  );
}

export function SortButton<K extends string>({ options, sort, onChange }: {
  options: [K, string][]; sort: { k: K; dir: 1 | -1 }; onChange: (s: { k: K; dir: 1 | -1 }) => void;
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const cur = options.find((o) => o[0] === sort.k)?.[1] ?? '';
  return (
    <>
      <button type="button" className={`nx-btn nx-btn--secondary dv-sortbtn${el ? ' is-active' : ''}`} aria-haspopup="true" aria-expanded={!!el}
        onClick={(e) => setEl(el ? null : e.currentTarget)}>
        <Icon name="sort" size={16} />
        <span className="dv-sortbtn__l">Ordenar: <b>{cur}</b></span>
        <Icon name="chevron" size={14} />
      </button>
      {el && (
        <Menu anchor={el} onClose={() => setEl(null)}>
          <div className="nx-menu__title">Ordenar por</div>
          {options.map(([k, l]) => (
            <NavItem key={k} role="menuitemradio" aria-checked={sort.k === k} icon="sort" label={l} selected={sort.k === k} trailing={sort.k === k ? <Icon name="check" size={16} className="dv-sortchk" /> : undefined}
              onClick={() => { onChange({ k, dir: sort.k === k ? sort.dir : 1 }); setEl(null); }} />
          ))}
          <div className="nx-menu__sep" />
          <NavItem role="menuitemradio" aria-checked={sort.dir === 1} icon="arrowRight" className="dv-dir is-asc" label="Crescente" selected={sort.dir === 1} trailing={sort.dir === 1 ? <Icon name="check" size={16} className="dv-sortchk" /> : undefined}
            onClick={() => { onChange({ ...sort, dir: 1 }); setEl(null); }} />
          <NavItem role="menuitemradio" aria-checked={sort.dir === -1} icon="arrowRight" className="dv-dir is-desc" label="Decrescente" selected={sort.dir === -1} trailing={sort.dir === -1 ? <Icon name="check" size={16} className="dv-sortchk" /> : undefined}
            onClick={() => { onChange({ ...sort, dir: -1 }); setEl(null); }} />
        </Menu>
      )}
    </>
  );
}
