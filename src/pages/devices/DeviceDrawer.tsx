import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Icon, IconButton, Menu, NavItem, Segmented } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { CAM_BY_ID } from '../mural/data';
import { sceneUrl } from '../mural/scene';
import { availability, eventsFor, KIND_ICON, KIND_LABEL, latencySeries, profileFor, TYPE_BY_NAME, type Device, type Situacao } from './data';
import { ago, ConnPill, copy, latTone, SitBadge } from './parts';

type Tab = 'geral' | 'saude' | 'conexao' | 'eventos';
type Props = {
  d: Device;
  onClose: () => void;
  onMural: () => void;
  onRestart: () => void;
  onEdit: () => void;
  onSituacao: (s: Situacao) => void;
  onDelete: () => void;
};

const fmtTime = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/** Painel lateral com tudo sobre um dispositivo, sem sair da lista. */
export function DeviceDrawer({ d, onClose, onMural, onRestart, onEdit, onSituacao, onDelete }: Props) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('geral');
  const [more, setMore] = useState<HTMLElement | null>(null);
  const cam = d.camId ? CAM_BY_ID[d.camId] : undefined;
  const inactive = d.situacao === 'inativo';

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-menu')) return;
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <aside className="dv-drawer" aria-label={`Detalhes de ${d.name}`}>
      <header className="dv-drawer__head">
        <span className={`dv-kind is-${d.kind} is-lg`}><Icon name={KIND_ICON[d.kind]} size={20} /></span>
        <div className="dv-drawer__title">
          <h2 title={d.name}>{d.name}</h2>
          <p>{d.type} · {KIND_LABEL[d.kind]}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__status">
        <SitBadge s={d.situacao} />
        <ConnPill d={d} />
        {!inactive && <span className="dv-drawer__hb">Heartbeat {ago(d.hb)}</span>}
      </div>
      {d.note && (
        <Alert type={d.situacao !== 'ativo' ? 'information' : d.conn === 'offline' ? 'error' : d.conn === 'instavel' ? 'warning' : 'information'}>{d.note}</Alert>
      )}

      <div className="dv-drawer__acts">
        {d.camId && <Button icon="tv" onClick={onMural} disabled={inactive}>Ver no mural</Button>}
        {d.camId && <Button icon="replay" onClick={onRestart} disabled={inactive}>Reiniciar</Button>}
        <Button icon="edit" onClick={onEdit}>Editar</Button>
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
      </div>

      <div className="dv-drawer__tabs">
        <Segmented label="Seções" value={tab} onChange={setTab} size="sm" options={[
          { value: 'geral', label: 'Visão geral' },
          { value: 'saude', label: 'Saúde' },
          { value: 'conexao', label: 'Conexão' },
          { value: 'eventos', label: 'Eventos' },
        ]} />
      </div>

      <div className="dv-drawer__body" key={tab}>
        {tab === 'geral' && (
          <>
            {cam && (
              <div className={`dv-prev${d.stream !== 'live' || inactive ? ' is-off' : ''}`}>
                {d.stream === 'live' && !inactive
                  ? <><img src={sceneUrl(cam)} alt={`Imagem ao vivo de ${d.name}`} /><span className="dv-prev__live"><i />AO VIVO</span></>
                  : <span className="dv-prev__off"><Icon name="nosignal" size={24} />Sem vídeo {d.hb != null ? `desde ${ago(d.hb).replace('há ', 'há ')}` : ''}</span>}
              </div>
            )}
            <dl className="dv-info">
              <Info k="Fabricante" v={d.vendor} />
              <Info k="Modelo" v={d.model} />
              <Info k="Categoria" v={TYPE_BY_NAME[d.type]?.category ?? KIND_LABEL[d.kind]} />
              <Info k="Driver" v={<code className="dv-code">{profileFor(d).driver}</code>} />
              <Info k="Integração" v={d.certified ? <span className="dv-cert is-on"><Icon name="check" size={12} />Certificado</span> : <span className="dv-cert">Genérico (ONVIF/RTSP)</span>} />
              <Info k="Firmware" v={d.firmware} />
              <Info k="Local" v={`${d.local} · ${d.area}`} />
              <Info k="Ambiente" v={d.outdoor ? 'Externo' : 'Interno'} />
              <Info k="Endereço IP" v={<CopyVal v={d.ip} what="IP copiado" />} />
              <Info k="Cadastrado em" v={new Date(d.added + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
            </dl>
          </>
        )}
        {tab === 'saude' && <Health d={d} />}
        {tab === 'conexao' && <Connection d={d} />}
        {tab === 'eventos' && <Events d={d} />}
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          <NavItem role="menuitem" icon="copy" label="Copiar IP" onClick={() => { setMore(null); copy(d.ip, toast, 'IP copiado'); }} />
          <NavItem role="menuitem" icon="alert" label="Ver alertas deste dispositivo" onClick={() => { setMore(null); toast('Abre a Fila de alertas filtrada · simulado no protótipo'); }} />
          <div className="nx-menu__sep" />
          {d.situacao === 'manutencao'
            ? <NavItem role="menuitem" icon="check" label="Encerrar manutenção" onClick={() => { setMore(null); onSituacao('ativo'); }} />
            : d.situacao === 'ativo' && <NavItem role="menuitem" icon="wrench" label="Colocar em manutenção" onClick={() => { setMore(null); onSituacao('manutencao'); }} />}
          {inactive
            ? <NavItem role="menuitem" icon="play" label="Reativar" onClick={() => { setMore(null); onSituacao('ativo'); }} />
            : <NavItem role="menuitem" icon="eyeOff" label="Desativar" onClick={() => { setMore(null); onSituacao('inativo'); }} />}
          <NavItem role="menuitem" icon="trash" label="Excluir" className="is-danger" onClick={() => { setMore(null); onDelete(); }} />
        </Menu>
      )}
    </aside>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="dv-info__row"><dt>{k}</dt><dd>{v}</dd></div>;
}

function CopyVal({ v, what, mono = true }: { v: string; what: string; mono?: boolean }) {
  const { toast } = useUi();
  return (
    <button type="button" className={`dv-copyval${mono ? ' is-mono' : ''}`} onClick={() => copy(v, toast, what)} title="Copiar">
      <span>{v}</span><Icon name="copy" size={14} />
    </button>
  );
}

function Health({ d }: { d: Device }) {
  const av = useMemo(() => availability(d), [d]);
  const lat = useMemo(() => latencySeries(d), [d]);
  if (d.situacao === 'inativo') return <p className="dv-muted">Dispositivo inativo: a saúde não é monitorada. Reative para voltar a receber heartbeat e alertas.</p>;
  const max = Math.max(...lat, 100);
  const pts = lat.map((v, i) => `${(i / (lat.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ');
  const avg = Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
  return (
    <>
      <div className="dv-stats">
        <div><span>Disponibilidade 30 d</span><b className={d.uptime >= 99 ? 'is-ok' : d.uptime >= 95 ? 'is-warn' : 'is-bad'}>{d.uptime.toFixed(2).replace('.', ',')}%</b></div>
        <div><span>Latência agora</span><b className={latTone(d.latency)}>{d.latency ?? '—'}{d.latency != null && <small> ms</small>}</b></div>
        <div><span>Último heartbeat</span><b>{ago(d.hb)}</b></div>
      </div>

      <section className="dv-sec">
        <div className="dv-sec__head"><h3>Disponibilidade · últimas 24 h</h3><span className="dv-legend"><i className="is-ok" />ok <i className="is-warn" />instável <i className="is-bad" />fora</span></div>
        <div className="dv-avail" role="img" aria-label="Disponibilidade em blocos de 30 minutos">
          {av.map((s, i) => <i key={i} className={`is-${s}`} title={`${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`} />)}
        </div>
        <div className="dv-axis"><span>24 h atrás</span><span>agora</span></div>
      </section>

      <section className="dv-sec">
        <div className="dv-sec__head"><h3>Latência · últimas 24 h</h3><span className="dv-muted">média {avg} ms</span></div>
        <svg className="dv-spark" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={`Latência média de ${avg} ms`}>
          <line x1="0" x2="100" y1={40 - (300 / max) * 36} y2={40 - (300 / max) * 36} className="dv-spark__lim" />
          <polyline points={`0,40 ${pts} 100,40`} className="dv-spark__area" />
          <polyline points={pts} className="dv-spark__line" />
        </svg>
        <div className="dv-axis"><span>24 h atrás</span><span className="dv-muted">limite 300 ms</span><span>agora</span></div>
      </section>
    </>
  );
}

function Connection({ d }: { d: Device }) {
  const { toast } = useUi();
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<'idle' | 'run' | 'ok' | 'fail'>('idle');
  const pass = 'Nyv3x#2026';
  const rtsp = `rtsp://${d.user}:${show ? pass : '••••••'}@${d.ip}:${d.port}/Streaming/Channels/101`;
  const run = () => {
    setTest('run');
    setTimeout(() => setTest(d.conn === 'offline' || d.situacao === 'inativo' ? 'fail' : 'ok'), 1100);
  };
  return (
    <>
      <dl className="dv-info">
        <Info k="Endereço IP" v={<CopyVal v={d.ip} what="IP copiado" />} />
        <Info k="Porta" v={String(d.port)} />
        <Info k="MAC" v={<CopyVal v={d.mac} what="MAC copiado" />} />
        <Info k="Usuário" v={d.user} />
        <Info k="Senha" v={<span className="dv-pass">{show ? pass : '••••••••••'}<IconButton icon={show ? 'eyeOff' : 'eye'} label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(!show)} tipPlace="top" /></span>} />
      </dl>
      {d.kind === 'camera' && (
        <section className="dv-sec">
          <div className="dv-sec__head"><h3>URL do stream (RTSP)</h3></div>
          <button type="button" className="dv-rtsp" onClick={() => { navigator.clipboard?.writeText(rtsp.replace('••••••', pass)).catch(() => {}); toast('URL RTSP copiada'); }}>
            <code>{rtsp}</code><Icon name="copy" size={14} />
          </button>
        </section>
      )}
      <section className="dv-sec">
        <div className="dv-sec__head"><h3>Teste de conexão</h3></div>
        {test === 'ok' || test === 'fail'
          ? <Alert type={test === 'ok' ? 'success' : 'error'} title={test === 'ok' ? `Respondeu em ${d.latency ?? 20} ms` : `Sem resposta em ${d.ip}:${d.port}`}
              action={<Button onClick={run}>Testar de novo</Button>}>
              {test === 'ok' ? `Credenciais válidas${d.kind === 'camera' ? ' · stream H.264 1080p' : ''}.` : 'Confira cabo, energia e rede.'}
            </Alert>
          : (
            <div className="dv-testrow">
              <span>{test === 'run' ? <><Icon name="refresh" size={14} className="is-spin" />Testando {d.ip}…</> : 'Verifica se o dispositivo responde e se as credenciais estão corretas.'}</span>
              <Button icon="activity" onClick={run} disabled={test === 'run'}>Testar conexão</Button>
            </div>
          )}
      </section>
    </>
  );
}

function Events({ d }: { d: Device }) {
  const ev = useMemo(() => eventsFor(d), [d]);
  return (
    <ol className="dv-events">
      {ev.map((e, i) => (
        <li key={i} className={`is-${e.tone}`}>
          <i />
          <div><b>{e.text}</b><span>{fmtTime(e.at)}</span></div>
        </li>
      ))}
    </ol>
  );
}
