import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, PageHeader, Segmented } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { sceneUrl } from '../mural/scene';
import { ENGINES, STATE_LABEL as ENG_LABEL, STATE_RANK, stateOf as engState } from '../engines/data';
import { KIND, REASON, ago, subtitle, title } from '../alerts/data';
import { PRIO_LABEL, PRIO_RANK, STAGE_LABEL, late } from '../occurrences/data';
import { CampusMap, type View } from './CampusMap';
import {
  H, HOT, NOW, OCCS, PENDING, STATE_LABEL, alertCamName, buildCams, byKind, camByLooseName, camOfAlert, hourly, loadPos, savePos,
  type CamState, type MapCam,
} from './data';
import './dashboard.css';

type Tab = 'mapa' | 'mosaico' | 'lista';
type Filter = 'all' | 'on' | 'off';
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const hb = (s: number | null) => (s == null ? '—' : s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const isOn = (s: CamState) => s === 'on' || s === 'instavel';
const fmt = (n: number) => n.toLocaleString('pt-BR');

/* ───────────── KPIs ───────────── */
function Kpi({ icon, label, value, sub, tone, onClick }: { icon: IconName; label: string; value: string; sub: string; tone?: 'ok' | 'bad' | 'warn'; onClick: () => void }) {
  return (
    <button type="button" className={`pd-kpi${tone ? ` is-${tone}` : ''}`} onClick={onClick}>
      <span className="pd-kpi__top"><Icon name={icon} size={16} />{label}</span>
      <b>{value}</b>
      <span className="pd-kpi__sub">{sub}</span>
    </button>
  );
}

/* ───────────── Ritmo de alertas (24 h) ───────────── */
function Rhythm() {
  const data = useMemo(hourly, []);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.n), 1);
  const avg = Math.round(data.reduce((s, d) => s + d.n, 0) / data.length);
  const cur = data[data.length - 1].n;
  const ticks = [0, 6, 12, 18, 23];
  return (
    <section className="pd-card">
      <header className="pd-card__head">
        <h2>Ritmo de alertas</h2><span className="pd-card__hint">últimas 24 h, por hora</span>
      </header>
      <div className="pd-rhythm__stats">
        <div><b>{cur}</b><span>nesta hora</span></div>
        <div><b>{avg}</b><span>média por hora</span></div>
        <div className={cur > avg * 1.3 ? 'is-up' : ''}><b>{cur > avg ? `+${Math.round(((cur - avg) / Math.max(avg, 1)) * 100)}%` : `${Math.round(((cur - avg) / Math.max(avg, 1)) * 100)}%`}</b><span>vs. média</span></div>
      </div>
      <div className="pd-bars" onMouseLeave={() => setHover(null)}>
        <div className="pd-bars__avg" style={{ bottom: `${(avg / max) * 100}%` }}><span>média</span></div>
        {data.map((d, i) => (
          <div key={d.t} className={`pd-bars__col${hover === i ? ' is-hover' : ''}${i === data.length - 1 ? ' is-now' : ''}`} onMouseEnter={() => setHover(i)}>
            <i style={{ height: `${Math.max(2, (d.n / max) * 100)}%` }} />
          </div>
        ))}
        {hover != null && (
          <div className="pd-tip" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
            <b>{fmt(data[hover].n)} alertas</b>
            <span>{pad(new Date(data[hover].t).getHours())}:00 – {pad((new Date(data[hover].t).getHours() + 1) % 24)}:00</span>
          </div>
        )}
      </div>
      <div className="pd-bars__axis">
        {ticks.map((i) => <span key={i} style={{ left: `${((i + 0.5) / data.length) * 100}%` }}>{i === 23 ? 'agora' : `${pad(new Date(data[i].t).getHours())}h`}</span>)}
      </div>
    </section>
  );
}

/* ───────────── Motivos (24 h) ───────────── */
function Reasons({ onOpen }: { onOpen: () => void }) {
  const data = useMemo(byKind, []);
  const max = Math.max(...data.map((d) => d.n), 1);
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <section className="pd-card">
      <header className="pd-card__head">
        <h2>O que mais disparou</h2><span className="pd-card__hint">{fmt(total)} em 24 h</span>
        <button type="button" className="pd-link" onClick={onOpen}>Ver fila<Icon name="chevron" size={14} /></button>
      </header>
      <ul className="pd-hbars">
        {data.slice(0, 6).map((d) => (
          <li key={d.kind} title={`${d.label}: ${fmt(d.n)} (${Math.round((d.n / total) * 100)}%)`}>
            <span className="pd-hbars__lbl"><Icon name={KIND[d.kind].icon} size={14} />{d.label}</span>
            <span className="pd-hbars__track"><i style={{ width: `${(d.n / max) * 100}%` }} /></span>
            <b>{fmt(d.n)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Saúde dos sistemas ───────────── */
function Systems({ onOpen }: { onOpen: () => void }) {
  const list = ENGINES.filter((e) => engState(e) !== 'unconfigured').sort((a, b) => STATE_RANK[engState(a)] - STATE_RANK[engState(b)]);
  const up = list.filter((e) => engState(e) === 'up').length;
  return (
    <section className="pd-card">
      <header className="pd-card__head">
        <h2>Saúde dos sistemas</h2><span className="pd-card__hint">{up} de {list.length} no ar</span>
        <button type="button" className="pd-link" onClick={onOpen}>Engines<Icon name="chevron" size={14} /></button>
      </header>
      <div className="pd-sys__strip" aria-hidden="true">
        {list.map((e) => <i key={e.slug} className={`is-${engState(e)}`} />)}
      </div>
      <ul className="pd-list">
        {list.filter((e) => engState(e) !== 'up').map((e) => (
          <li key={e.slug} className="pd-row">
            <span className={`pd-dot is-${engState(e)}`} />
            <span className="pd-row__main"><b>{e.name}</b><small>{e.payload && 'error' in e.payload ? String(e.payload.error) : e.status_code ? `HTTP ${e.status_code}` : `Latência ${e.latency_ms} ms`}</small></span>
            <span className={`pd-tag is-${engState(e)}`}>{ENG_LABEL[engState(e)]}</span>
          </li>
        ))}
        <li className="pd-row is-quiet">
          <span className="pd-dot is-up" />
          <span className="pd-row__main"><b>{up} serviços no ar</b><small>Vídeo, faces, placas, busca e notificações</small></span>
        </li>
      </ul>
    </section>
  );
}

/* ───────────── Página ───────────── */
export function DashboardPage({ screen }: { screen: Screen }) {
  const nav = useNavigate();
  const { toast } = useUi();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const [pos, setPos] = useState(loadPos);
  const cams = useMemo(() => buildCams(pos), [pos]);
  const [tab, setTab] = useState<Tab>('mapa');
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>('3d');
  const [moving, setMoving] = useState(false);
  const [heat, setHeat] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  const onCount = cams.filter((c) => isOn(c.state)).length;
  const offCams = cams.filter((c) => !isOn(c.state)).sort((a, b) => (b.dev.hb ?? 0) - (a.dev.hb ?? 0));
  const shown = cams.filter((c) => (filter === 'all' ? true : filter === 'on' ? isOn(c.state) : !isOn(c.state)));
  const visible = useMemo(() => new Set(shown.map((c) => c.id)), [shown.map((c) => c.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = (id: string | undefined) => {
    if (!id) { toast('Câmera sem posição no mapa'); return; }
    setTab('mapa'); setFilter('all'); setSel(id); setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  };

  const openOcc = OCCS.filter((o) => o.stage === 'nova' || o.stage === 'despachada' || o.stage === 'no_local')
    .sort((a, b) => PRIO_RANK[a.prio] - PRIO_RANK[b.prio] || b.at - a.at);
  const lateN = openOcc.filter((o) => late(o, NOW)).length;
  const pend1h = PENDING.filter((a) => a.at > NOW - H).length;
  const engs = ENGINES.filter((e) => engState(e) !== 'unconfigured');
  const engUp = engs.filter((e) => engState(e) === 'up').length;

  const popup = (c: MapCam) => (
    <div className="pm-card">
      <div className={`pm-card__img${isOn(c.state) ? '' : ' is-off'}`}>
        {isOn(c.state) ? <img src={sceneUrl(c)} alt="" /> : <span><Icon name="nosignal" size={22} />Sem vídeo</span>}
        {isOn(c.state) && <em className="pm-live"><i />AO VIVO</em>}
      </div>
      <div className="pm-card__body">
        <b>{c.name}</b>
        <span className="pm-card__meta"><span className={`pd-dot is-${c.state}`} />{STATE_LABEL[c.state]} · {c.area}</span>
        <dl>
          <div><dt>Alertas 24 h</dt><dd>{c.alerts24}</dd></div>
          <div><dt>Última hora</dt><dd>{c.alerts1h}</dd></div>
          <div><dt>Heartbeat</dt><dd>{hb(c.dev.hb)}</dd></div>
        </dl>
        {c.dev.note && <p className="pm-card__note">{c.dev.note}</p>}
        <div className="pm-card__acts">
          <Button variant="primary" icon="tv" onClick={() => nav('/mural-de-video')}>Ver no mural</Button>
          <Button icon="replay" onClick={() => toast(`Gravações de ${c.name}: abertas no protótipo`)}>Gravações</Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title={screen.label}
        description={`UniBrasil · Campus Tarumã · atualizado às ${clock(now)}`}
        actions={<>
          <Button icon="tv" onClick={() => nav('/mural-de-video')}>Mural de vídeo</Button>
          <Button variant="primary" icon="alert" onClick={() => nav('/alertas')}>Triar alertas</Button>
        </>}
      />
      <div className="nx-page pd">
        <div className="pd-kpis">
          <Kpi icon="alert" label="Alertas pendentes" value={fmt(PENDING.length)} sub={`+${pend1h} na última hora`} onClick={() => nav('/alertas')} />
          <Kpi icon="flash" label="Prioridade alta" value={fmt(HOT.length)} sub="watchlist, placa e objeto" tone={HOT.length ? 'bad' : undefined} onClick={() => nav('/alertas')} />
          <Kpi icon="ocor" label="Ocorrências em aberto" value={String(openOcc.length)} sub={lateN ? `${lateN} fora do prazo` : 'todas no prazo'} tone={lateN ? 'warn' : undefined} onClick={() => nav('/alertas')} />
          <Kpi icon="camera" label="Câmeras no ar" value={`${onCount}/${cams.length}`} sub={`${Math.round((onCount / cams.length) * 100)}% do parque`} tone="ok" onClick={() => { setTab('mapa'); setFilter('on'); }} />
          <Kpi icon="nosignal" label="Câmeras fora do ar" value={String(offCams.length)} sub={offCams[0] ? `mais antiga: ${hb(offCams[0].dev.hb)}` : 'nenhuma'} tone={offCams.length ? 'bad' : undefined} onClick={() => { setTab('mapa'); setFilter('off'); }} />
          <Kpi icon="server" label="Engines no ar" value={`${engUp}/${engs.length}`} sub={`${engs.length - engUp} com problema`} tone={engs.length - engUp ? 'warn' : 'ok'} onClick={() => nav('/engines')} />
        </div>

        <div className="pd-grid">
          <section className="pd-card pd-mapcard">
            <div className="pd-mapbar">
              <Segmented label="Visualização" value={tab} onChange={setTab} options={[
                { value: 'mapa', label: <><Icon name="map" size={14} />Mapa 3D</> },
                { value: 'mosaico', label: <><Icon name="grid" size={14} />Mosaico ao vivo</> },
                { value: 'lista', label: <><Icon name="camera" size={14} />Câmeras</> },
              ]} />
              <div className="pd-chips" role="radiogroup" aria-label="Filtrar câmeras">
                {([['all', 'Todas', cams.length], ['on', 'No ar', onCount], ['off', 'Fora do ar', offCams.length]] as [Filter, string, number][]).map(([k, l, n]) => (
                  <button key={k} type="button" role="radio" aria-checked={filter === k} className={`pd-chip${filter === k ? ' is-on' : ''}${k !== 'all' ? ` k-${k}` : ''}`} onClick={() => setFilter(k)}>
                    {k !== 'all' && <i />}{l}<b>{n}</b>
                  </button>
                ))}
              </div>
            </div>

            {tab === 'mapa' && (
              <CampusMap cams={cams} visible={visible} selected={sel} onSelect={setSel} view={view} moving={moving} heat={heat} focus={focus} popup={popup}
                onMoved={(id, p) => { const next = { ...pos, [id]: p }; setPos(next); savePos(next); }}>
                <div className="pm-title">Campus Tarumã · mapa tático 3D</div>
                <div className="pm-tools">
                  <button type="button" className={moving ? 'is-on' : ''} onClick={() => { setMoving((v) => !v); setSel(null); }} title="Arraste os pins para corrigir a posição das câmeras">
                    <Icon name="drag" size={14} />{moving ? 'Concluir' : 'Mover'}
                  </button>
                  <button type="button" className={heat ? 'is-on' : ''} onClick={() => setHeat((v) => !v)} title="Concentração de alertas nas últimas 24 h">
                    <Icon name="flash" size={14} />Calor
                  </button>
                  <span className="pm-tools__sep" />
                  <button type="button" className={view === '3d' ? 'is-on' : ''} onClick={() => setView('3d')}><Icon name="stack" size={14} />3D</button>
                  <button type="button" className={view === 'top' ? 'is-on' : ''} onClick={() => setView('top')}><Icon name="map" size={14} />Topo</button>
                </div>
                {moving && <div className="pm-hint"><Icon name="drag" size={14} />Arraste os pins para a posição real. Fica salvo neste navegador.{Object.keys(pos).length > 0 && <button type="button" onClick={() => { setPos({}); savePos({}); }}>Restaurar posições</button>}</div>}
                <div className="pm-legend">
                  <span><i className="is-on" />No ar</span>
                  <span><i className="is-instavel" />Instável</span>
                  <span><i className="is-off" />Fora do ar</span>
                  <span><i className="is-manut" />Manutenção</span>
                  <span><em>3</em>Alertas na última hora</span>
                </div>
              </CampusMap>
            )}

            {tab === 'mosaico' && (
              <div className="pd-mosaic">
                {shown.map((c) => (
                  <button key={c.id} type="button" className={`pd-tile${isOn(c.state) ? '' : ' is-off'}`} onClick={() => locate(c.id)} title="Localizar no mapa">
                    {isOn(c.state) ? <img src={sceneUrl(c)} alt="" loading="lazy" /> : <span className="pd-tile__off"><Icon name="nosignal" size={20} />Sem vídeo</span>}
                    <span className="pd-tile__name"><span className={`pd-dot is-${c.state}`} />{c.name}</span>
                    {c.alerts1h > 0 && <em className="pd-tile__n">{c.alerts1h}</em>}
                  </button>
                ))}
              </div>
            )}

            {tab === 'lista' && (
              <div className="pd-table">
                <div className="pd-tr pd-th"><span>Câmera</span><span>Situação</span><span>Heartbeat</span><span>Alertas 24 h</span><span /></div>
                <div className="pd-tbody">
                  {[...shown].sort((a, b) => Number(isOn(a.state)) - Number(isOn(b.state)) || b.alerts24 - a.alerts24).map((c) => (
                    <div key={c.id} className="pd-tr">
                      <span className="pd-row__main"><b>{c.name}</b><small>{c.area} · {c.dev.camType}</small></span>
                      <span className={`pd-tag is-${c.state}`}><span className={`pd-dot is-${c.state}`} />{STATE_LABEL[c.state]}</span>
                      <span className="pd-num">{hb(c.dev.hb)}</span>
                      <span className="pd-num">{c.alerts24}</span>
                      <button type="button" className="pd-link" onClick={() => locate(c.id)}><Icon name="pin" size={14} />Mapa</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="pd-side">
            <section className="pd-card">
              <header className="pd-card__head">
                <h2>Ocorrências em aberto</h2><span className="pd-card__hint">{openOcc.length}</span>
                <button type="button" className="pd-link" onClick={() => nav('/alertas')}>Todas<Icon name="chevron" size={14} /></button>
              </header>
              <ul className="pd-list">
                {openOcc.slice(0, 5).map((o) => {
                  const cam = camByLooseName(o.cam);
                  const isLate = late(o, now);
                  return (
                    <li key={o.id} className={`pd-row is-click${isLate ? ' is-late' : ''}`} onClick={() => locate(cam?.id)}>
                      <span className={`pd-prio is-${o.prio}`} title={`Prioridade ${PRIO_LABEL[o.prio]}`} />
                      <span className="pd-row__main">
                        <b>{o.title}</b>
                        <small>{STAGE_LABEL[o.stage]}{o.team ? ` · ${o.team}` : ''} · {o.local}</small>
                      </span>
                      <span className={`pd-time${isLate ? ' is-late' : ''}`}>{isLate && <Icon name="clock" size={12} />}{ago(o.at, now)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="pd-card pd-grow">
              <header className="pd-card__head">
                <h2>Alertas de alta prioridade</h2><span className="pd-card__hint">pendentes</span>
                <button type="button" className="pd-link" onClick={() => nav('/alertas')}>Triar<Icon name="chevron" size={14} /></button>
              </header>
              <ul className="pd-list pd-scroll">
                {HOT.slice(0, 12).map((a) => (
                  <li key={a.id} className="pd-row is-click" onClick={() => locate(camOfAlert(a)?.id)}>
                    <span className={`pd-ic is-${REASON[a.kind].tone}`}><Icon name={KIND[a.kind].icon} size={14} /></span>
                    <span className="pd-row__main">
                      <b>{title(a)}</b>
                      <small>{subtitle(a)} · {alertCamName(a)}</small>
                    </span>
                    <span className="pd-time">{ago(a.at, now)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="pd-bottom">
          <Rhythm />
          <Reasons onOpen={() => nav('/alertas')} />
          <section className="pd-card">
            <header className="pd-card__head">
              <h2>Câmeras fora do ar</h2><span className="pd-card__hint">{offCams.length}</span>
              <button type="button" className="pd-link" onClick={() => nav('/dispositivos')}>Dispositivos<Icon name="chevron" size={14} /></button>
            </header>
            <ul className="pd-list">
              {offCams.map((c) => (
                <li key={c.id} className="pd-row is-click" onClick={() => locate(c.id)}>
                  <span className={`pd-dot is-${c.state}`} />
                  <span className="pd-row__main"><b>{c.name}</b><small>{c.dev.note ?? STATE_LABEL[c.state]}</small></span>
                  <span className="pd-time">{hb(c.dev.hb)}</span>
                </li>
              ))}
              {offCams.length === 0 && <li className="pd-row is-quiet"><span className="pd-dot is-on" />Todas as câmeras estão no ar</li>}
            </ul>
          </section>
          <Systems onOpen={() => nav('/engines')} />
        </div>
      </div>
    </>
  );
}
