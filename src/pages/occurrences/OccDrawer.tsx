import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Combobox, Icon, IconButton, Menu, NavItem, Segmented } from '../../ds/components';
import { copy } from '../devices/parts';
import { FaceImg } from '../faces/FaceImg';
import {
  ago, CAMS, dur, fullDate, hm, KIND_ICON, KIND_LABEL, LOCAIS, NEXT, OUTCOMES, PRIO_LABEL, STAGE_LABEL, STAGES, TEAMS,
  late, inStage, type Kind, type Occ, type Party, type Place, type Prio, type Reporter, type Stage,
} from './data';

export type Move = { to: Stage; team?: string; outcome?: string; note?: string };
type Tab = 'trilha' | 'envolvidos' | 'relacionadas';

export function PrioTag({ p }: { p: Prio }) {
  return <span className={`oc-prio is-${p}`}><i />{PRIO_LABEL[p]}</span>;
}

type Props = {
  o: Occ; all: Occ[]; now: number; busy: Set<string>;
  onClose: () => void; onMove: (m: Move) => void; onNote: (t: string) => void; onAdd: (p: Party) => void; onOpen: (id: string) => void; toast: (m: string) => void;
  startForm?: Stage | null;
};

/** Detalhe da ocorrência: fluxo, ação do próximo passo, trilha com notas, envolvidos e relacionadas. */
export function OccDrawer({ o, all, now, busy, onClose, onMove, onNote, onAdd, onOpen, toast, startForm = null }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('trilha');
  const [form, setForm] = useState<Stage | null>(startForm);
  const [team, setTeam] = useState<string | null>(o.team ?? null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const [note, setNote] = useState('');
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [adding, setAdding] = useState<Party['kind'] | null>(null);
  const [pName, setPName] = useState('');
  const [pSub, setPSub] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const next = NEXT[o.stage];
  const isLate = late(o, now);
  const idx = STAGES.indexOf(o.stage);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-menu')) return;
      if (form) setForm(null); else onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [form, onClose]);

  const doNext = () => {
    if (!next) return;
    if (next.to === 'despachada' || next.to === 'concluida') { setForm(form === next.to ? null : next.to); setTried(false); return; }
    onMove({ to: next.to });
  };
  const submit = () => {
    setTried(true);
    if (form === 'despachada') { if (!team) return; onMove({ to: 'despachada', team, note: text.trim() || undefined }); }
    if (form === 'concluida') { if (!outcome || !text.trim()) return; onMove({ to: 'concluida', outcome, note: text.trim() }); }
    setForm(null); setText(''); setTried(false);
  };
  const send = () => { if (!note.trim()) return; onNote(note.trim()); setNote(''); };
  const related = all.filter((x) => x.id !== o.id && (x.local === o.local || (x.kind === o.kind && x.kind !== 'outro'))).slice(0, 5);

  return (
    <aside className="dv-drawer oc-drawer" aria-label="Detalhe da ocorrência">
      <header className="dv-drawer__head">
        <span className="al-thumb is-lg"><Icon name={KIND_ICON[o.kind]} size={20} /></span>
        <div className="dv-drawer__title">
          <h2 title={o.title}>{o.title}</h2>
          <p><span className="oc-code">{o.code}</span> · {KIND_LABEL[o.kind]}</p>
        </div>
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__body oc-body">
        <div className="oc-status">
          <PrioTag p={o.prio} />
          <span className="oc-stage">{STAGE_LABEL[o.stage]} {o.stage !== 'arquivada' && <span>· {ago(inStage(o), now).replace('há ', 'há ')}</span>}</span>
          {o.demo && <span className="oc-demo">Demonstração</span>}
        </div>

        {o.stage !== 'arquivada' && (
          <ol className="oc-steps" aria-label="Andamento">
            {STAGES.slice(0, 4).map((s, i) => (
              <li key={s} className={i < idx ? 'is-done' : i === idx ? 'is-on' : undefined}><i>{i < idx ? <Icon name="check" size={10} /> : null}</i><span>{STAGE_LABEL[s]}</span></li>
            ))}
          </ol>
        )}

        {isLate && (
          <div className="oc-late"><Icon name="clock" size={14} />
            {o.stage === 'nova' ? `Aguardando despacho há ${dur(now - o.at)}` : `Equipe a caminho há ${dur(now - inStage(o))}, sem chegada registrada`}
          </div>
        )}

        <div className="al-acts">
          {next && <Button variant={o.stage === 'concluida' ? 'secondary' : 'primary'} icon={next.icon} className={form === next.to ? 'is-active' : undefined} onClick={doNext}>{next.label}</Button>}
          {o.stage === 'despachada' && <Button onClick={() => { setForm('despachada'); setTried(false); }}>Trocar equipe</Button>}
          {(o.stage === 'concluida' || o.stage === 'arquivada') && <Button icon="replay" onClick={() => onMove({ to: 'nova' })}>Reabrir</Button>}
          <span className="dv-tools__sp" />
          <Button icon="download" onClick={() => toast(`B.O. / Termos de ${o.code} gerado (PDF)`)}>B.O. / Termos</Button>
        </div>

        {form && (
          <section className="al-form" aria-label={form === 'despachada' ? 'Despachar' : 'Concluir'}>
            {form === 'despachada' ? (
              <>
                <div className={`dv-field${tried && !team ? ' is-err' : ''}`}><span className="dv-field__l">Equipe</span>
                  <Combobox label="Equipe" value={team} onChange={setTeam} placeholder="Viatura, moto ou equipe" invalid={tried && !team}
                    options={TEAMS.map((t) => ({ value: t.name, label: t.name }))}
                    render={(op) => <span className="oc-topt"><b>{op.label}</b><span className={busy.has(op.value) && op.value !== o.team ? 'is-busy' : 'is-free'}>{busy.has(op.value) && op.value !== o.team ? 'Em atendimento' : 'Disponível'}</span></span>} />
                </div>
                <label className="dv-field"><span className="dv-field__l">Orientação <span className="al-opt">opcional</span></span>
                  <textarea className="al-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="O que a equipe deve verificar" />
                </label>
              </>
            ) : (
              <>
                <label className={`dv-field${tried && !outcome ? ' is-err' : ''}`}><span className="dv-field__l">Desfecho</span>
                  <select className="nx-select" value={outcome ?? ''} onChange={(e) => setOutcome(e.target.value || null)}>
                    <option value="">Selecione…</option>{OUTCOMES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className={`dv-field${tried && !text.trim() ? ' is-err' : ''}`}><span className="dv-field__l">Relato</span>
                  <textarea className="al-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="O que foi encontrado e o que foi feito" />
                  {tried && !text.trim() && <span className="dv-field__h">Obrigatório para concluir.</span>}
                </label>
              </>
            )}
            <div className="al-form__foot">
              <span className="al-form__hint">{form === 'despachada' ? 'A equipe recebe a ocorrência no app.' : 'Vai para Concluídas; pode ser reaberta.'}</span>
              <Button onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="primary" onClick={submit}>{form === 'despachada' ? 'Despachar' : 'Concluir'}</Button>
            </div>
          </section>
        )}

        <div className="oc-counts">
          {([['Despachos', o.events.filter((e) => e.kind === 'dispatch').length], ['Pessoas', o.parties.filter((p) => p.kind === 'pessoa').length], ['Veículos', o.parties.filter((p) => p.kind === 'veiculo').length], ['Objetos', o.parties.filter((p) => p.kind === 'objeto').length], ['Evidências', o.evidence]] as [string, number][]).map(([k, v]) => (
            <div key={k} className={v ? undefined : 'is-zero'}><b>{v}</b><span>{k}</span></div>
          ))}
        </div>

        <div className="dv-drawer__tabs oc-tabs">
          <Segmented<Tab> label="Seção" size="sm" value={tab} onChange={setTab} options={[
            { value: 'trilha', label: 'Linha do tempo' },
            { value: 'envolvidos', label: <>Envolvidos <span className="nx-seg__n">{o.parties.length}</span></> },
            { value: 'relacionadas', label: 'Relacionadas' },
          ]} />
        </div>

        {tab === 'trilha' && (
          <ol className="al-trail oc-trail">
            {o.events.map((e, i) => (
              <li key={i} className={`is-${e.kind}`}><i /><span><b>{e.what}</b><span>{e.who}{e.note ? ` · ${e.note}` : ''}</span></span><time title={fullDate(e.at)}>{now - e.at < 864e5 ? hm(e.at) : ago(e.at, now)}</time></li>
            ))}
          </ol>
        )}

        {tab === 'envolvidos' && (
          <section className="dv-sec">
            {o.parties.length > 0 ? (
              <ul className="oc-parties">
                {o.parties.map((p, i) => (
                  <li key={i}>
                    <span className={`al-thumb${p.seed != null ? ' is-face' : ''}`}>{p.seed != null ? <FaceImg seed={p.seed} night={false} /> : <Icon name={p.kind === 'pessoa' ? 'people' : p.kind === 'veiculo' ? 'car' : 'stack'} size={16} />}</span>
                    <span className="dv-name"><b className={p.kind === 'veiculo' ? 'oc-mono' : undefined}>{p.label}</b><span>{p.sub}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="dv-muted">Ninguém registrado ainda.</p>}
            {adding ? (
              <div className="al-form">
                <label className="dv-field"><span className="dv-field__l">{adding === 'pessoa' ? 'Nome ou descrição' : adding === 'veiculo' ? 'Placa' : 'Objeto'}</span>
                  <input className="oc-in" autoFocus value={pName} onChange={(e) => setPName(e.target.value)} placeholder={adding === 'veiculo' ? 'ABC1D23' : adding === 'pessoa' ? 'Ex.: Pessoa não identificada' : 'Ex.: Mochila preta'} />
                </label>
                <label className="dv-field"><span className="dv-field__l">Detalhe <span className="al-opt">opcional</span></span>
                  <input className="oc-in" value={pSub} onChange={(e) => setPSub(e.target.value)} placeholder="Papel na ocorrência, características…" />
                </label>
                <div className="al-form__foot"><span className="al-form__hint" />
                  <Button onClick={() => { setAdding(null); setPName(''); setPSub(''); }}>Cancelar</Button>
                  <Button variant="primary" disabled={!pName.trim()} onClick={() => { onAdd({ kind: adding, label: adding === 'veiculo' ? pName.trim().toUpperCase() : pName.trim(), sub: pSub.trim() || 'Adicionado pela central' }); setAdding(null); setPName(''); setPSub(''); }}>Adicionar</Button>
                </div>
              </div>
            ) : (
              <div className="oc-addrow">
                <Button icon="plus" onClick={() => setAdding('pessoa')}>Pessoa</Button>
                <Button icon="plus" onClick={() => setAdding('veiculo')}>Veículo</Button>
                <Button icon="plus" onClick={() => setAdding('objeto')}>Objeto</Button>
                <Button icon="upload" onClick={() => toast('Envio de evidência · simulado no protótipo')}>Evidência</Button>
              </div>
            )}
          </section>
        )}

        {tab === 'relacionadas' && (
          <section className="dv-sec">
            {o.alerts > 0 && (
              <button type="button" className="oc-rel" onClick={() => navigate('/alertas')}>
                <span className="al-thumb"><Icon name="alert" size={16} /></span>
                <span className="dv-name"><b>{o.alerts} {o.alerts === 1 ? 'alerta vinculado' : 'alertas vinculados'}</b><span>{o.cam ?? o.local} · abrir na Fila de alertas</span></span>
                <Icon name="arrowRight" size={14} />
              </button>
            )}
            {related.map((r) => (
              <button key={r.id} type="button" className="oc-rel" onClick={() => onOpen(r.id)}>
                <span className="al-thumb"><Icon name={KIND_ICON[r.kind]} size={16} /></span>
                <span className="dv-name"><b>{r.title}</b><span>{r.code} · {STAGE_LABEL[r.stage]} · {ago(r.at, now)}</span></span>
                <PrioTag p={r.prio} />
              </button>
            ))}
            {!o.alerts && !related.length && <p className="dv-muted">Nenhuma ocorrência ou alerta relacionado.</p>}
          </section>
        )}

        <dl className="dv-info">
          <div className="dv-info__row"><dt>Local</dt><dd>{o.local}</dd></div>
          {o.place && (o.place.address || o.place.city) && <div className="dv-info__row"><dt>Endereço</dt><dd className="al-wrap">{[o.place.address, o.place.district, [o.place.city, o.place.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}</dd></div>}
          {o.place?.zone && <div className="dv-info__row"><dt>Área / zona</dt><dd>{o.place.zone}</dd></div>}
          {o.reporter && <div className="dv-info__row"><dt>Solicitante</dt><dd className="al-wrap">{[o.reporter.name, o.reporter.relation, o.reporter.phone, o.reporter.doc].filter(Boolean).join(' · ')}</dd></div>}
          {o.cam && <div className="dv-info__row"><dt>Câmera de origem</dt><dd>{o.cam}</dd></div>}
          <div className="dv-info__row"><dt>Equipe</dt><dd>{o.team ?? <span className="al-muted">Sem equipe</span>}</dd></div>
          {o.outcome && <div className="dv-info__row"><dt>Desfecho</dt><dd>{o.outcome}</dd></div>}
          <div className="dv-info__row"><dt>Registrada por</dt><dd>{o.by}</dd></div>
          <div className="dv-info__row"><dt>Registrada em</dt><dd>{fullDate(o.at)}</dd></div>
          {o.desc && <div className="dv-info__row"><dt>Descrição</dt><dd className="al-wrap">{o.desc}</dd></div>}
          <div className="dv-info__row"><dt>Código</dt><dd><button type="button" className="dv-copyval is-mono" onClick={() => copy(o.code, toast, 'Código copiado')}><span>{o.code}</span><Icon name="copy" size={14} /></button></dd></div>
        </dl>
      </div>

      <footer className="oc-compose">
        <textarea ref={noteRef} className="al-textarea" rows={1} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar nota à linha do tempo…"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Nota" />
        <IconButton icon="enter" label="Enviar nota" shortcut="Enter" disabled={!note.trim()} onClick={send} tipPlace="top" className="oc-send" />
      </footer>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          {STAGES.filter((s) => s !== o.stage && s !== 'despachada' && s !== 'concluida').map((s) => (
            <NavItem key={s} role="menuitem" icon="arrowRight" label={`Mover para ${STAGE_LABEL[s]}`} onClick={() => { setMore(null); onMove({ to: s }); }} />
          ))}
          <div className="nx-menu__sep" />
          {o.cam && <NavItem role="menuitem" icon="tv" label="Ver câmera no mural" onClick={() => { setMore(null); navigate('/mural-de-video'); }} />}
          <NavItem role="menuitem" icon="copy" label="Copiar código" onClick={() => { setMore(null); copy(o.code, toast, 'Código copiado'); }} />
          <NavItem role="menuitem" icon="external" label="Copiar link" onClick={() => { setMore(null); copy(`${location.origin}${location.pathname}#/ocorrencias/${o.code}`, toast, 'Link copiado'); }} />
        </Menu>
      )}
    </aside>
  );
}

/* ───────────── nova ocorrência ───────────── */

export type NewOcc = { stage: Stage; outcome?: string; title: string; kind: Kind; prio: Prio; local: string; cam?: string; desc?: string; team?: string; place?: Place; reporter?: Reporter };

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const RELATIONS = ['Vítima', 'Testemunha', 'Funcionário', 'Aluno', 'Visitante', 'Vigilante / segurança', 'Anônimo', 'Outro'];
const phoneMask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };

const WSTEPS = ['Ocorrência', 'Local', 'Solicitante', 'Despacho'] as const;
const PRIO_HINT: Record<Prio, string> = { critica: 'Risco à vida ou crime em andamento', alta: 'Precisa de equipe logo', media: 'Atender assim que possível', baixa: 'Registro ou verificação' };

export function NewOccDrawer({ stage = 'nova', busy, onClose, onCreate }: { stage?: Stage; busy: Set<string>; onClose: () => void; onCreate: (n: NewOcc) => void }) {
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(0);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('outro');
  const [prio, setPrio] = useState<Prio>('media');
  const [desc, setDesc] = useState('');
  const [local, setLocal] = useState<string | null>(null);
  const [pl, setPl] = useState<Place>({ address: '', district: '', city: '', uf: '', zone: '' });
  const [rp, setRp] = useState<Reporter>({ name: '', relation: '', phone: '', doc: '' });
  const [cam, setCam] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const needTeam = stage === 'despachada' || stage === 'no_local';
  const stepOk = (i: number) => (i === 0 ? !!title.trim() : i === 3 ? (!needTeam || !!team) && (stage !== 'concluida' || !!outcome) : true);
  const last = step === WSTEPS.length - 1;

  const go = (i: number) => {
    if (i > step && !stepOk(step)) { setTried(true); return; }
    setTried(false); setStep(i); setSeen((x) => Math.max(x, i));
  };
  const create = () => {
    if (!stepOk(0)) { setStep(0); setTried(true); return; }
    if (!stepOk(3)) { setTried(true); return; }
    const place = Object.values(pl).some((v) => v.trim()) ? pl : undefined;
    const reporter = rp.name.trim() || rp.phone.trim() ? rp : undefined;
    onCreate({ stage: stage === 'nova' && team ? 'despachada' : stage, outcome: outcome ?? undefined, title: title.trim(), kind, prio, local: local ?? (pl.address.trim() || 'Sem local definido'), cam: cam ?? undefined, desc: desc.trim() || undefined, team: team ?? undefined, place, reporter });
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.nx-menu')) onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) create();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  const P = (k: keyof Place) => ({ value: pl[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setPl({ ...pl, [k]: e.target.value }) });
  const R = (k: keyof Reporter) => ({ value: rp[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setRp({ ...rp, [k]: k === 'phone' ? phoneMask(e.target.value) : e.target.value }) });
  const where = local ?? ([pl.address, pl.city].filter(Boolean).join(', ') || '—');

  return (
    <aside className="dv-drawer oc-drawer" aria-label="Nova ocorrência">
      <header className="dv-drawer__head">
        <div className="dv-drawer__title"><h2>Nova ocorrência</h2><p>{stage === 'nova' ? 'Registre o caso; a linha do tempo segue com os eventos vinculados.' : `Entra direto em ${STAGE_LABEL[stage]}`}</p></div>
        <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <ol className="oc-steps oc-wsteps" aria-label="Etapas">
        {WSTEPS.map((w, i) => (
          <li key={w} className={i < step ? 'is-done' : i === step ? 'is-on' : undefined}>
            <button type="button" disabled={i > seen && i > step + 1} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
              <i>{i < step ? <Icon name="check" size={10} /> : i + 1}</i><span>{w}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="dv-drawer__body oc-newbody" key={step}>
        {step === 0 && (
          <>
            <label className={`dv-field${tried && !title.trim() ? ' is-err' : ''}`}><span className="dv-field__l">Título <span className="oc-req">*</span></span>
              <input className="oc-in" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(1); }} placeholder="O que está acontecendo, em poucas palavras" />
              {tried && !title.trim() && <span className="dv-field__h">Dê um título para seguir.</span>}
            </label>
            <label className="dv-field"><span className="dv-field__l">Tipo</span>
              <select className="nx-select" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
            <div className="dv-field"><span className="dv-field__l">Prioridade</span>
              <div className="oc-prioopts" role="radiogroup" aria-label="Prioridade">
                {(['critica', 'alta', 'media', 'baixa'] as Prio[]).map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={prio === p} className={`oc-prioopt${prio === p ? ' is-on' : ''}`} onClick={() => setPrio(p)}>
                    <span className={`oc-prio is-${p}`}><i />{PRIO_LABEL[p]}</span><small>{PRIO_HINT[p]}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="dv-field"><span className="dv-field__l">Descrição <span className="al-opt">opcional</span></span>
              <textarea className="al-textarea oc-tall" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalhes para quem vai atender" />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <div className="dv-field"><span className="dv-field__l">Local cadastrado</span>
              <Combobox label="Local cadastrado" value={local} onChange={setLocal} placeholder="Bloco, portaria, estacionamento…" options={LOCAIS.map((l) => ({ value: l, label: l }))} />
              <span className="dv-field__h">Ou preencha o endereço abaixo para um local fora do cadastro.</span>
            </div>
            <label className="dv-field"><span className="dv-field__l">Endereço</span><input className="oc-in" autoFocus {...P('address')} placeholder="Rua, número, complemento" /></label>
            <div className="oc-2col">
              <label className="dv-field"><span className="dv-field__l">Bairro</span><input className="oc-in" {...P('district')} /></label>
              <label className="dv-field"><span className="dv-field__l">Cidade</span><input className="oc-in" {...P('city')} placeholder="Curitiba" /></label>
            </div>
            <div className="oc-2col">
              <label className="dv-field"><span className="dv-field__l">Estado</span>
                <select className="nx-select" {...P('uf')}><option value="">Selecione…</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
              </label>
              <label className="dv-field"><span className="dv-field__l">Área / zona</span><input className="oc-in" {...P('zone')} /><span className="dv-field__h">Área policial ou zona de ronda</span></label>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="oc-wnote">Quem relatou a ocorrência. Tudo opcional; pule se veio de uma câmera.</p>
            <label className="dv-field"><span className="dv-field__l">Nome</span><input className="oc-in" autoFocus {...R('name')} placeholder="Quem relatou" /></label>
            <label className="dv-field"><span className="dv-field__l">Relação</span>
              <select className="nx-select" {...R('relation')}><option value="">Selecione…</option>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <div className="oc-2col">
              <label className="dv-field"><span className="dv-field__l">Telefone</span><input className="oc-in" inputMode="tel" {...R('phone')} placeholder="(41) 99999-9999" /></label>
              <label className="dv-field"><span className="dv-field__l">Documento</span><input className="oc-in" {...R('doc')} placeholder="RG ou CPF" /></label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {stage === 'concluida' && (
              <label className={`dv-field${tried && !outcome ? ' is-err' : ''}`}><span className="dv-field__l">Desfecho <span className="oc-req">*</span></span>
                <select className="nx-select" value={outcome ?? ''} onChange={(e) => setOutcome(e.target.value || null)}><option value="">Selecione…</option>{OUTCOMES.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
            )}
            <div className={`dv-field${tried && needTeam && !team ? ' is-err' : ''}`}><span className="dv-field__l">{needTeam ? <>Equipe <span className="oc-req">*</span></> : stage === 'concluida' ? <>Equipe <span className="al-opt">opcional</span></> : <>Despachar agora <span className="al-opt">opcional</span></>}</span>
              <Combobox label="Equipe" value={team} onChange={setTeam} invalid={tried && needTeam && !team} placeholder={needTeam ? 'Quem está atendendo' : stage === 'concluida' ? 'Quem atendeu' : 'Deixe vazio para despachar depois'}
                options={TEAMS.map((t) => ({ value: t.name, label: t.name }))}
                render={(op) => <span className="oc-topt"><b>{op.label}</b><span className={busy.has(op.value) ? 'is-busy' : 'is-free'}>{busy.has(op.value) ? 'Em atendimento' : 'Disponível'}</span></span>} />
            </div>
            <div className="dv-field"><span className="dv-field__l">Câmera <span className="al-opt">opcional</span></span>
              <Combobox label="Câmera" value={cam} onChange={setCam} placeholder="Vincular uma câmera" options={CAMS.map((c) => ({ value: c, label: c }))} />
            </div>
            <section className="dv-sec">
              <div className="dv-sec__head"><h3>Resumo</h3></div>
              <dl className="dv-info oc-review">
                <div className="dv-info__row"><dt>Título</dt><dd className="al-wrap">{title || '—'}</dd></div>
                <div className="dv-info__row"><dt>Tipo</dt><dd>{KIND_LABEL[kind]}</dd></div>
                <div className="dv-info__row"><dt>Prioridade</dt><dd><PrioTag p={prio} /></dd></div>
                <div className="dv-info__row"><dt>Local</dt><dd className="al-wrap">{where}</dd></div>
                <div className="dv-info__row"><dt>Solicitante</dt><dd className="al-wrap">{[rp.name, rp.relation, rp.phone].filter(Boolean).join(' · ') || '—'}</dd></div>
              </dl>
            </section>
          </>
        )}
      </div>

      <footer className="oc-formfoot">
        {step > 0 ? <Button icon="arrowLeft" onClick={() => go(step - 1)}>Voltar</Button> : <Button onClick={onClose}>Cancelar</Button>}
        <span className="al-form__hint oc-wcount">{step + 1} de {WSTEPS.length}</span>
        {!last && step >= 1 && <Button onClick={() => go(WSTEPS.length - 1)}>Pular para despacho</Button>}
        {last ? <Button variant="primary" onClick={create}>Registrar</Button> : <Button variant="primary" onClick={() => go(step + 1)}>Próximo</Button>}
      </footer>
    </aside>
  );
}
