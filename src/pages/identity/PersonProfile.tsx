import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Icon, IconButton, Menu, NavItem, Segmented, Select, Tabs } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import { useUi } from '../../lib/useUi';
import { photoUrl } from '../faces/faceArt';
import {
  ageText, buildVehicles, camById, camLabel, camShort, credExpired, credExpiring, D, docText, fmtDay, fmtDT, fmtTime, H, inWin, listsOf, NOW, P_STATUS, P_STATUS_ORDER,
  pendingAlerts, shortId, typeName, vDesc, type AlertSt, type Person, type PStatus, type Win,
} from './data';
import { Box, Empty, PersonPic, Plate, PStatusDot, RiskTag } from './parts';
import { RouteMap } from './RouteMap';

type Tab = 'sintese' | 'movimentacao' | 'atencao' | 'relacoes' | 'acesso';
const TABS: { value: Tab; label: string; icon: IconName }[] = [
  { value: 'sintese', label: 'Síntese', icon: 'dash' },
  { value: 'movimentacao', label: 'Movimentação', icon: 'map' },
  { value: 'atencao', label: 'Atenção operacional', icon: 'alert' },
  { value: 'relacoes', label: 'Relações', icon: 'nodes' },
  { value: 'acesso', label: 'Acesso e conformidade', icon: 'shield' },
];
const VEH = buildVehicles();

type Props = {
  p: Person | null; people: Person[]; tab: string | null; onTab: (t: Tab) => void; onBack: () => void; onOpenPerson: (id: string) => void;
  onEdit: () => void; onMonitor: () => void; onStatus: (s: PStatus) => void; onDelete: () => void; onChange: (fn: (p: Person) => Person) => void;
};

/** Ficha da pessoa: análise completa em cinco lentes, com o cadastro sempre à direita. */
export function PersonProfile({ p, people, tab: tabParam, onTab, onBack, onOpenPerson, onEdit, onMonitor, onStatus, onDelete, onChange }: Props) {
  const { toast } = useUi();
  const [win, setWin] = useState<Win>('30d');
  const [manage, setManage] = useState<HTMLElement | null>(null);
  const [spin, setSpin] = useState(false);
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : 'sintese';

  if (!p) {
    return (
      <div className="idp">
        <div className="idp-missing">
          <Empty icon="people" title="Pessoa não encontrada" text="O cadastro pode ter sido excluído ou o link está incompleto.">
            <Button icon="arrowLeft" onClick={onBack}>Voltar para Pessoas</Button>
          </Empty>
        </div>
      </div>
    );
  }

  const pend = pendingAlerts(p);
  const lists = listsOf(p);
  const vehicles = VEH.filter((v) => v.owner === p.id);

  return (
    <div className="idp">
      <header className="nx-ph-head idp-head">
        <IconButton icon="arrowLeft" label="Voltar para Pessoas" onClick={onBack} tipPlace="bottom" />
        <div className="nx-ph-head__text">
          <h1>{p.name}</h1>
          <p className="idp-sub"><span>Ficha da pessoa</span><PStatusDot s={p.status} /><span>{p.types.length ? p.types.map(typeName).join(', ') : 'Sem tipo'}</span><span className="id-mono">ID {shortId(p.id)}</span></p>
        </div>
        <div className="nx-ph-head__actions">
          <IconButton icon="refresh" label="Atualizar fontes" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => { setSpin(false); toast('Fontes atualizadas'); }, 700); }} tipPlace="bottom" />
          <Button icon="eye" onClick={onMonitor}>Monitorar</Button>
          <Button icon="settings" onClick={(e) => setManage(manage ? null : e.currentTarget)} aria-haspopup="menu">Gerenciar<Icon name="chevron" size={14} /></Button>
        </div>
      </header>

      <div className="idp-body">
        <div className="idp-main">
          <div className="idp-bar">
            <Tabs label="Lentes da ficha" value={tab} onChange={onTab} className="idp-tabs"
              options={TABS.map((t) => ({ ...t, count: t.value === 'atencao' && pend ? pend : undefined }))} />
            <span className="dv-tools__sp" />
            {tab !== 'relacoes' && (
              <span className="idp-win"><span>Janela</span>
                <Segmented size="sm" label="Janela de análise" value={win} onChange={setWin} options={[{ value: '7d', label: '7 dias' }, { value: '30d', label: '30 dias' }, { value: '90d', label: '90 dias' }]} />
              </span>
            )}
          </div>
          <div className="idp-content" key={tab}>
            {tab === 'sintese' && <Synthesis p={p} win={win} lists={lists} vehicles={vehicles.length} onTab={onTab} />}
            {tab === 'movimentacao' && <Movement p={p} win={win} />}
            {tab === 'atencao' && <Attention p={p} win={win} lists={lists} onChange={onChange} />}
            {tab === 'relacoes' && <Relations p={p} people={people} vehicles={vehicles} onOpenPerson={onOpenPerson} />}
            {tab === 'acesso' && <Access p={p} win={win} />}
          </div>
        </div>

        <aside className="idp-side" aria-label="Cadastro">
          <div className={`id-portrait${p.photo == null ? ' is-empty' : ''}`}>
            {p.photo != null ? <img src={photoUrl(p.photo)} alt={`Foto de ${p.name}`} /> : <span><Icon name="faces" size={28} />Sem foto de referência</span>}
          </div>
          {p.wanted && <Alert type="error" title="Pessoa procurada">Pedido de localização ativo.</Alert>}
          {!p.wanted && pend > 0 && <Alert type="warning" title="Sinal de atenção ativo">{pend} {pend === 1 ? 'alerta vinculado aguarda' : 'alertas vinculados aguardam'} triagem.</Alert>}
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Dados gerais</h3><button type="button" className="dv-link" onClick={onEdit}>Editar</button></div>
            <dl className="dv-info idp-info">
              <div className="dv-info__row"><dt>Nome</dt><dd>{p.name}</dd></div>
              {p.social && <div className="dv-info__row"><dt>Nome social</dt><dd>{p.social}</dd></div>}
              <div className="dv-info__row"><dt>Documento</dt><dd className="id-mono">{docText(p)}</dd></div>
              {p.birth && <div className="dv-info__row"><dt>Nascimento</dt><dd>{new Date(`${p.birth}T12:00:00`).toLocaleDateString('pt-BR')}</dd></div>}
              <div className="dv-info__row"><dt>Tipo</dt><dd>{p.types.length ? p.types.map(typeName).join(', ') : <span className="lc-none">Nenhum atribuído</span>}</dd></div>
              <div className="dv-info__row"><dt>Status</dt><dd><PStatusDot s={p.status} /></dd></div>
              <div className="dv-info__row"><dt>Risco</dt><dd><RiskTag r={p.risk} /></dd></div>
              <div className="dv-info__row"><dt>Cadastro</dt><dd>{fmtDay(p.created)} · atualizado {ageText(p.updated)}</dd></div>
            </dl>
          </section>
          {p.attrs.length > 0 && (
            <section className="dv-sec">
              <div className="dv-sec__head"><h3>{p.types.length ? typeName(p.types[0]) : 'Atributos'}</h3></div>
              <dl className="dv-info idp-info">
                {p.attrs.map(([k, v]) => <div key={k} className="dv-info__row"><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </section>
          )}
        </aside>
      </div>

      {manage && (
        <Menu anchor={manage} onClose={() => setManage(null)}>
          <NavItem role="menuitem" icon="edit" label="Editar cadastro" onClick={() => { setManage(null); onEdit(); }} />
          <NavItem role="menuitem" icon="idcard" label="Gerenciar tipos" onClick={() => { setManage(null); onEdit(); }} />
          <div className="nx-menu__sep" />
          <div className="nx-menu__title">Mudar status</div>
          {P_STATUS_ORDER.filter((s) => s !== p.status && s !== 'pendente').map((s) => (
            <NavItem key={s} role="menuitem" icon={s === 'bloqueada' ? 'lock' : s === 'ativa' ? 'check' : 'pause'} label={P_STATUS[s]} onClick={() => { setManage(null); onStatus(s); }} />
          ))}
          <div className="nx-menu__sep" />
          <NavItem role="menuitem" icon="trash" label="Excluir pessoa" className="is-danger" onClick={() => { setManage(null); onDelete(); }} />
        </Menu>
      )}
    </div>
  );
}

/* ───────────── Síntese ───────────── */

function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'warn' | 'bad' }) {
  return <div className={`idp-kpi${tone ? ` is-${tone}` : ''}`}><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
}

function Synthesis({ p, win, lists, vehicles, onTab }: { p: Person; win: Win; lists: ReturnType<typeof listsOf>; vehicles: number; onTab: (t: Tab) => void }) {
  const seen = p.sightings.filter((s) => inWin(s.at, win));
  const last = p.sightings[0];
  const pend = pendingAlerts(p);
  const attention: { tone: 'bad' | 'warn' | 'neutral'; title: string; text: string; tab?: Tab }[] = [];
  if (p.wanted) attention.push({ tone: 'bad', title: 'Pedido de localização ativo', text: 'Avise a central ao avistar esta pessoa.', tab: 'movimentacao' });
  if (p.status === 'bloqueada') attention.push({ tone: 'bad', title: 'Acesso bloqueado', text: 'Negado em todos os recursos; credenciais suspensas.', tab: 'acesso' });
  if (pend) attention.push({ tone: 'warn', title: `${pend} ${pend === 1 ? 'alerta pendente' : 'alertas pendentes'}`, text: 'Reconheça ou descarte cada alerta com motivo.', tab: 'atencao' });
  if (credExpired(p)) attention.push({ tone: 'warn', title: 'Credencial vencida', text: 'Há credencial vencida que ainda não foi renovada.', tab: 'acesso' });
  else if (credExpiring(p)) attention.push({ tone: 'neutral', title: 'Credencial vence em até 30 dias', text: 'Programe a renovação antes do vencimento.', tab: 'acesso' });
  if (p.status === 'suspensa' || p.status === 'inativa') attention.push({ tone: 'neutral', title: `Cadastro ${P_STATUS[p.status].toLowerCase()}`, text: 'Credenciais sem validade enquanto o status durar.', tab: 'acesso' });
  lists.filter((l) => l.active).forEach((l) => attention.push({ tone: 'neutral', title: `Em ${l.name}`, text: `Limiar ${l.threshold}% · ${l.reason}`, tab: 'atencao' }));
  const active = lists.filter((l) => l.active).length;

  return (
    <div className="idp-grid">
      <section className="idp-kpis">
        <Kpi label="Último avistamento" value={last ? ageText(last.at) : '—'} sub={last ? fmtDT(last.at) : 'Sem avistamento'} />
        <Kpi label="Avistamentos" value={seen.length} sub={`Na janela de ${win.replace('d', ' dias')}`} />
        <Kpi label="Alertas pendentes" value={pend} sub={`${p.alerts.length} no histórico`} tone={pend ? 'warn' : undefined} />
        <Kpi label="Veículos associados" value={vehicles} sub={vehicles ? 'Ver em Relações' : 'Nenhum vinculado'} />
      </section>

      <div className="idp-two">
        <Box title="O que aconteceu recentemente" sub="Últimos avistamentos na janela" icon="clock"
          action={seen.length > 0 ? <button type="button" className="dv-link" onClick={() => onTab('movimentacao')}>Ver movimentação</button> : undefined}>
          {seen.length ? (
            <ol className="idp-tl">
              {seen.slice(0, 5).map((s, i) => (
                <li key={i}><i /><span className="dv-two"><b>Reconhecida por câmera</b><span>{fmtDT(s.at)} · {camLabel(s.camId)}</span></span><span className="idp-score">{s.score}%</span></li>
              ))}
            </ol>
          ) : <Empty icon="camera" title="Sem avistamentos nesta janela" text="Ausência de avistamento não confirma ausência no campus." />}
        </Box>
        <Box title="O que merece atenção" sub="Alertas, listas e pendências do cadastro" icon="alert" n={attention.length || undefined}>
          {attention.length ? (
            <ul className="idp-att">
              {attention.map((a, i) => (
                <li key={i} className={`is-${a.tone}`}>
                  <span className="dv-two"><b>{a.title}</b><span>{a.text}</span></span>
                  {a.tab && <IconButton icon="arrowRight" label="Ver" onClick={() => onTab(a.tab!)} tipPlace="top" />}
                </li>
              ))}
            </ul>
          ) : <Empty icon="check" title="Nada pede atenção agora" text="Sem alertas pendentes, listas ativas ou pendências no cadastro." />}
        </Box>
      </div>

      <Box title="Outros contextos da pessoa" sub="Registros associados ao cadastro" icon="stack">
        <div className="idp-ctx">
          <button type="button" onClick={() => onTab('relacoes')}><span>Relações e contatos</span><b>{p.links.length ? `${p.links.length} ${p.links.length === 1 ? 'vínculo' : 'vínculos'}` : 'Sem vínculos'}</b><em>Ver relações<Icon name="arrowRight" size={14} /></em></button>
          <button type="button" onClick={() => onTab('relacoes')}><span>Veículos</span><b>{vehicles ? `${vehicles} ${vehicles === 1 ? 'veículo' : 'veículos'}` : 'Nenhum vinculado'}</b><em>Ver vínculos<Icon name="arrowRight" size={14} /></em></button>
          <button type="button" onClick={() => onTab('acesso')}><span>Acesso</span><b>{accessDecision(p).ok ? 'Permitido' : 'Negado'} · {p.creds.length} {p.creds.length === 1 ? 'credencial' : 'credenciais'}</b><em>Ver acesso<Icon name="arrowRight" size={14} /></em></button>
          <button type="button" onClick={() => onTab('atencao')}><span>Monitoramento</span><b>{active ? `${active} ${active === 1 ? 'lista ativa' : 'listas ativas'}` : 'Não monitorada'}</b><em>Ver atenção<Icon name="arrowRight" size={14} /></em></button>
        </div>
      </Box>
    </div>
  );
}

/* ───────────── Movimentação ───────────── */

function Movement({ p, win }: { p: Person; win: Win }) {
  const seen = useMemo(() => p.sightings.filter((s) => inWin(s.at, win)), [p, win]);
  const days = useMemo(() => [...new Set(seen.map((s) => Math.floor((s.at - 3 * H) / D)))].sort((a, b) => b - a), [seen]);
  const [di, setDi] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const dayKey = days[Math.min(di, days.length - 1)];
  const stops = useMemo(() => seen.filter((s) => Math.floor((s.at - 3 * H) / D) === dayKey).sort((a, b) => a.at - b.at), [seen, dayKey]);
  const camsN = new Set(stops.map((s) => s.camId)).size;
  const span = stops.length > 1 ? stops[stops.length - 1].at - stops[0].at : 0;
  const byLocal = Object.entries(seen.reduce<Record<string, number>>((m, s) => { const l = camById(s.camId)?.local ?? '—'; m[l] = (m[l] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const hours = Array.from({ length: 24 }, (_, h) => seen.filter((s) => new Date(s.at).getHours() === h).length);
  const maxH = Math.max(1, ...hours);

  if (!seen.length) return <Box title="Trajeto e mapa" sub="Reconstrução do deslocamento a partir dos avistamentos" icon="map"><Empty icon="map" title="Sem avistamentos nesta janela" text="Amplie a janela para 90 dias ou confira se a pessoa tem foto de referência." /></Box>;

  return (
    <div className="idp-grid">
      <Box title="Trajeto e mapa" sub="Reconstrução do deslocamento a partir dos avistamentos" icon="map" className="idp-route"
        action={
          <span className="idp-daynav">
            <IconButton icon="arrowLeft" label="Dia anterior" disabled={di >= days.length - 1} onClick={() => { setDi(di + 1); setActive(null); }} tipPlace="top" />
            <b>{new Date(dayKey * D + 3 * H + 12 * H).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
            <IconButton icon="arrowRight" label="Dia seguinte" disabled={di === 0} onClick={() => { setDi(di - 1); setActive(null); }} tipPlace="top" />
          </span>
        }>
        <div className="idp-rstats">
          <div><span>Avistamentos</span><b>{stops.length}</b></div>
          <div><span>Câmeras</span><b>{camsN}</b></div>
          <div><span>Primeiro</span><b>{stops[0] ? fmtTime(stops[0].at) : '—'}</b></div>
          <div><span>Último</span><b>{stops.length ? fmtTime(stops[stops.length - 1].at) : '—'}</b></div>
          <div><span>Permanência</span><b>{span ? `${Math.floor(span / H)} h ${String(Math.round((span % H) / 6e4)).padStart(2, '0')}` : '—'}</b></div>
        </div>
        <div className="idp-rwrap">
          <RouteMap stops={stops.map((s) => ({ camId: s.camId, label: camLabel(s.camId), time: fmtTime(s.at) }))} active={active} onPick={setActive} />
          <ol className="idp-seq" aria-label="Sequência do trajeto">
            {stops.map((s, i) => (
              <li key={i} className={active === i ? 'is-on' : undefined}>
                <button type="button" onClick={() => setActive(active === i ? null : i)}>
                  <span className="idp-seq__n">{i + 1}</span>
                  <span className="dv-two"><b>{camShort(s.camId)}</b><span>{camById(s.camId)?.local} · {s.score}%</span></span>
                  <time>{fmtTime(s.at)}</time>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </Box>
      <div className="idp-two">
        <Box title="Locais mais frequentes" sub={`Avistamentos por área · ${win.replace('d', ' dias')}`} icon="pin">
          <ul className="idp-bars">
            {byLocal.slice(0, 6).map(([l, n]) => <li key={l}><span>{l}</span><i><em style={{ width: `${(n / byLocal[0][1]) * 100}%` }} /></i><b>{n}</b></li>)}
          </ul>
        </Box>
        <Box title="Horários" sub="Avistamentos por hora do dia" icon="clock">
          <div className="idp-hours" role="img" aria-label="Avistamentos por hora do dia">
            {hours.map((n, h) => <span key={h} title={`${h}h · ${n}`}><i style={{ height: n ? `${Math.max(8, (n / maxH) * 100)}%` : 0 }} /></span>)}
          </div>
          <div className="idp-hours__ax"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
        </Box>
      </div>
    </div>
  );
}

/* ───────────── Atenção operacional ───────────── */

const SEV: Record<string, string> = { critica: 'Crítica', alta: 'Alta', media: 'Média' };
const AL_ST: Record<AlertSt, string> = { pendente: 'Pendente', reconhecido: 'Reconhecido', descartado: 'Descartado' };
const DISCARD = ['Falso positivo', 'Pessoa diferente', 'Já tratado em outro alerta', 'Teste'];

function Attention({ p, win, lists, onChange }: { p: Person; win: Win; lists: ReturnType<typeof listsOf>; onChange: (fn: (p: Person) => Person) => void }) {
  const { toast } = useUi();
  const nav = useNavigate();
  const [only, setOnly] = useState<'pend' | 'all'>(pendingAlerts(p) ? 'pend' : 'all');
  const [discard, setDiscard] = useState<{ id: string; el: HTMLElement } | null>(null);
  const alerts = p.alerts.filter((a) => inWin(a.at, win) && (only === 'all' || a.status === 'pendente'));
  const pend = p.alerts.filter((a) => inWin(a.at, win) && a.status === 'pendente').length;
  const set = (id: string, status: AlertSt, reason?: string) => {
    onChange((x) => ({ ...x, alerts: x.alerts.map((a) => (a.id === id ? { ...a, status, reason } : a)) }));
    toast(status === 'reconhecido' ? 'Alerta reconhecido' : `Alerta descartado · ${reason}`);
  };
  const active = lists.filter((l) => l.active);
  const occ = p.wanted ? 1 : 0;

  return (
    <div className="idp-grid">
      <section className="idp-kpis">
        <Kpi label="Listas ativas" value={active.length} sub="Monitoramento vigente" />
        <Kpi label="Alertas pendentes" value={pend} sub={`Janela de ${win.replace('d', ' dias')}`} tone={pend ? 'warn' : undefined} />
        <Kpi label="Ocorrências abertas" value={occ} sub="Histórico relacionado" tone={occ ? 'bad' : undefined} />
        <Kpi label="Evidências" value={0} sub="Arquivos vinculados" />
      </section>
      <div className="idp-two is-wide-right">
        <Box title="Monitoramento atual" sub="Listas em que a pessoa está vinculada" icon="eye" n={lists.length}>
          {lists.length ? (
            <ul className="idp-lists">
              {lists.map((l, i) => (
                <li key={i} className={l.active ? undefined : 'is-off'}>
                  <span className="dv-two"><b>{l.name}</b><span>{l.reason}</span><span className="idp-meta">Limiar {l.threshold}% · {l.until ? `válida até ${fmtDay(new Date(l.until).getTime())}` : 'sem vencimento'}</span></span>
                  <span className="idp-lists__r">
                    <Badge tone={l.active ? 'success' : 'neutral'}>{l.active ? 'Ativa' : 'Inativa'}</Badge>
                    <button type="button" className="dv-link" onClick={() => nav('/listas-de-observacao')}>Abrir lista</button>
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty icon="eye" title="Não monitorada" text="Inclua a pessoa numa lista de observação para gerar alertas." />}
        </Box>
        <Box title="Alertas de monitoramento" sub="Eventos gerados pelas listas na janela" icon="alert" n={alerts.length}
          action={<Segmented size="sm" label="Mostrar" value={only} onChange={setOnly} options={[{ value: 'pend', label: 'Pendentes' }, { value: 'all', label: 'Todos' }]} />}>
          {alerts.length ? (
            <ul className="idp-alerts">
              {alerts.map((a) => (
                <li key={a.id} className={`is-${a.status}`}>
                  <span className="idp-alerts__img">{p.photo != null ? <img src={photoUrl(p.photo)} alt="" /> : <Icon name="faces" size={18} />}</span>
                  <span className="dv-two">
                    <b><span className={`idp-sev is-${a.sev}`}>{SEV[a.sev]}</span>Match de face<span className="idp-score">{a.score}%</span></b>
                    <span>{camLabel(a.camId)} · {fmtDT(a.at)}</span>
                    <span className="idp-meta">{a.list}{a.reason ? ` · ${a.reason}` : ''}</span>
                  </span>
                  {a.status === 'pendente' ? (
                    <span className="wl-macts">
                      <Button onClick={(e) => setDiscard({ id: a.id, el: e.currentTarget })}>Descartar</Button>
                      <Button variant="primary" onClick={() => set(a.id, 'reconhecido')}>Reconhecer</Button>
                    </span>
                  ) : <span className={`wl-mst is-${a.status === 'reconhecido' ? 'confirmado' : 'descartado'}`}><i />{AL_ST[a.status]}</span>}
                </li>
              ))}
            </ul>
          ) : <Empty icon="check" title={only === 'pend' ? 'Nenhum alerta pendente' : 'Nenhum alerta na janela'} text="A ausência de alertas não equivale a ausência de histórico." />}
        </Box>
      </div>
      {discard && (
        <Menu anchor={discard.el} onClose={() => setDiscard(null)}>
          <div className="nx-menu__title">Motivo do descarte</div>
          {DISCARD.map((r) => <NavItem key={r} role="menuitem" icon="close" label={r} onClick={() => { set(discard.id, 'descartado', r); setDiscard(null); }} />)}
        </Menu>
      )}
    </div>
  );
}

/* ───────────── Relações ───────────── */

function Relations({ p, people, vehicles, onOpenPerson }: { p: Person; people: Person[]; vehicles: ReturnType<typeof buildVehicles>; onOpenPerson: (id: string) => void }) {
  const nav = useNavigate();
  const links = p.links.map((l) => ({ ...l, who: people.find((x) => x.id === l.personId) })).filter((l) => l.who);
  const nodes = [...links.map((l) => ({ kind: 'p' as const, id: l.personId, label: l.who!.name, sub: l.relation, who: l.who! })), ...vehicles.map((v) => ({ kind: 'v' as const, id: v.id, label: v.plate, sub: vDesc(v), who: null }))];
  const W = 640, Hh = 300, cx = W / 2, cy = Hh / 2;

  return (
    <div className="idp-grid">
      <div className="idp-two is-wide-left">
        <Box title="Teia de relacionamento" sub="Só vínculos cadastrais confirmados" icon="nodes">
          <div className="idp-web">
            <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label="Vínculos da pessoa">
              <defs><pattern id="idp-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" className="idp-web__dot" /></pattern></defs>
              <rect width={W} height={Hh} fill="url(#idp-dots)" />
              {nodes.map((n, i) => {
                const a = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * 200, y = cy + Math.sin(a) * 100;
                return (
                  <g key={n.id} className={`idp-web__n is-${n.kind}`} onClick={() => (n.kind === 'p' ? onOpenPerson(n.id) : nav(`/veiculos?placa=${n.label}`))} role="button" tabIndex={0}>
                    <line x1={cx} y1={cy} x2={x} y2={y} className="idp-web__l" />
                    {n.kind === 'p' ? <circle cx={x} cy={y} r="20" /> : <rect x={x - 34} y={y - 13} width="68" height="26" rx="6" />}
                    <text x={x} y={y + 4} textAnchor="middle" className={n.kind === 'v' ? 'is-mono' : undefined}>{n.kind === 'p' ? n.label.split(' ').map((s) => s[0]).slice(0, 2).join('') : n.label}</text>
                    <text x={x} y={y < cy - 5 ? y - (n.kind === 'p' ? 28 : 22) : y + (n.kind === 'p' ? 36 : 30)} textAnchor="middle" className="idp-web__cap">{n.kind === 'p' ? n.label : n.sub}</text>
                  </g>
                );
              })}
              <g className="idp-web__c">
                <circle cx={cx} cy={cy} r="28" />
                <text x={cx} y={cy + 5} textAnchor="middle">{p.name.replace(/\[.*?\]|#\d+/g, '').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</text>
                <text x={cx} y={cy + 46} textAnchor="middle" className="idp-web__cap">Pessoa analisada</text>
              </g>
            </svg>
            {!nodes.length && <span className="idp-web__empty">Nenhum vínculo confirmado nas fontes consultadas</span>}
          </div>
        </Box>
        <Box title="Leitura relacional" sub="O que o cadastro confirma" icon="sparkle">
          <div className="idp-rel">
            <p>{nodes.length ? `${nodes.length} ${nodes.length === 1 ? 'vínculo formal registrado' : 'vínculos formais registrados'}.` : 'Nenhum vínculo formal com outra pessoa ou veículo.'} Isto não permite concluir convivência nem ausência dela.</p>
            <div className="dv-stats">
              <div><span>Pessoas</span><b>{links.length}</b></div>
              <div><span>Veículos</span><b>{vehicles.length}</b></div>
              <div><span>Contatos</span><b>{p.contacts.length}</b></div>
            </div>
            <button type="button" className="idp-cta" onClick={() => nav('/matriz-de-relacionamento')}>
              <Icon name="grid" size={16} /><span className="dv-two"><b>Vistos juntos</b><span>Co-presença com pessoas e veículos sem cadastro na Matriz de relacionamento</span></span><Icon name="arrowRight" size={14} />
            </button>
          </div>
        </Box>
      </div>
      <div className="idp-three">
        <Box title="Vínculos entre pessoas" sub="Definidos nos tipos, navegáveis nos dois sentidos" icon="people" n={links.length}>
          {links.length ? (
            <ul className="lc-dlist">
              {links.map((l) => (
                <li key={l.personId} className="idp-click" onClick={() => onOpenPerson(l.personId)}>
                  <PersonPic p={l.who!} size={28} />
                  <span className="dv-name"><b>{l.who!.name}</b><span>{l.relation}</span></span>
                  <Icon name="arrowRight" size={14} />
                </li>
              ))}
            </ul>
          ) : <Empty icon="people" title="Nenhum vínculo registrado" />}
        </Box>
        <Box title="Veículos" sub="Cadastro e leitura de placas (LPR)" icon="car" n={vehicles.length}>
          {vehicles.length ? (
            <ul className="lc-dlist">
              {vehicles.map((v) => (
                <li key={v.id} className="idp-click" onClick={() => nav(`/veiculos?placa=${v.plate}`)}>
                  <span className="dv-kind"><Icon name="car" size={14} /></span>
                  <span className="dv-name"><b><Plate>{v.plate}</Plate></b><span>{vDesc(v)}{v.passes[0] ? ` · visto ${ageText(v.passes[0].at)}` : ''}</span></span>
                  <Icon name="arrowRight" size={14} />
                </li>
              ))}
            </ul>
          ) : <Empty icon="car" title="Nenhum veículo desta pessoa" />}
        </Box>
        <Box title="Canais de contato" sub="Valores protegidos; a consulta fica auditada" icon="lock" n={p.contacts.length}>
          {p.contacts.length ? (
            <ul className="lc-dlist">
              {p.contacts.map((c, i) => (
                <li key={i}><span className="dv-kind"><Icon name={c.kind === 'E-mail' ? 'share' : 'sound'} size={14} /></span><span className="dv-name"><b className="id-mono">{c.masked}</b><span>{c.kind}</span></span></li>
              ))}
            </ul>
          ) : <Empty icon="lock" title="Nenhum canal cadastrado" />}
        </Box>
      </div>
    </div>
  );
}

/* ───────────── Acesso e conformidade ───────────── */

const RESOURCES = [
  { id: 'cat-p1', label: 'Catraca · Portaria 1', need: null },
  { id: 'cat-p3', label: 'Catraca · Portaria 3 (pedestres)', need: null },
  { id: 'bib', label: 'Biblioteca · Acervo', need: ['aluno', 'professor', 'funcionario', 'aluno-demo'] },
  { id: 'lab', label: 'Laboratórios · Bloco 05', need: ['aluno', 'professor'] },
  { id: 'dc', label: 'Data center · Bloco 09', need: ['prestador', 'funcionario'] },
  { id: 'est', label: 'Estacionamento · Cancela Norte', need: ['professor', 'funcionario', 'prestador'] },
];
function accessDecision(p: Person): { ok: boolean; why: string } {
  if (p.status === 'bloqueada') return { ok: false, why: 'Pessoa bloqueada: negado em todos os recursos.' };
  if (p.status === 'suspensa' || p.status === 'inativa' || p.status === 'falecida') return { ok: false, why: `Cadastro ${P_STATUS[p.status].toLowerCase()}: credenciais sem validade.` };
  if (p.status === 'pendente') return { ok: false, why: 'Cadastro pendente: falta concluir a identificação.' };
  if (!p.creds.some((c) => c.status === 'ativa')) return { ok: false, why: 'Sem credencial ativa.' };
  return { ok: true, why: 'Credencial ativa e cadastro regular.' };
}

function Access({ p, win }: { p: Person; win: Win }) {
  const [res, setRes] = useState<string>(RESOURCES[0].id);
  const [sim, setSim] = useState<{ ok: boolean; why: string; res: string } | null>(null);
  const d = accessDecision(p);
  const passes = p.sightings.filter((s) => inWin(s.at, win) && camById(s.camId)?.local === 'Portarias');
  const simulate = () => {
    const r = RESOURCES.find((x) => x.id === res)!;
    const base = accessDecision(p);
    if (!base.ok) return setSim({ ...base, res: r.label });
    if (r.need && !p.types.some((t) => r.need!.includes(t))) return setSim({ ok: false, why: `Nenhum tipo da pessoa tem permissão em ${r.label} (regra por TIPO).`, res: r.label });
    setSim({ ok: true, why: r.need ? `Permitido pelo tipo ${p.types.filter((t) => r.need!.includes(t)).map(typeName).join(', ')}.` : 'Recurso liberado para cadastros ativos com credencial.', res: r.label });
  };

  return (
    <div className="idp-grid">
      <div className="idp-two">
        <Box title="Situação de acesso" sub="Decisão atual com as permissões vigentes" icon="shield">
          <div className={`idp-dec${d.ok ? '' : ' is-no'}`}>
            <Icon name={d.ok ? 'successFill' : 'errorFill'} size={22} />
            <span className="dv-two"><b>{d.ok ? 'Permitido' : 'Negado'}</b><span>{d.why}</span></span>
          </div>
          <p className="dv-muted">Precedência PESSOA → GRUPO → TIPO; uma negação sempre vence. Use a simulação para testar um recurso.</p>
        </Box>
        <Box title="Simular acesso" sub="Teste a decisão para um recurso" icon="play">
          <div className="idp-sim">
            <div className="dv-field"><span className="dv-field__l">Recurso</span>
              <Select label="Recurso" value={res} onChange={(v) => { setRes(v); setSim(null); }} options={RESOURCES.map((r) => ({ value: r.id, label: r.label }))} />
            </div>
            <Button variant="primary" icon="play" onClick={simulate}>Simular</Button>
          </div>
          {sim ? (
            <div className={`idp-dec is-sm${sim.ok ? '' : ' is-no'}`}>
              <Icon name={sim.ok ? 'successFill' : 'errorFill'} size={18} />
              <span className="dv-two"><b>{sim.ok ? 'Permitido' : 'Negado'} · {sim.res}</b><span>{sim.why}</span></span>
            </div>
          ) : <p className="dv-muted">Escolha um recurso e simule para ver a decisão.</p>}
        </Box>
      </div>
      <div className="idp-two">
        <Box title="Credenciais" sub="Cartões, QR Codes e facial" icon="idcard" n={p.creds.length}>
          {p.creds.length ? (
            <ul className="lc-dlist">
              {p.creds.map((c) => {
                const soon = c.status === 'ativa' && c.until != null && c.until - NOW < 30 * D;
                return (
                  <li key={c.id}>
                    <span className="dv-kind"><Icon name={c.kind === 'Facial' ? 'faces' : c.kind === 'QR Code' ? 'grid' : 'idcard'} size={14} /></span>
                    <span className="dv-name"><b>{c.kind}<span className="id-mono idp-code">{c.code}</span></b><span className={soon ? 'idp-warn' : undefined}>{c.until ? `${c.status === 'ativa' ? 'Válida até' : 'Venceu em'} ${fmtDay(c.until)}` : 'Sem vencimento'}</span></span>
                    <span className={`id-st is-${c.status === 'ativa' ? 'ok' : c.status === 'vencida' ? 'warn' : 'off'}`}><i />{c.status === 'ativa' ? 'Ativa' : c.status === 'vencida' ? 'Vencida' : 'Revogada'}</span>
                  </li>
                );
              })}
            </ul>
          ) : <Empty icon="idcard" title="Nenhuma credencial emitida" />}
        </Box>
        <Box title="Passagens" sub={`Portarias · ${win.replace('d', ' dias')}`} icon="door" n={passes.length}>
          {passes.length ? (
            <ul className="lc-dlist idp-passes">
              {passes.slice(0, 6).map((s, i) => (
                <li key={i}><span className="dv-name"><b>{camShort(s.camId)}</b><span>{fmtDT(s.at)}</span></span><span className="id-st is-ok"><i />Liberada</span></li>
              ))}
            </ul>
          ) : <Empty icon="door" title="Nenhuma passagem confirmada" text="Sem registro nas portarias neste período." />}
        </Box>
      </div>
      <div className="idp-three">
        <Box title="Qualificações" sub="Treinamentos e certificações" icon="check" n={p.qualifications.length}>
          {p.qualifications.length ? <ul className="idp-plain">{p.qualifications.map((q) => <li key={q}>{q}</li>)}</ul> : <Empty icon="check" title="Nenhuma qualificação registrada" />}
        </Box>
        <Box title="Atribuições" sub="Ordens de serviço em andamento" icon="wrench" n={p.assignments.length}>
          {p.assignments.length ? <ul className="idp-plain">{p.assignments.map((q) => <li key={q}>{q}</li>)}</ul> : <Empty icon="wrench" title="Sem ordem de serviço" />}
        </Box>
        <Box title="LGPD e consentimentos" sub="Tratamento de dados sensíveis (art. 5º, II)" icon="lock" n={p.consents.length}>
          {p.consents.length ? (
            <ul className="idp-plain">{p.consents.map((c, i) => <li key={i}><b>{c.purpose}</b><span>Concedido em {fmtDay(c.at)} · {c.until ? `até ${fmtDay(c.until)}` : 'sem vencimento'}</span></li>)}</ul>
          ) : <Empty icon="lock" title="Nenhum consentimento registrado" text={p.photo != null ? 'Há foto de referência sem consentimento registrado.' : undefined} />}
        </Box>
      </div>
    </div>
  );
}
