import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Checkbox, Icon, IconButton, Select } from '../../ds/components';
import { Field } from '../traits/parts';
import { ModuleBars, permCount } from './parts';
import { MODULES, type Role } from './data';

export type RoleDraft = { label: string; description: string; perms: string[] };
type Props = { edit?: Role; base?: Role; roles: Role[]; onClose: () => void; onSave: (d: RoleDraft) => void };

const STEPS = ['Identificação', 'Permissões'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Novo papel / editar papel em duas etapas: nome e ponto de partida, depois as permissões por módulo. */
export function RoleWizard({ edit, base, roles, onClose, onSave }: Props) {
  const [label, setLabel] = useState(edit?.label ?? (base ? `${base.label} (cópia)` : ''));
  const [description, setDescription] = useState(edit?.description ?? base?.description ?? '');
  const [from, setFrom] = useState(base?.key ?? '');
  const [perms, setPerms] = useState<string[]>(edit?.perms ?? base?.perms ?? []);
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(edit ? 1 : 0);
  const [tried, setTried] = useState(false);
  const [open, setOpen] = useState<string[]>(() => MODULES.map((m) => m.id));

  const dup = roles.some((r) => r.key !== edit?.key && norm(r.label) === norm(label));
  const lErr = label.trim().length < 3 ? 'Dê um nome com pelo menos 3 caracteres.' : dup ? 'Já existe um papel com este nome.' : '';
  const pErr = perms.length === 0 ? 'Marque pelo menos uma permissão.' : '';
  const last = step === 1;
  const go = (i: number) => {
    if (i > step && lErr) { setTried(true); return; }
    setTried(false); setStep(i); setSeen((s) => Math.max(s, i));
  };
  const submit = () => {
    if (lErr) { setStep(0); setTried(true); return; }
    if (pErr) { setStep(1); setTried(true); return; }
    onSave({ label: label.trim(), description: description.trim(), perms });
  };
  const pickBase = (k: string) => { setFrom(k); setPerms(roles.find((r) => r.key === k)?.perms ?? []); };
  const flip = (k: string) => setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.nx-menu')) { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (last) submit(); else go(1); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  });

  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tr-wiz us-wiz" role="dialog" aria-modal="true" aria-labelledby="us-rw-t">
        <header className="tr-wiz__head">
          <div>
            <span className="nx-sheet__eyebrow">{edit ? 'Editar papel' : 'Novo papel'}</span>
            <h2 id="us-rw-t">{edit ? edit.label : 'Criar um papel personalizado'}</h2>
          </div>
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>

        <ol className="oc-steps oc-wsteps tr-wiz__steps" aria-label="Etapas" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {STEPS.map((w, i) => (
            <li key={w} className={i < step ? 'is-done' : i === step ? 'is-on' : undefined}>
              <button type="button" disabled={i > seen && i > step + 1} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
                <i>{i < step ? <Icon name="check" size={10} /> : i + 1}</i><span>{w}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="tr-wiz__main">
          <aside className="tr-wiz__side us-wiz__side" aria-label="Alcance do papel">
            <div className="us-card is-role">
              <span className="us-card__ic"><Icon name="shield" size={22} /></span>
              <b>{label.trim() || 'Nome do papel'}</b>
              <span>{permCount(perms)}</span>
            </div>
            <div className="us-reach">
              <span className="tr-eyebrow">O que o papel libera</span>
              <ModuleBars perms={perms} compact />
            </div>
          </aside>

          <div className="tr-wiz__body" key={step}>
            {step === 0 ? (
              <>
                <Field label="Nome do papel">
                  <label className={`nx-input us-in${tried && lErr ? ' is-err' : ''}`}>
                    <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Portaria noturna" aria-label="Nome do papel" />
                  </label>
                  {tried && lErr && <p className="tr-err" role="alert">{lErr}</p>}
                </Field>
                <Field label="Para que serve" hint="opcional">
                  <textarea className="nx-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quem usa e o que precisa fazer" />
                </Field>
                {!edit && (
                  <Field label="Ponto de partida">
                    <div className="us-half">
                      <Select<string> label="Ponto de partida" value={from} onChange={pickBase}
                        options={[{ value: '', label: 'Começar sem permissões' }, ...roles.map((r) => ({ value: r.key, label: `Copiar de ${r.label}` }))]} />
                    </div>
                    <p className="tr-tip is-plain">Copiar de um papel parecido é o jeito mais rápido. Você ajusta tudo na próxima etapa.</p>
                  </Field>
                )}
              </>
            ) : (
              <>
                <div className="us-pbar">
                  <span><b>{perms.length}</b> de {MODULES.reduce((n, m) => n + m.perms.length, 0)} permissões marcadas</span>
                  <span className="dv-tools__sp" />
                  <button type="button" className="tr-link" onClick={() => setOpen(open.length ? [] : MODULES.map((m) => m.id))}>{open.length ? 'Recolher módulos' : 'Expandir módulos'}</button>
                </div>
                {tried && pErr && <p className="tr-err" role="alert">{pErr}</p>}
                <div className="us-pedit">
                  {MODULES.map((m) => {
                    const n = m.perms.filter((p) => perms.includes(p.key)).length;
                    const isOpen = open.includes(m.id);
                    const all = n === m.perms.length;
                    return (
                      <section key={m.id} className={`us-pgrp${isOpen ? ' is-open' : ''}`}>
                        <div className="us-pgrp__h">
                          <Checkbox label={`Todas de ${m.label}`} checked={all} indeterminate={n > 0 && !all}
                            onChange={() => setPerms((p) => (all ? p.filter((k) => !m.perms.some((x) => x.key === k)) : [...new Set([...p, ...m.perms.map((x) => x.key)])]))} />
                          <button type="button" className="us-pgrp__t" aria-expanded={isOpen} onClick={() => setOpen((o) => (o.includes(m.id) ? o.filter((x) => x !== m.id) : [...o, m.id]))}>
                            <Icon name={m.icon} size={16} />{m.label}<em>{n} de {m.perms.length}</em>
                            <Icon name="chevron" size={14} className="us-pgrp__chev" />
                          </button>
                        </div>
                        {isOpen && (
                          <div className="us-pgrp__b">
                            {m.perms.map((p) => (
                              <Checkbox key={p.key} label={p.label} checked={perms.includes(p.key)} onChange={() => flip(p.key)}>
                                <span className="us-pl"><b>{p.label}{p.sensitive && <span className="tr-badge">sensível</span>}</b><em>{p.hint}</em></span>
                              </Checkbox>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="tr-wiz__foot">
          {step > 0 ? <Button icon="arrowLeft" onClick={() => go(0)}>Voltar</Button> : <Button onClick={onClose}>Cancelar</Button>}
          <span className="tr-wiz__count">{step + 1} de 2</span>
          {edit && !last && <Button onClick={() => go(1)}>Próximo</Button>}
          {edit || last
            ? <Button variant="primary" icon={edit ? 'check' : 'plus'} onClick={submit}>{edit ? 'Salvar alterações' : 'Criar papel'}</Button>
            : <Button variant="primary" onClick={() => go(1)}>Próximo</Button>}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
