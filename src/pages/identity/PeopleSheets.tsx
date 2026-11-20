import { useRef, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Icon, Select, Sheet } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { photoUrl } from '../faces/faceArt';
import { WATCHLISTS, THRESHOLDS } from '../watchlists/data';
import { DOC_TYPES, docText, P_TYPES, type DocType, type Person } from './data';
import { PersonPic, PStatusDot } from './parts';

/* ───────────── Cadastrar / editar pessoa ───────────── */

type FormData = Pick<Person, 'name' | 'social' | 'doc' | 'birth' | 'externalId' | 'photo' | 'types'>;

export function PersonForm({ edit, onClose, onSave }: { edit?: Person; onClose: () => void; onSave: (d: FormData) => void }) {
  const [name, setName] = useState(edit?.name ?? '');
  const [docType, setDocType] = useState<DocType | ''>(edit?.doc?.type ?? '');
  const [docNum, setDocNum] = useState(edit?.doc ? (edit.doc.tail ? `•••••••••${edit.doc.tail}` : '••••••••') : '');
  const [types, setTypes] = useState<string[]>(edit?.types ?? []);
  const [social, setSocial] = useState(edit?.social ?? '');
  const [birth, setBirth] = useState(edit?.birth ?? '');
  const [ext, setExt] = useState(edit?.externalId ?? '');
  const [photo, setPhoto] = useState<number | null>(edit?.photo ?? null);
  const [upload, setUpload] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const errName = !name.trim() ? 'Informe o nome completo' : '';
  const errDoc = docNum.trim() && !docType ? 'Escolha o tipo do documento' : '';
  const save = () => {
    setTouched(true);
    if (errName || errDoc) return;
    const digits = docNum.replace(/\D/g, '');
    onSave({
      name: name.trim(), social: social.trim() || undefined, birth: birth || undefined, externalId: ext.trim() || undefined, types,
      doc: docType ? { type: docType, tail: digits ? digits.slice(-2) : edit?.doc?.tail ?? '' } : null,
      photo: upload ? 7 + Math.floor(Math.random() * 180) : photo,
    });
  };
  const nErr = [errName, errDoc].filter(Boolean).length;

  return (
    <Sheet eyebrow={edit ? 'Editar cadastro' : 'Cadastro único'} title={edit ? edit.name : 'Cadastrar pessoa'} onClose={onClose} onSubmit={save} width={600}
      footer={
        <>
          {touched && nErr > 0 && <span className="dv-form__err"><Icon name="errorFill" size={14} />{nErr === 1 ? '1 campo precisa de atenção' : `${nErr} campos precisam de atenção`}</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">{edit ? 'Salvar alterações' : 'Cadastrar'}</button>
        </>
      }>
      {!edit && <p className="dv-muted id-lead">Só o nome é obrigatório. Documento, tipos e os demais dados podem ser completados depois, na ficha.</p>}
      <section className="dv-card2">
        <h3>Identificação</h3>
        <label className={`dv-field${touched && errName ? ' is-err' : ''}`}>
          <span className="dv-field__l">Nome completo<i>*</i></span>
          <span className="nx-input"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como no documento" autoFocus /></span>
          {touched && errName && <span className="dv-field__h">{errName}</span>}
        </label>
        <div className="dv-row">
          <div className={`dv-field${touched && errDoc ? ' is-err' : ''}`}>
            <span className="dv-field__l">Tipo de documento</span>
            <Select label="Tipo de documento" value={docType} invalid={touched && !!errDoc} onChange={setDocType} options={DOC_TYPES.map((d) => ({ value: d, label: d }))} />
            {touched && errDoc && <span className="dv-field__h">{errDoc}</span>}
          </div>
          <label className="dv-field">
            <span className="dv-field__l">Número</span>
            <span className="nx-input"><input className="is-mono" value={docNum} onChange={(e) => setDocNum(e.target.value)} placeholder={docType === 'CPF' ? '000.000.000-00' : 'Número do documento'} /></span>
          </label>
        </div>
        <span className="dv-field__h"><Icon name="lock" size={12} />O número fica mascarado na interface; só os 2 últimos dígitos aparecem.</span>
      </section>

      <section className="dv-card2">
        <h3>Foto de referência</h3>
        <p>Usada no reconhecimento facial. Retrato nítido, de frente, JPG, PNG ou WebP até 10 MB.</p>
        <div className="id-upl">
          <span className="id-upl__img">
            {upload ? <img src={upload} alt="" /> : photo != null ? <img src={photoUrl(photo)} alt="" /> : <Icon name="faces" size={24} />}
          </span>
          <div className="id-upl__acts">
            <Button icon="upload" onClick={() => file.current?.click()}>{upload || photo != null ? 'Trocar foto' : 'Escolher arquivo'}</Button>
            <Button icon="camera" onClick={() => { setUpload(null); setPhoto(5 + Math.floor(Math.random() * 190)); }}>Webcam</Button>
            {(upload || photo != null) && <Button className="is-danger-ghost" onClick={() => { setUpload(null); setPhoto(null); }}>Remover</Button>}
          </div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setUpload(URL.createObjectURL(f)); }} />
        </div>
      </section>

      <section className="dv-card2">
        <h3>Tipos na operação</h3>
        <p>Escolha um ou mais tipos publicados. Os atributos de cada tipo são preenchidos na ficha.</p>
        <div className="id-typepick">
          {P_TYPES.map((t) => (
            <Checkbox key={t.id} label={t.name} checked={types.includes(t.id)} onChange={(v) => setTypes((o) => (v ? [...o, t.id] : o.filter((x) => x !== t.id)))}>
              <span className="id-typepick__l"><b>{t.name}</b><span>{t.desc}</span></span>
            </Checkbox>
          ))}
        </div>
      </section>

      <section className="dv-card2">
        <h3>Mais dados de identidade</h3>
        <div className="dv-row">
          <label className="dv-field"><span className="dv-field__l">Nome social</span><span className="nx-input"><input value={social} onChange={(e) => setSocial(e.target.value)} /></span></label>
          <label className="dv-field"><span className="dv-field__l">Data de nascimento</span><span className="nx-input"><input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} /></span></label>
        </div>
        <label className="dv-field">
          <span className="dv-field__l">ID externo</span>
          <span className="nx-input"><input className="is-mono" value={ext} onChange={(e) => setExt(e.target.value)} placeholder="Código no sistema de origem (ERP, acadêmico)" /></span>
        </label>
      </section>
    </Sheet>
  );
}

/* ───────────── Tipos de pessoa ───────────── */

export function TypesSheet({ people, onClose }: { people: Person[]; onClose: () => void }) {
  const { toast } = useUi();
  return (
    <Sheet eyebrow="Identidade" title="Tipos de pessoa" onClose={onClose} width={560}
      footer={<><span className="dv-muted">O tipo estende a pessoa: campos de cadastro, seções da ficha e vínculos.</span><span className="dv-tools__sp" /><Button variant="primary" icon="plus" onClick={() => toast('Novo tipo · editor simulado no protótipo')}>Novo tipo</Button></>}>
      <ul className="lc-dlist id-tlist">
        {P_TYPES.map((t) => {
          const n = people.filter((p) => p.types.includes(t.id)).length;
          return (
            <li key={t.id}>
              <span className="dv-kind"><Icon name="idcard" size={14} /></span>
              <span className="dv-name">
                <b>{t.name}<span className="id-mono id-tcode">{t.code}</span></b>
                <span>{t.fields} campos · {t.groups} {t.groups === 1 ? 'grupo' : 'grupos'} · {n} {n === 1 ? 'pessoa' : 'pessoas'}</span>
              </span>
              <Badge tone="success">Publicado</Badge>
              <Button icon="edit" onClick={() => toast(`Editar ${t.name} · editor simulado no protótipo`)}>Editar</Button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* ───────────── Buscar por foto ───────────── */

export function PhotoSearch({ people, onClose, onOpen }: { people: Person[]; onClose: () => void; onOpen: (id: string) => void }) {
  const [purpose, setPurpose] = useState('');
  const [img, setImg] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [touched, setTouched] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const errP = purpose.trim().length < 8 ? 'Descreva a finalidade (mín. 8 caracteres)' : '';
  const run = () => {
    setTouched(true);
    if (errP || !img) return;
    setState('busy');
    setTimeout(() => setState('done'), 900);
  };
  const cands = people.filter((p) => p.photo != null).slice(3, 7).map((p, i) => ({ p, score: [91, 74, 63, 58][i] }));

  return (
    <Sheet eyebrow="Pessoas" title="Buscar por foto" onClose={onClose} onSubmit={run} width={520}
      footer={<><span className="dv-tools__sp" /><Button onClick={onClose}>Fechar</Button><button type="submit" className="nx-btn nx-btn--primary" disabled={state === 'busy'}>{state === 'busy' ? 'Buscando…' : 'Buscar'}</button></>}>
      <label className={`dv-field${touched && errP ? ' is-err' : ''}`}>
        <span className="dv-field__l">Finalidade da busca<i>*</i></span>
        <span className="nx-input"><input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex.: investigação da ocorrência OC-2611-0123" autoFocus /></span>
        <span className="dv-field__h">{touched && errP ? errP : 'Fica registrada na trilha de auditoria, junto com a imagem enviada.'}</span>
      </label>
      <button type="button" className={`id-drop${img ? ' has-img' : ''}${touched && !img ? ' is-err' : ''}`} onClick={() => file.current?.click()}>
        {img ? <img src={img} alt="Imagem enviada" /> : <><Icon name="upload" size={22} /><b>Escolha uma imagem com um rosto</b><span>JPG, PNG ou WebP · um rosto por imagem</span></>}
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImg(URL.createObjectURL(f)); setState('idle'); } }} />
      {!img && <button type="button" className="dv-link id-sample" onClick={() => setImg(photoUrl(23))}>Usar imagem de exemplo</button>}
      {state === 'done' && (
        <section className="dv-sec">
          <div className="dv-sec__head"><h3>Candidatos</h3><span className="dv-muted">{cands.length} acima de 55%</span></div>
          <ul className="lc-dlist id-cands">
            {cands.map(({ p, score }) => (
              <li key={p.id} className="idp-click" onClick={() => onOpen(p.id)}>
                <PersonPic p={p} size={40} square />
                <span className="dv-name"><b>{p.name}</b><span><PStatusDot s={p.status} /> · {docText(p)}</span></span>
                <span className={`id-sim${score >= 85 ? ' is-hi' : ''}`}>{score}%</span>
                <Icon name="arrowRight" size={14} />
              </li>
            ))}
          </ul>
          <Alert type="information">Similaridade não é identificação. Confirme pelo cadastro e pelo contexto antes de agir.</Alert>
        </section>
      )}
    </Sheet>
  );
}

/* ───────────── Incluir em lista de observação ───────────── */

export function MonitorSheet({ p, onClose, onSave }: { p: Person; onClose: () => void; onSave: (l: { name: string; reason: string; threshold: number }) => void }) {
  const lists = WATCHLISTS.filter((w) => !w.people.some((x) => x.name === p.name) && !(p.extraLists ?? []).some((x) => x.name === w.name));
  const [list, setList] = useState<string>('');
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState('75');
  const [touched, setTouched] = useState(false);
  const err = { list: !list ? 'Escolha a lista' : '', reason: !reason.trim() ? 'Descreva o motivo documentado' : '' };
  const save = () => { setTouched(true); if (err.list || err.reason) return; onSave({ name: WATCHLISTS.find((w) => w.id === list)!.name, reason: reason.trim(), threshold: Number(threshold) }); };
  return (
    <Sheet eyebrow="Monitorar pessoa" title={p.name} onClose={onClose} onSubmit={save} width={480}
      footer={<><span className="dv-tools__sp" /><Button onClick={onClose}>Cancelar</Button><button type="submit" className="nx-btn nx-btn--primary">Incluir na lista</button></>}>
      <div className={`dv-field${touched && err.list ? ' is-err' : ''}`}>
        <span className="dv-field__l">Lista de observação<i>*</i></span>
        <Select label="Lista" value={list} invalid={touched && !!err.list} onChange={setList}
          options={lists.map((w) => ({ value: w.id, label: <span className="id-lopt">{w.name}<em>{w.state === 'ativa' ? 'Ativa' : 'Pausada'}</em></span> }))} />
        {touched && err.list && <span className="dv-field__h">{err.list}</span>}
      </div>
      <label className={`dv-field${touched && err.reason ? ' is-err' : ''}`}>
        <span className="dv-field__l">Motivo operacional<i>*</i></span>
        <textarea className="wl-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Por que esta pessoa precisa ser acompanhada (fica na trilha de auditoria)" />
        {touched && err.reason && <span className="dv-field__h">{err.reason}</span>}
      </label>
      <div className="dv-field id-half">
        <span className="dv-field__l">Similaridade mínima</span>
        <Select label="Similaridade mínima" value={threshold} onChange={setThreshold} options={THRESHOLDS.map((t) => ({ value: String(t), label: `${t}%` }))} />
      </div>
      {p.photo == null && <Alert type="warning">Sem foto de referência, a lista não gera matches de face para esta pessoa.</Alert>}
    </Sheet>
  );
}
