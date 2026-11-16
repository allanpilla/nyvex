import { useState } from 'react';
import { Alert, Button, Icon, Sheet } from '../../ds/components';
import { norm } from '../devices/parts';
import type { Watchlist } from './data';

type Data = { name: string; description: string; justification: string };
type Props = { edit?: Watchlist; names: string[]; onClose: () => void; onSave: (d: Data) => void };

/** Criar / editar watchlist. Mesmos campos do sistema atual; a lista nova começa pausada. */
export function WatchlistForm({ edit, names, onClose, onSave }: Props) {
  const [name, setName] = useState(edit?.name ?? '');
  const [description, setDescription] = useState(edit?.description ?? '');
  const [justification, setJustification] = useState('');
  const [touched, setTouched] = useState(false);
  const dup = names.some((n) => norm(n) === norm(name.trim()) && n !== edit?.name);
  const errors = {
    name: !name.trim() ? 'Obrigatório' : dup ? 'Já existe uma lista com esse nome' : '',
    justification: !justification.trim() ? 'Obrigatório: fica na trilha de auditoria' : '',
  };
  const nErr = Object.values(errors).filter(Boolean).length;
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '');
  const save = () => {
    setTouched(true);
    if (nErr) return;
    onSave({ name: name.trim(), description: description.trim(), justification: justification.trim() });
  };

  return (
    <Sheet eyebrow={edit ? 'Editar watchlist' : 'Nova coleção'} title={edit ? edit.name : 'Criar watchlist'} onClose={onClose} onSubmit={save} width={520}
      footer={
        <>
          {touched && nErr > 0 && <span className="dv-form__err"><Icon name="errorFill" size={14} />{nErr === 1 ? '1 campo precisa de atenção' : `${nErr} campos precisam de atenção`}</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">{edit ? 'Salvar alterações' : 'Criar lista'}</button>
        </>
      }>
      {!edit && <Alert type="information">A lista começa pausada. Nenhuma detecção será vinculada antes da ativação explícita.</Alert>}
      <section className="dv-card2">
        <h3>Identificação</h3>
        <label className={`dv-field${err('name') ? ' is-err' : ''}`}>
          <span className="dv-field__l">Nome da lista<i>*</i></span>
          <span className="nx-input"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Acompanhamento do campus" autoFocus /></span>
          {err('name') && <span className="dv-field__h">{err('name')}</span>}
        </label>
        <label className="dv-field">
          <span className="dv-field__l">Descrição operacional</span>
          <textarea className="wl-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto de uso, sem dados sensíveis desnecessários" />
        </label>
      </section>
      <section className="dv-card2">
        <h3>Auditoria</h3>
        <label className={`dv-field${err('justification') ? ' is-err' : ''}`}>
          <span className="dv-field__l">{edit ? 'Justificativa da alteração' : 'Justificativa da criação'}<i>*</i></span>
          <textarea className="wl-textarea" rows={3} value={justification} onChange={(e) => setJustification(e.target.value)}
            placeholder={edit ? 'Por que esta alteração é necessária (fica na trilha de auditoria)' : 'Por que esta lista é necessária (fica na trilha de auditoria)'} />
          {err('justification') && <span className="dv-field__h">{err('justification')}</span>}
        </label>
      </section>
    </Sheet>
  );
}
