import { useEffect, useState } from 'react';
import { Button, Combobox, Icon, IconButton, Menu, NavItem, Segmented, useTooltip } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { KIND_ICON, type Device } from '../devices/data';
import { ago, ConnPill, copy } from '../devices/parts';
import { EXPO_LABEL, fmtDate, KIND_LABEL, PEOPLE, pathOf, type Loc, type LocHealth } from './data';
import { EnvBadge, MapCanvas } from './parts';

type Tab = 'info' | 'infra' | 'rel' | 'analises' | 'eventos';
type Props = {
  l: Loc; locs: Loc[]; devs: Device[]; health: LocHealth;
  onClose: () => void; onOpen: (id: string) => void; onEdit: () => void; onMural: () => void; onDevices: () => void; onAddChild: () => void;
  onPeople: (p: string[]) => void; onDelete: () => void;
};

/**
 * Detalhes do local: só o que a ficha do sistema atual mostra (Informações, Infraestrutura e Relacionamentos).
 * Análises e Eventos ainda não existem no backend: mostram a mesma mensagem de indisponível do sistema atual. Para alterar, “Editar” abre o formulário completo.
 */
export function LocationDrawer({ l, locs, devs, health, onClose, onOpen, onEdit, onMural, onDevices, onAddChild, onPeople, onDelete }: Props) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('info');
  const [more, setMore] = useState<HTMLElement | null>(null);
  const path = pathOf(l, locs);
  const cams = devs.filter((d) => d.kind === 'camera' && d.situacao !== 'inativo');
  const idTip = useTooltip('Copiar ID', undefined, true, 'bottom');
  const out = l.env === 'outdoor' && !!l.city;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-menu, .nx-sheet-back:not(.is-soft)')) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  // Só linhas com valor: campo vazio não vira “—”.
  const rows: [string, React.ReactNode][] = [
    ['Exposição', EXPO_LABEL[l.exposure]],
    ['Zona', l.zone],
    ['Tipo de lugar', l.placeType],
    ['Local pai', path.length ? <button type="button" className="dv-link" onClick={() => onOpen(path[path.length - 1].id)}>{path.map((p) => p.name).join(' / ')}</button> : null],
    ...(out ? [
      ['UF · Cidade', `${l.uf} · ${l.city}`],
      ['Bairro', l.district],
      ['Rua', l.street ? `${l.streetType && !l.street.startsWith(l.streetType) ? `${l.streetType} · ` : ''}${l.street}${l.number ? `, ${l.number}` : ''}` : null],
      ['Faixa', l.lane],
      ['Sentido / fluxo', l.flow],
      ['Referência', l.reference],
    ] as [string, React.ReactNode][] : [
      ['Prédio / bloco', l.building],
      ['Andar', l.floor],
      ['Setor', l.sector],
    ] as [string, React.ReactNode][]),
    ['Coordenadas', <CopyVal v={`${l.lat}, ${l.lng}`} what="Coordenadas copiadas" />],
    ['Área monitorada', l.perimeter ? `${l.perimeter.reference ? 'Limite territorial' : l.perimeter.kind === 'area' ? 'Área' : 'Caminho'} · ${l.perimeter.source}${l.perimeter.areaKm2 != null ? ` · ${l.perimeter.areaKm2.toLocaleString('pt-BR')} km²` : ''}` : null],
  ];

  return (
    <aside className="dv-drawer" aria-label={`Detalhes de ${l.name}`}>
      <header className="dv-drawer__head">
        <span className={`dv-kind is-lg lc-kind is-${l.env}`}><Icon name={l.env === 'indoor' ? 'stack' : 'map'} size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{l.name}</h2>
          <p>{KIND_LABEL[l.kind]}{l.autoName ? ' · nome gerado pelo endereço' : ''}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__status lc-meta">
        <EnvBadge env={l.env} />
        <button type="button" className="lc-meta__id" onClick={() => copy(l.id, toast, 'ID copiado')} {...idTip}>ID {l.id.slice(0, 12)}</button>
        <span>Criado {fmtDate(l.created)}</span>
        <span>Atualizado {fmtDate(l.updated)}</span>
      </div>

      <div className="dv-drawer__acts">
        <Button icon="edit" onClick={onEdit}>Editar</Button>
        {cams.length > 0 && <Button icon="tv" onClick={onMural}>Ver no mural</Button>}
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
      </div>

      <div className="dv-drawer__tabs">
        <Segmented label="Seções" value={tab} onChange={setTab} size="sm" options={[
          { value: 'info', label: 'Informações' },
          { value: 'infra', label: <>Infraestrutura<span className="nx-seg__n">{devs.length}</span></> },
          { value: 'rel', label: <>Relacionamentos<span className="nx-seg__n">{l.people.length}</span></> },
          { value: 'analises', label: 'Análises' },
          { value: 'eventos', label: 'Eventos' },
        ]} />
      </div>

      <div className="dv-drawer__body" key={tab}>
        {tab === 'info' && (
          <>
            <MapCanvas pins={[{ id: l.id, x: 50, y: 48, label: l.name, env: l.env, h: health, on: true }]} perimeter={l.perimeter} />
            <dl className="dv-info">
              {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => <div key={k} className="dv-info__row"><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </>
        )}

        {tab === 'infra' && (
          devs.length === 0
            ? <Empty text="Nenhum dispositivo neste local." action={<Button icon="plus" onClick={onDevices}>Adicionar dispositivo</Button>} />
            : (
              <>
                <ul className="lc-dlist">
                  {[...devs].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR')).map((d) => (
                    <li key={d.id}>
                      <span className={`dv-kind is-${d.kind}`}><Icon name={KIND_ICON[d.kind]} size={14} /></span>
                      <span className="dv-name"><b>{d.name}</b><span>{d.type} · {d.ip}</span></span>
                      <span className="dv-two lc-dlist__st"><ConnPill d={d} /><span>{d.situacao === 'inativo' ? '—' : ago(d.hb)}</span></span>
                    </li>
                  ))}
                </ul>
                <Button icon="external" onClick={onDevices}>Abrir em Dispositivos</Button>
              </>
            )
        )}

        {tab === 'rel' && <People l={l} onChange={onPeople} />}

        {(tab === 'analises' || tab === 'eventos') && (
          <div className="lc-empty">
            <span className="dv-empty__ic"><Icon name={tab === 'analises' ? 'chart' : 'calendar'} /></span>
            <span>Esta aba ainda não está disponível. Ela fica pronta quando o backend expuser esses dados.</span>
          </div>
        )}
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          <NavItem role="menuitem" icon="plus" label="Adicionar sub-local" onClick={() => { setMore(null); onAddChild(); }} />
          <NavItem role="menuitem" icon="copy" label="Copiar coordenadas" onClick={() => { setMore(null); copy(`${l.lat}, ${l.lng}`, toast, 'Coordenadas copiadas'); }} />
          <div className="nx-menu__sep" />
          <NavItem role="menuitem" icon="trash" label="Excluir" className="is-danger" onClick={() => { setMore(null); onDelete(); }} />
        </Menu>
      )}
    </aside>
  );
}

const rank = (d: Device) => (d.situacao === 'inativo' ? 4 : d.conn === 'offline' ? 0 : d.conn === 'instavel' ? 1 : 2);

/** Pessoas esperadas no local; o vínculo também aparece na ficha da pessoa. */
function People({ l, onChange }: { l: Loc; onChange: (p: string[]) => void }) {
  const { toast } = useUi();
  return (
    <section className="dv-sec">
      <div className="dv-sec__head"><h3>Pessoas vinculadas</h3></div>
      <p className="dv-muted">Pessoas esperadas neste local. O vínculo também aparece na ficha de cada pessoa.</p>
      <Combobox label="Vincular pessoa" value={null} placeholder="Vincular pessoa…" searchPlaceholder="Buscar pessoa…"
        options={PEOPLE.filter((p) => !l.people.includes(p)).map((p) => ({ value: p, label: p }))}
        onChange={(p) => { onChange([...l.people, p]); toast(`${p} vinculada a ${l.name}`); }} />
      {l.people.length > 0 && (
        <ul className="lc-dlist">
          {l.people.map((p) => (
            <li key={p}>
              <span className="lc-avatar">{p.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <span className="dv-name"><b>{p}</b></span>
              <IconButton icon="close" label="Desvincular" onClick={() => onChange(l.people.filter((x) => x !== p))} tipPlace="top" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CopyVal({ v, what }: { v: string; what: string }) {
  const { toast } = useUi();
  const tip = useTooltip('Copiar', undefined, true, 'top');
  return (
    <button type="button" className="dv-copyval is-mono" onClick={() => copy(v, toast, what)} {...tip}>
      <span>{v}</span><Icon name="copy" size={14} />
    </button>
  );
}
function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return <div className="lc-empty"><span className="dv-empty__ic"><Icon name="dev" /></span><span>{text}</span>{action}</div>;
}
