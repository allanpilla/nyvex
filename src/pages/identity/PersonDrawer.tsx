import { useEffect } from 'react';
import { Alert, Button, Icon, IconButton } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { copy } from '../devices/parts';
import { photoUrl } from '../faces/faceArt';
import { ageText, camLabel, docText, fmtDT, listsOf, NOW, P_STATUS, pendingAlerts, RISK_LABEL, shortId, typeName, type Person } from './data';
import { PersonPic, PStatusDot } from './parts';

type Props = { p: Person; onClose: () => void; onProfile: (tab?: string) => void; onEdit: () => void; onMonitor: () => void };

/** Resumo da pessoa no painel flutuante. A análise completa fica na ficha. */
export function PersonDrawer({ p, onClose, onProfile, onEdit, onMonitor }: Props) {
  const { toast } = useUi();
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-smodal, .nx-menu, .nx-sheet-back:not(.is-soft)')) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const last = p.sightings[0];
  const seen30 = p.sightings.filter((s) => NOW - s.at < 30 * 864e5);
  const cams = new Set(seen30.map((s) => s.camId)).size;
  const pend = pendingAlerts(p);
  const lists = listsOf(p);

  return (
    <aside className="dv-drawer id-drawer" aria-label={`Pessoa ${p.name}`}>
      <header className="dv-drawer__head">
        <PersonPic p={p} size={40} />
        <div className="dv-drawer__title">
          <h2>{p.name}</h2>
          <p>Pessoa · {P_STATUS[p.status]} · atualizada {ageText(p.updated)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__body">
        <div className={`id-portrait${p.photo == null ? ' is-empty' : ''}`}>
          {p.photo != null ? <img src={photoUrl(p.photo)} alt={`Foto de ${p.name}`} /> : <span><Icon name="faces" size={28} />Sem foto de referência</span>}
        </div>

        {p.wanted && <Alert type="error" title="Pessoa procurada">Pedido de localização ativo. Avise a central ao avistar.</Alert>}
        {!p.wanted && pend > 0 && (
          <Alert type="warning" title={`${pend} ${pend === 1 ? 'alerta pendente' : 'alertas pendentes'}`}
            action={<button type="button" className="dv-link" onClick={() => onProfile('atencao')}>Revisar</button>}>
            Alertas de monitoramento ligados a esta pessoa aguardam triagem.
          </Alert>
        )}

        <div className="dv-stats">
          <div><span>Avistamentos · 30 dias</span><b>{seen30.length}</b></div>
          <div><span>Câmeras</span><b>{cams}</b></div>
          <div><span>Risco</span><b className={`id-statrisk is-${p.risk}`}>{RISK_LABEL[p.risk]}</b></div>
        </div>

        <section className="dv-sec">
          <div className="dv-sec__head"><h3>Dados gerais</h3></div>
          <dl className="dv-info">
            <div className="dv-info__row"><dt>Status</dt><dd><PStatusDot s={p.status} /></dd></div>
            <div className="dv-info__row"><dt>Documento</dt><dd className="id-mono">{docText(p)}</dd></div>
            <div className="dv-info__row"><dt>Tipos</dt><dd>{p.types.length ? p.types.map(typeName).join(', ') : <span className="lc-none">Nenhum atribuído</span>}</dd></div>
            {p.attrs.slice(0, 2).map(([k, v]) => <div key={k} className="dv-info__row"><dt>{k}</dt><dd>{v}</dd></div>)}
            <div className="dv-info__row"><dt>Último avistamento</dt><dd>{last ? <span className="id-wrap">{fmtDT(last.at)} · {camLabel(last.camId)}</span> : <span className="lc-none">Sem avistamento</span>}</dd></div>
            <div className="dv-info__row"><dt>Listas</dt><dd>{lists.length ? <span className="id-wrap">{lists.map((l) => l.name).join(', ')}</span> : <span className="lc-none">Não monitorada</span>}</dd></div>
            <div className="dv-info__row"><dt>ID</dt><dd><button type="button" className="dv-copyval is-mono" onClick={() => copy(p.id, toast, 'ID copiado')}><span>{shortId(p.id)}</span><Icon name="copy" size={14} /></button></dd></div>
          </dl>
        </section>
      </div>

      <footer className="dv-drawer__foot id-dfoot">
        <Button variant="primary" icon="external" onClick={() => onProfile()}>Abrir ficha</Button>
        <Button icon="eye" onClick={onMonitor}>Monitorar</Button>
        <Button icon="edit" onClick={onEdit}>Editar</Button>
      </footer>
    </aside>
  );
}
