import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Segmented, Select, Switch } from '../../ds/components';
import { Chip, Field } from '../traits/parts';
import { ModuleBars, permCount, RoleTag } from './parts';
import { initials, LOCAIS, TEAMS, type Role, type User } from './data';

export type UserDraft = { name: string; email: string; team: string; role: string; locais: string[]; mfa: boolean; active: boolean; access: 'convite' | 'senha' };
type Props = { edit?: User; roles: Role[]; emails: string[]; onClose: () => void; onSave: (d: UserDraft) => void };

const STEPS = ['Dados', 'Papel', 'Acesso'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const toggle = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);

/** Novo usuário / editar usuário em etapas, com o cartão do usuário e o alcance do papel ao lado. */
export function UserWizard({ edit, roles, emails, onClose, onSave }: Props) {
  const [d, setD] = useState<UserDraft>(() => edit
    ? { name: edit.name, email: edit.email, team: edit.team, role: edit.role, locais: edit.locais, mfa: edit.mfa, active: edit.status !== 'inativo', access: 'convite' }
    : { name: '', email: '', team: '', role: '', locais: [], mfa: true, active: true, access: 'convite' });
  const [scope, setScope] = useState<'todos' | 'alguns'>(edit?.locais.length ? 'alguns' : 'todos');
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(edit ? STEPS.length - 1 : 0);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof UserDraft>(k: K, v: UserDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const role = roles.find((r) => r.key === d.role);

  const err = {
    name: d.name.trim().length < 3 ? 'Informe o nome completo.' : '',
    email: edit ? '' : !EMAIL.test(d.email.trim()) ? 'Informe um e-mail válido.' : emails.includes(d.email.trim().toLowerCase()) ? 'Já existe um usuário com este e-mail.' : '',
    role: !d.role ? 'Escolha um papel.' : '',
    locais: scope === 'alguns' && d.locais.length === 0 ? 'Escolha pelo menos um local.' : '',
  };
  const stepOk = (i: number) => (i === 0 ? !err.name && !err.email : i === 1 ? !err.role : !err.locais);
  const last = step === STEPS.length - 1;
  const go = (i: number) => {
    if (i > step) for (let s = step; s < i; s++) if (!stepOk(s)) { setStep(s); setTried(true); return; }
    setTried(false); setStep(i); setSeen((x) => Math.max(x, i));
  };
  const submit = () => {
    for (let s = 0; s < STEPS.length; s++) if (!stepOk(s)) { setStep(s); setTried(true); return; }
    onSave({ ...d, name: d.name.trim(), email: d.email.trim().toLowerCase(), locais: scope === 'todos' ? [] : d.locais });
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.nx-menu')) { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (last) submit(); else go(step + 1); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  });

  const show = (k: keyof typeof err) => (tried ? err[k] : '');

  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tr-wiz us-wiz" role="dialog" aria-modal="true" aria-labelledby="us-wiz-t">
        <header className="tr-wiz__head">
          <div>
            <span className="nx-sheet__eyebrow">{edit ? 'Editar usuário' : 'Novo usuário'}</span>
            <h2 id="us-wiz-t">{edit ? edit.name : 'Dar acesso a uma pessoa'}</h2>
          </div>
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>

        <ol className="oc-steps oc-wsteps tr-wiz__steps" aria-label="Etapas" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
          {STEPS.map((w, i) => (
            <li key={w} className={i < step ? 'is-done' : i === step ? 'is-on' : undefined}>
              <button type="button" disabled={i > seen && i > step + 1} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
                <i>{i < step ? <Icon name="check" size={10} /> : i + 1}</i><span>{w}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="tr-wiz__main">
          <aside className="tr-wiz__side us-wiz__side" aria-label="Prévia do usuário">
            <div className="us-card">
              <span className={`nx-avatar us-av is-lg is-${role?.tone ?? 'gray'}`}>{d.name.trim() ? initials(d.name.trim()) : <Icon name="people" size={20} />}</span>
              <b>{d.name.trim() || 'Nome da pessoa'}</b>
              <span>{d.email.trim() || 'e-mail de acesso'}</span>
              {role ? <RoleTag role={role} /> : <span className="us-card__none">Sem papel ainda</span>}
            </div>
            {role ? (
              <div className="us-reach">
                <span className="tr-eyebrow">O que o papel libera</span>
                <ModuleBars perms={role.perms} compact />
                <span className="us-reach__n">{permCount(role.perms)}</span>
              </div>
            ) : <p className="us-side-hint">Escolha um papel para ver o que esta pessoa poderá fazer.</p>}
          </aside>

          <div className="tr-wiz__body" key={step}>
            {step === 0 && (
              <>
                <Field label="Nome completo">
                  <label className={`nx-input us-in${show('name') ? ' is-err' : ''}`}>
                    <input autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Ana Beatriz Lima" aria-label="Nome completo" />
                  </label>
                  {show('name') && <p className="tr-err" role="alert">{err.name}</p>}
                </Field>
                <Field label="E-mail" hint={edit ? undefined : 'é o login da pessoa'}>
                  {edit ? (
                    <>
                      <span className="nx-input us-in is-ro"><Icon name="lock" size={14} /><input value={d.email} readOnly aria-label="E-mail" /></span>
                      <p className="tr-tip is-plain">O e-mail identifica o login e não muda por aqui.</p>
                    </>
                  ) : (
                    <>
                      <label className={`nx-input us-in${show('email') ? ' is-err' : ''}`}>
                        <input type="email" value={d.email} onChange={(e) => set('email', e.target.value)} placeholder="nome@unibrasil.edu.br" aria-label="E-mail" />
                      </label>
                      {show('email') && <p className="tr-err" role="alert">{err.email}</p>}
                    </>
                  )}
                </Field>
                <Field label="Equipe" hint="opcional">
                  <div className="us-half">
                    <Select<string> label="Equipe" value={d.team} onChange={(v) => set('team', v)} placeholder="Sem equipe"
                      options={[{ value: '', label: 'Sem equipe' }, ...TEAMS.map((t) => ({ value: t, label: t }))]} />
                  </div>
                </Field>
              </>
            )}

            {step === 1 && (
              <Field label="Papel" hint="define o que a pessoa vê e faz">
                <div className="us-roles" role="radiogroup" aria-label="Papel">
                  {roles.map((r) => (
                    <button key={r.key} type="button" role="radio" aria-checked={d.role === r.key} className={`us-ropt${d.role === r.key ? ' is-on' : ''}`} onClick={() => set('role', r.key)}>
                      <span className="us-ropt__radio" aria-hidden="true" />
                      <span className="us-ropt__t">
                        <span className="us-ropt__h"><RoleTag role={r} plain />{r.system ? <em>Sistema</em> : <em className="is-custom">Personalizado</em>}</span>
                        <span className="us-ropt__d">{r.description}</span>
                      </span>
                      <span className="us-ropt__n">{r.perms.length}<small>permissões</small></span>
                    </button>
                  ))}
                </div>
                {show('role') && <p className="tr-err" role="alert">{err.role}</p>}
              </Field>
            )}

            {step === 2 && (
              <>
                <Field label="Locais" hint="onde a pessoa enxerga câmeras e eventos">
                  <Segmented<'todos' | 'alguns'> label="Locais" value={scope} onChange={setScope}
                    options={[{ value: 'todos', label: 'Todos os locais' }, { value: 'alguns', label: 'Só alguns' }]} />
                  {scope === 'alguns' && (
                    <div className="tr-chips">{LOCAIS.map((l) => <Chip key={l} on={d.locais.includes(l)} onClick={() => set('locais', toggle(d.locais, l))}>{l}</Chip>)}</div>
                  )}
                  {show('locais') && <p className="tr-err" role="alert">{err.locais}</p>}
                </Field>
                {!edit && (
                  <Field label="Primeiro acesso">
                    <Segmented<UserDraft['access']> label="Primeiro acesso" value={d.access} onChange={(v) => set('access', v)}
                      options={[{ value: 'convite', label: 'Enviar convite por e-mail' }, { value: 'senha', label: 'Gerar senha temporária' }]} />
                    <p className="tr-tip is-plain">{d.access === 'convite'
                      ? 'A pessoa recebe um link para criar a própria senha. O link vale por 72 horas.'
                      : 'A senha aparece uma vez só, logo depois de criar. A pessoa troca no primeiro acesso.'}</p>
                  </Field>
                )}
                <Field label="Segurança">
                  <div className="us-toggles">
                    <label className="us-toggle">
                      <span><b>Verificação em duas etapas</b><em>Pede um código do celular a cada novo acesso</em></span>
                      <Switch checked={d.mfa} onChange={(v) => set('mfa', v)} label="Verificação em duas etapas" />
                    </label>
                    {edit && (
                      <label className="us-toggle">
                        <span><b>Acesso ativo</b><em>{d.active ? 'A pessoa consegue entrar no sistema' : 'Sessões encerradas e entrada bloqueada'}</em></span>
                        <Switch checked={d.active} onChange={(v) => set('active', v)} label="Acesso ativo" />
                      </label>
                    )}
                  </div>
                </Field>
                <Field label="Resumo">
                  <dl className="tr-review">
                    <div><dt>Pessoa</dt><dd>{d.name.trim()} · {d.email.trim()}{d.team ? ` · ${d.team}` : ''}</dd><button type="button" className="tr-link" onClick={() => go(0)}>Alterar</button></div>
                    <div><dt>Papel</dt><dd>{role ? `${role.label} · ${permCount(role.perms)}` : '—'}</dd><button type="button" className="tr-link" onClick={() => go(1)}>Alterar</button></div>
                    <div><dt>Locais</dt><dd>{scope === 'todos' ? 'Todos os locais' : d.locais.join(', ') || '—'}</dd><span /></div>
                  </dl>
                </Field>
              </>
            )}
          </div>
        </div>

        <footer className="tr-wiz__foot">
          {step > 0 ? <Button icon="arrowLeft" onClick={() => go(step - 1)}>Voltar</Button> : <Button onClick={onClose}>Cancelar</Button>}
          <span className="tr-wiz__count">{step + 1} de {STEPS.length}</span>
          {edit ? (
            <>
              {!last && <Button onClick={() => go(step + 1)}>Próximo</Button>}
              <Button variant="primary" icon="check" onClick={submit}>Salvar alterações</Button>
            </>
          ) : last
            ? <Button variant="primary" icon="plus" onClick={submit}>{d.access === 'convite' ? 'Criar e enviar convite' : 'Criar usuário'}</Button>
            : <Button variant="primary" onClick={() => go(step + 1)}>Próximo</Button>}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
