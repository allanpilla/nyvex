import { useEffect, useState } from 'react';
import { Alert, Button, Combobox, Icon, IconButton, Menu, NavItem, Segmented, useTooltip } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { KIND_ICON, type Device } from '../devices/data';
import { ago, ConnPill, copy } from '../devices/parts';
import { childrenOf, EXPO_LABEL, fmtDate, KIND_LABEL, PEOPLE, pathOf, type Loc, type LocHealth } from './data';
import { EnvBadge, HealthPill, LayersButton, MapCanvas, PerimeterCard } from './parts';

type Tab = 'info' | 'disp' | 'pessoas' | 'analises' | 'eventos';
type Props = {
  l: Loc; locs: Loc[]; devs: Device[]; health: LocHealth;
  onClose: () => void; onOpen: (id: string) => void; onEdit: () => void; onMural: () => void; onDevices: () => void; onAddChild: () => void;
  onPeople: (p: string[]) => void; onDelete: () => void;
};

/** Painel lateral com tudo sobre um local: dados, mapa, dispositivos, pessoas, análises e eventos. */
export function LocationDrawer({ l, locs, devs, health, onClose, onOpen, onEdit, onMural, onDevices, onAddChild, onPeople, onDelete }: Props) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('info');
  const [more, setMore] = useState<HTMLElement | null>(null);
  const kids = childrenOf(l.id, locs);
  const path = pathOf(l, locs);
  const active = devs.filter((d) => d.situacao === 'ativo');
  const cams = devs.filter((d) => d.kind === 'camera' && d.situacao !== 'inativo');
  const problems = active.filter((d) => d.conn === 'offline' || d.conn === 'instavel');
  const idTip = useTooltip('Copiar ID', undefined, true, 'bottom');

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-menu, .nx-sheet-back:not(.is-soft)')) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <aside className="dv-drawer" aria-label={`Detalhes de ${l.name}`}>
      <header className="dv-drawer__head">
        <span className={`dv-kind is-lg lc-kind is-${l.env}`}><Icon name={l.env === 'indoor' ? 'stack' : 'map'} size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{l.name}</h2>
          <p>{KIND_LABEL[l.kind]} · {l.zone}{l.placeType ? ` · ${l.placeType}` : ''}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      {path.length > 0 && (
        <nav className="lc-crumbs" aria-label="Caminho">
          {path.map((p) => <span key={p.id}><button type="button" onClick={() => onOpen(p.id)}>{p.name}</button><Icon name="chevron" size={12} /></span>)}
          <b>{l.name}</b>
        </nav>
      )}

      <div className="dv-drawer__status">
        <EnvBadge env={l.env} />
        <span className="lc-expo"><Icon name={l.exposure === 'abrigado' ? 'shield' : 'sun'} size={12} />{EXPO_LABEL[l.exposure]}</span>
        <HealthPill h={health} />
        <span className="dv-drawer__hb">{devs.length} {devs.length === 1 ? 'dispositivo' : 'dispositivos'}{kids.length ? ` · ${kids.length} sub-locais` : ''}</span>
      </div>
      {problems.length > 0 && (
        <Alert type={problems.some((d) => d.conn === 'offline') ? 'error' : 'warning'}>
          {problems.length === 1 ? `${problems[0].name}: ${problems[0].conn === 'offline' ? 'offline' : 'instável'}` : `${problems.length} dispositivos com problema neste local`}
        </Alert>
      )}

      <div className="dv-drawer__acts">
        <Button icon="edit" onClick={onEdit}>Editar</Button>
        <Button icon="tv" onClick={onMural} disabled={!cams.length}>Ver no mural</Button>
        <Button icon="plus" onClick={onAddChild}>Sub-local</Button>
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
      </div>

      <div className="dv-drawer__tabs">
        <Segmented label="Seções" value={tab} onChange={setTab} size="sm" options={[
          { value: 'info', label: 'Informações' },
          { value: 'disp', label: <>Dispositivos<span className="nx-seg__n">{devs.length}</span></> },
          { value: 'pessoas', label: <>Pessoas<span className="nx-seg__n">{l.people.length}</span></> },
          { value: 'analises', label: 'Análises' },
          { value: 'eventos', label: 'Eventos' },
        ]} />
      </div>

      <div className="dv-drawer__body" key={tab}>
        {tab === 'info' && (
          <>
            <MapCanvas pins={[{ id: l.id, x: 50, y: 48, label: l.name, env: l.env, h: health, on: true }]} perimeter={l.perimeter}>
              <div className="lc-mapc__top"><span className="dv-tools__sp" /><LayersButton /></div>
            </MapCanvas>
            <PerimeterCard p={l.perimeter} onImport={() => toast('Importar KML · simulado no protótipo')} onDraw={() => { onEdit(); }} />
            <dl className="dv-info">
              <Info k="Ambiente" v={<span className="lc-envline"><EnvBadge env={l.env} />{EXPO_LABEL[l.exposure]}</span>} />
              <Info k="Zona" v={l.zone} />
              <Info k="Tipo de lugar" v={l.placeType ?? '—'} />
              <Info k="Local pai" v={path.length ? <button type="button" className="dv-link" onClick={() => onOpen(path[path.length - 1].id)}>{path.map((p) => p.name).join(' / ')}</button> : '—'} />
              {l.env === 'indoor' || !l.city ? (
                <>
                  <Info k="Prédio / bloco" v={l.building ?? '—'} />
                  <Info k="Andar" v={l.floor ?? '—'} />
                  <Info k="Setor" v={l.sector ?? '—'} />
                </>
              ) : (
                <>
                  <Info k="UF · Cidade" v={`${l.uf} · ${l.city}`} />
                  <Info k="Bairro" v={l.district ?? '—'} />
                  <Info k="Rua" v={l.street ? `${l.streetType ? `${l.streetType} · ` : ''}${l.street}${l.number ? `, ${l.number}` : ''}` : '—'} />
                  {(l.lane || l.flow) && <Info k="Faixa · Sentido" v={[l.lane, l.flow].filter(Boolean).join(' · ')} />}
                  {l.reference && <Info k="Referência" v={l.reference} />}
                </>
              )}
              <Info k="Coordenadas" v={<CopyVal v={`${l.lat}, ${l.lng}`} what="Coordenadas copiadas" />} />
              <Info k="Nome" v={l.autoName ? 'Gerado a partir do endereço' : 'Definido manualmente'} />
              <Info k="Criado em" v={fmtDate(l.created)} />
              <Info k="Atualizado em" v={fmtDate(l.updated)} />
              <Info k="ID" v={<button type="button" className="dv-copyval is-mono" onClick={() => copy(l.id, toast, 'ID copiado')} {...idTip}><span>{l.id}</span><Icon name="copy" size={14} /></button>} />
            </dl>
          </>
        )}

        {tab === 'disp' && (
          devs.length === 0
            ? <Empty icon="dev" text="Nenhum dispositivo neste local." action={<Button icon="plus" onClick={onDevices}>Adicionar dispositivo</Button>} />
            : (
              <>
                <div className="dv-stats">
                  <div><span>Online</span><b className="is-ok">{active.filter((d) => d.conn === 'online').length}</b></div>
                  <div><span>Instáveis</span><b className={active.some((d) => d.conn === 'instavel') ? 'is-warn' : ''}>{active.filter((d) => d.conn === 'instavel').length}</b></div>
                  <div><span>Offline</span><b className={active.some((d) => d.conn === 'offline') ? 'is-bad' : ''}>{active.filter((d) => d.conn === 'offline').length}</b></div>
                </div>
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

        {tab === 'pessoas' && <People l={l} onChange={onPeople} />}

        {tab === 'analises' && (
          <>
            <div className="lc-an">
              {[['Ocorrências', '0', 'últimos 30 dias'], ['Até o despacho', '—', 'abertura → despacho'], ['Deslocamento', '—', 'despacho → chegada'], ['Atendimento', '—', 'chegada → liberação'], ['Ciclo completo', '—', 'abertura → encerramento']].map(([k, v, s]) => (
                <div key={k}><span>{k}</span><b>{v}</b><small>{s}</small></div>
              ))}
            </div>
            <section className="dv-sec">
              <div className="dv-sec__head"><h3>Por prioridade e por tipo</h3><span className="dv-muted">30 dias</span></div>
              <p className="dv-muted">Nenhum registro no período.</p>
            </section>
            <p className="lc-foot">Dados de /v1/occurrences/analytics, janela de 30 dias, filtrados por este local.</p>
          </>
        )}

        {tab === 'eventos' && (
          <ol className="dv-events">
            {[
              ...(problems.map((d) => ({ at: Date.now() - (d.hb ?? 600) * 1000, text: `${d.name}: ${d.conn === 'offline' ? 'sem sinal' : 'instável'}`, tone: d.conn === 'offline' ? 'bad' : 'warn' }))),
              ...(l.people.length ? [{ at: new Date(l.updated).getTime(), text: `${l.people.length} ${l.people.length === 1 ? 'pessoa vinculada' : 'pessoas vinculadas'}`, tone: 'info' }] : []),
              ...(l.perimeter && !l.perimeter.reference ? [{ at: new Date(l.perimeter.updated).getTime(), text: `Área monitorada atualizada (${l.perimeter.source})`, tone: 'info' }] : []),
              { at: new Date(l.updated).getTime(), text: 'Cadastro atualizado', tone: 'info' },
              { at: new Date(l.created).getTime(), text: 'Local cadastrado', tone: 'info' },
            ].sort((a, b) => b.at - a.at).map((e, i) => (
              <li key={i} className={`is-${e.tone}`}><i /><div><b>{e.text}</b><span>{fmtDate(new Date(e.at).toISOString())}</span></div></li>
            ))}
          </ol>
        )}
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          <NavItem role="menuitem" icon="dev" label="Ver dispositivos" onClick={() => { setMore(null); onDevices(); }} />
          <NavItem role="menuitem" icon="copy" label="Copiar coordenadas" onClick={() => { setMore(null); copy(`${l.lat}, ${l.lng}`, toast, 'Coordenadas copiadas'); }} />
          <NavItem role="menuitem" icon="upload" label="Importar KML" onClick={() => { setMore(null); toast('Importar KML · simulado no protótipo'); }} />
          <NavItem role="menuitem" icon="alert" label="Ver alertas deste local" onClick={() => { setMore(null); toast('Abre a Fila de alertas filtrada · simulado no protótipo'); }} />
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
      <div className="dv-sec__head"><h3>Pessoas vinculadas</h3><span className="dv-muted">{l.people.length}</span></div>
      <p className="dv-muted">Pessoas esperadas neste local. O vínculo também aparece na ficha de cada pessoa.</p>
      <Combobox label="Vincular pessoa" value={null} placeholder="Vincular pessoa…" searchPlaceholder="Buscar pessoa…"
        options={PEOPLE.filter((p) => !l.people.includes(p)).map((p) => ({ value: p, label: p }))}
        onChange={(p) => { onChange([...l.people, p]); toast(`${p} vinculada a ${l.name}`); }} />
      {l.people.length ? (
        <ul className="lc-dlist">
          {l.people.map((p) => (
            <li key={p}>
              <span className="lc-avatar">{p.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <span className="dv-name"><b>{p}</b></span>
              <IconButton icon="close" label="Desvincular" onClick={() => onChange(l.people.filter((x) => x !== p))} tipPlace="top" />
            </li>
          ))}
        </ul>
      ) : <p className="dv-muted">Ninguém vinculado ainda.</p>}
    </section>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="dv-info__row"><dt>{k}</dt><dd>{v}</dd></div>;
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
function Empty({ icon, text, action }: { icon: 'dev' | 'pin'; text: string; action?: React.ReactNode }) {
  return <div className="lc-empty"><span className="dv-empty__ic"><Icon name={icon} /></span><span>{text}</span>{action}</div>;
}
