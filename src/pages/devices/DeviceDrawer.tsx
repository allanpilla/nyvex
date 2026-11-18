import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Icon, IconButton, Menu, NavItem, Segmented, useTooltip, useTooltipApi } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { CAM_BY_ID } from '../mural/data';
import { sceneUrl } from '../mural/scene';
import { availability, categoryOf, eventsFor, KIND_ICON, latencySeries, typeOf, uptimeTone, type Device, type Situacao } from './data';
import { ago, copy, latTone, StatusPill } from './parts';
import type { IconName } from '../../ds/icons/icons';

type Tab = 'geral' | 'saude' | 'log';
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
          <h2>{d.name}</h2>
          <p>{categoryOf(d)} · {typeOf(d)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__status">
        <StatusPill d={d} />
      </div>
      {d.note && (
        <Alert type={d.situacao !== 'ativo' ? 'information' : d.conn === 'offline' ? 'error' : d.conn === 'instavel' ? 'warning' : 'information'}>{d.note}</Alert>
      )}

      <div className="dv-drawer__acts">
        <Button icon="edit" onClick={onEdit}>Editar</Button>
        {d.camId && <Button icon="tv" onClick={onMural} disabled={inactive}>Ver no mural</Button>}
        {d.camId && <Button icon="replay" onClick={onRestart} disabled={inactive}>Reiniciar</Button>}
        {d.camId && <IconButton icon="sliders" label="Ajustes de câmera" onClick={() => toast('Ajustes de câmera: brilho, contraste, foco e perfil de stream · simulado no protótipo')} tipPlace="bottom" disabled={inactive} />}
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
      </div>

      <div className="dv-drawer__tabs">
        <Segmented label="Seções" value={tab} onChange={setTab} size="sm" options={[
          { value: 'geral', label: 'Visão geral' },
          { value: 'saude', label: 'Saúde' },
          { value: 'log', label: 'Log' },
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
              <Info k="Categoria" v={categoryOf(d)} />
              <Info k="Tipo" v={typeOf(d)} />
              <Info k="Firmware" v={d.firmware} />
              <Info k="IP" v={<CopyVal v={d.ip} what="IP copiado" />} />
              <Info k="MAC address" v={<CopyVal v={d.mac} what="MAC copiado" />} />
              <Info k="Cadastrado em" v={new Date(d.added + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
            </dl>
          </>
        )}
        {tab === 'saude' && <Health d={d} />}
        {tab === 'log' && <Events d={d} />}
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
  const tip = useTooltip('Copiar', undefined, true, 'top');
  return (
    <button type="button" className={`dv-copyval${mono ? ' is-mono' : ''}`} onClick={() => copy(v, toast, what)} {...tip}>
      <span>{v}</span><Icon name="copy" size={14} />
    </button>
  );
}

function Health({ d }: { d: Device }) {
  const av = useMemo(() => availability(d), [d]);
  const lat = useMemo(() => latencySeries(d), [d]);
  const tipApi = useTooltipApi();
  if (d.situacao === 'inativo') return <p className="dv-muted">Dispositivo desativado: a saúde não é monitorada. Reative para voltar a receber sinal e alertas.</p>;
  const avg = Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
  return (
    <>
      <div className="dv-tele is-3">
        <Stat icon="clock" k="Latência" v={<b className={latTone(d.latency)}>{d.latency ?? '—'}{d.latency != null && <small> ms</small>}</b>} sub={`Média 24 h: ${avg} ms`} />
        <Stat icon="signal" k="Último sinal" v={<b>{ago(d.hb)}</b>} />
        <Stat icon="check" k="Disponibilidade 30 d" v={<b className={uptimeTone(d.uptime)}>{d.uptime.toFixed(2).replace('.', ',')}%</b>} />
      </div>

      <section className="dv-sec">
        <div className="dv-sec__head"><h3>Disponibilidade · últimas 24 h</h3><span className="dv-legend"><i className="is-ok" />ok <i className="is-warn" />instável <i className="is-bad" />fora</span></div>
        <div className="dv-avail" role="img" aria-label="Disponibilidade em blocos de 30 minutos">
          {av.map((s, i) => <i key={i} className={`is-${s}`} onMouseEnter={(e) => tipApi.show(e.currentTarget, `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'} · ${s === 'ok' ? 'ok' : s === 'warn' ? 'instável' : 'fora'}`, undefined, 'top')} onMouseLeave={tipApi.hide} />)}
        </div>
        <div className="dv-axis"><span>24 h atrás</span><span>agora</span></div>
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

function Stat({ icon, k, v, sub }: { icon: IconName; k: string; v: React.ReactNode; sub?: string }) {
  return (
    <div className="dv-stat">
      <span className="dv-stat__k"><Icon name={icon} size={14} />{k}</span>
      <span className="dv-stat__v">{v}</span>
      {sub && <span className="dv-stat__s">{sub}</span>}
    </div>
  );
}
