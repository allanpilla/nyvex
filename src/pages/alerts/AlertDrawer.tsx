import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert as Note, Button, Checkbox, Combobox, Icon, IconButton, Menu, NavItem } from '../../ds/components';
import { copy } from '../devices/parts';
import { FaceImg } from '../faces/FaceImg';
import { ago, CAMS, camName, FP_REASONS, fullDate, hms, KIND, ME, OUTCOMES, PRIO_LABEL, span, STATUS_LABEL, subtitle, title, USERS, type Alert, type Group } from './data';
import { Thumb } from './Thumb';

export type Act =
  | { type: 'ack' }
  | { type: 'reopen' }
  | { type: 'fp'; reason: string; reeval: boolean }
  | { type: 'close'; outcome: string; note: string }
  | { type: 'fwd'; to: string; note: string };

type Props = { g: Group; now: number; pos: [number, number]; onPrev: () => void; onNext: () => void; onClose: () => void; onAct: (a: Act) => void; toast: (m: string) => void };
type Form = null | 'fp' | 'close' | 'fwd';

/** Detalhe do alerta (ou do grupo de repetidos). Na tela atual não há painel: só um modal de detalhes nos reconhecidos. */
export function AlertDrawer({ g, now, pos, onPrev, onNext, onClose, onAct, toast }: Props) {
  const navigate = useNavigate();
  const a = g.head;
  const c = CAMS[a.cam];
  const n = g.items.length;
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [reason, setReason] = useState(FP_REASONS[3]);
  const [reeval, setReeval] = useState(true);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [to, setTo] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const pend = a.status === 'pendente';
  const all = n > 1 ? ` (${n})` : '';

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || document.querySelector('.nx-menu, .nx-smodal')) return;
      if (e.key === 'Escape') { if (form) setForm(null); else onClose(); }
      if (!form && pend && (e.key === 'a' || e.key === 'A')) onAct({ type: 'ack' });
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose, onAct, form, pend]);

  const openForm = (f: Form) => { setForm(form === f ? null : f); setTried(false); setNote(''); };
  const submit = () => {
    setTried(true);
    if (form === 'fp') onAct({ type: 'fp', reason, reeval });
    if (form === 'close') { if (!outcome || !note.trim()) return; onAct({ type: 'close', outcome, note: note.trim() }); }
    if (form === 'fwd') { if (!to) return; onAct({ type: 'fwd', to, note: note.trim() }); setForm(null); }
  };

  const trail: [string, string, number][] = [
    ...(a.closedAt ? [[`Encerrado por ${a.closedBy}`, a.outcome!, a.closedAt] as [string, string, number]] : []),
    ...(a.fwdAt ? [[`Encaminhado a ${a.fwdTo}`, a.fwdNote || 'Sem nota', a.fwdAt] as [string, string, number]] : []),
    ...(a.ackAt ? [[`Reconhecido por ${a.ackBy}`, '', a.ackAt] as [string, string, number]] : []),
    [n > 1 ? `${n} ocorrências agrupadas` : 'Alerta criado', n > 1 ? `Primeira às ${hms(g.first)}` : 'Pelo motor de análise', g.last],
  ];
  trail.sort((x, y) => y[2] - x[2]);

  return (
    <aside className="dv-drawer al-drawer" aria-label="Detalhe do alerta">
      <header className="dv-drawer__head">
        <Thumb a={a} lg />
        <div className="dv-drawer__title">
          <h2>{a.kind === 'placa' ? `Placa ${a.plate}` : title(a)}</h2>
          <p>{a.kind === 'face' || a.kind === 'placa' ? `${KIND[a.kind].label} · ${camName(c)}` : `${camName(c)} · ${c.local}`}</p>
        </div>
        <span className="al-nav">
          <IconButton icon="chevron" className="al-up" label="Anterior" shortcut="↑" onClick={onPrev} tipPlace="bottom" />
          <span>{pos[0]}/{pos[1].toLocaleString('pt-BR')}</span>
          <IconButton icon="chevron" label="Próximo" shortcut="↓" onClick={onNext} tipPlace="bottom" />
        </span>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__body">
        <div className={`al-media is-${a.kind}`}>
          {a.kind === 'face' && a.seed != null ? (
            <>
              <figure><FaceImg seed={a.seed} night={false} alt="Captura" /><figcaption>Captura · {hms(a.at)}</figcaption></figure>
              <figure className="is-ref"><FaceImg seed={a.seed} night={false} alt="Foto do cadastro" /><figcaption>Cadastro</figcaption></figure>
            </>
          ) : (
            <button type="button" className="al-clip" onClick={() => toast('Player de clipe · ainda não desenhado no protótipo')}>
              <span className="al-clip__grid" />
              {a.kind === 'camera' ? <Icon name="nosignal" size={28} /> : <span className="al-clip__play"><Icon name="play" size={18} /></span>}
              <span className="al-clip__meta">{a.kind === 'camera' ? `Sem vídeo há ${a.mins} min` : `Clipe 20 s · ${hms(a.at)}`}</span>
              {a.kind === 'placa' && <span className="al-plate is-lg">{a.plate}</span>}
            </button>
          )}
        </div>

        {(a.kind === 'face' || a.kind === 'placa') && (
          <Note type="warning" title={a.kind === 'face' ? `Match ${a.score}% · ${a.list}` : `Leitura ${a.score}% · ${a.list}`}>
            {a.kind === 'face' ? 'Um match pede revisão humana e não confirma identidade.' : 'Confira a placa no clipe antes de agir.'}
          </Note>
        )}

        {a.status !== 'encerrado' ? (
          <div className="al-acts">
            {pend && <Button variant="primary" icon="check" onClick={() => onAct({ type: 'ack' })}>Reconhecer{all}</Button>}
            <Button className={form === 'close' ? 'is-active' : undefined} onClick={() => openForm('close')}>Encerrar</Button>
            <Button className={form === 'fp' ? 'is-active' : undefined} onClick={() => openForm('fp')}>Falso positivo</Button>
            <span className="dv-tools__sp" />
            <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
          </div>
        ) : (
          <div className="al-acts">
            <Button icon="replay" onClick={() => onAct({ type: 'reopen' })}>Reabrir{all}</Button>
            <span className="dv-tools__sp" />
            <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
          </div>
        )}

        {form && (
          <section className="al-form" aria-label={form === 'fp' ? 'Falso positivo' : form === 'close' ? 'Encerrar com desfecho' : 'Encaminhar'}>
            {form === 'fp' && (
              <>
                <label className="dv-field"><span className="dv-field__l">Motivo</span>
                  <select className="nx-select" value={reason} onChange={(e) => setReason(e.target.value)}>{FP_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
                </label>
                <Checkbox label="Enviar para reavaliação do modelo" checked={reeval} onChange={setReeval}><span className="al-chk">Enviar para reavaliação do modelo</span></Checkbox>
              </>
            )}
            {form === 'close' && (
              <>
                <label className={`dv-field${tried && !outcome ? ' is-err' : ''}`}><span className="dv-field__l">Desfecho</span>
                  <select className="nx-select" value={outcome ?? ''} onChange={(e) => setOutcome(e.target.value || null)}>
                    <option value="">Selecione…</option>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label className={`dv-field${tried && !note.trim() ? ' is-err' : ''}`}><span className="dv-field__l">Justificativa</span>
                  <textarea className="al-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que foi verificado e o que foi feito" />
                  {tried && !note.trim() && <span className="dv-field__h">Obrigatória para encerrar.</span>}
                </label>
              </>
            )}
            {form === 'fwd' && (
              <>
                <div className={`dv-field${tried && !to ? ' is-err' : ''}`}><span className="dv-field__l">Para</span>
                  <Combobox label="Encaminhar para" value={to} onChange={setTo} placeholder="Operador ou equipe" options={USERS.map((u) => ({ value: u, label: u }))} />
                </div>
                <label className="dv-field"><span className="dv-field__l">Nota <span className="al-opt">opcional</span></span>
                  <textarea className="al-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contexto para quem recebe" />
                </label>
              </>
            )}
            <div className="al-form__foot">
              <span className="al-form__hint">{form === 'fwd' ? 'Continua pendente, agora com responsável.' : n > 1 ? `Vale para as ${n} ocorrências do grupo.` : 'Vai para Encerrados.'}</span>
              <Button onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" onClick={submit}>{form === 'fwd' ? 'Encaminhar' : 'Encerrar'}</Button>
            </div>
          </section>
        )}

        <dl className="dv-info">
          <div className="dv-info__row"><dt>Tipo</dt><dd>{KIND[a.kind].label}</dd></div>
          <div className="dv-info__row"><dt>Prioridade</dt><dd><span className={`al-pdot is-${KIND[a.kind].prio}`}><i />{PRIO_LABEL[KIND[a.kind].prio]}</span></dd></div>
          <div className="dv-info__row"><dt>Detalhe</dt><dd>{subtitle(a)}</dd></div>
          <div className="dv-info__row"><dt>Câmera</dt><dd>{camName(c)}{!c.name && <span className="al-muted"> · sem nome cadastrado</span>}</dd></div>
          <div className="dv-info__row"><dt>Local</dt><dd>{c.local}</dd></div>
          <div className="dv-info__row"><dt>{n > 1 ? 'Última' : 'Criado em'}</dt><dd>{fullDate(g.last)}</dd></div>
          {n > 1 && <div className="dv-info__row"><dt>Primeira</dt><dd>{fullDate(g.first)} · {span(g.first, g.last)}</dd></div>}
          <div className="dv-info__row"><dt>Situação</dt><dd>{STATUS_LABEL[a.status]}</dd></div>
          {a.fpReason && <div className="dv-info__row"><dt>Motivo</dt><dd>{a.fpReason}{a.reeval ? ' · enviado para reavaliação' : ''}</dd></div>}
          {a.justification && <div className="dv-info__row"><dt>Justificativa</dt><dd className="al-wrap">{a.justification}</dd></div>}
          <div className="dv-info__row"><dt>ID</dt><dd><button type="button" className="dv-copyval is-mono" onClick={() => copy(a.id, toast, 'ID copiado')}><span>{a.id}</span><Icon name="copy" size={14} /></button></dd></div>
        </dl>

        {n > 1 && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Ocorrências agrupadas</h3><span className="al-muted">{n} · mesma câmera, intervalo menor que 20 min</span></div>
            <ol className="al-occ">
              {(showAll ? g.items : g.items.slice(0, 6)).map((x: Alert) => (
                <li key={x.id}><span className="is-mono">{hms(x.at)}</span><span>{ago(x.at, now)}</span><button type="button" onClick={() => toast('Player de clipe · ainda não desenhado no protótipo')}><Icon name="play" size={12} />Clipe</button></li>
              ))}
            </ol>
            {n > 6 && <button type="button" className="al-link" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Mostrar menos' : `Ver todas as ${n}`}</button>}
          </section>
        )}

        <section className="dv-sec">
          <div className="dv-sec__head"><h3>Trilha</h3></div>
          <ol className="al-trail">
            {trail.map(([t, d, at]) => <li key={t + at}><i /><span><b>{t}</b>{d && <span>{d}</span>}</span><time>{ago(at, now)}</time></li>)}
          </ol>
        </section>
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          {a.status !== 'encerrado' && <NavItem role="menuitem" icon="share" label={a.fwdTo ? 'Encaminhar de novo…' : 'Encaminhar…'} onClick={() => { setMore(null); openForm('fwd'); }} />}
          <NavItem role="menuitem" icon="tv" label="Ver câmera no mural" onClick={() => { setMore(null); navigate('/mural-de-video'); toast(`Abra ${camName(c)} no mural`); }} />
          {a.kind === 'face' && <NavItem role="menuitem" icon="eye" label="Abrir watchlist" onClick={() => { setMore(null); navigate('/listas-de-observacao'); }} />}
          <NavItem role="menuitem" icon="ocor" label="Abrir ocorrência" onClick={() => { setMore(null); toast('Ocorrências · ainda não desenhada no protótipo'); }} />
          <div className="nx-menu__sep" />
          <NavItem role="menuitem" icon="copy" label="Copiar ID da câmera" onClick={() => { setMore(null); copy(c.id, toast, 'ID da câmera copiado'); }} />
          {a.status === 'reconhecido' && a.ackBy === ME && <NavItem role="menuitem" icon="replay" label="Devolver à fila" onClick={() => { setMore(null); onAct({ type: 'reopen' }); }} />}
        </Menu>
      )}
    </aside>
  );
}
