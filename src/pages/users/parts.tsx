import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Select, Sheet, Switch } from '../../ds/components';
import { initials, tempPassword, TOTAL, type Role, type User } from './data';

const TONE: Record<string, string> = { super_admin: 'violet', admin: 'blue', operator: 'teal', viewer: 'amber', member: 'gray' };
export const roleTone = (k: string) => TONE[k] ?? 'rose';

/* Peças da tela de Usuários e Permissões: papel, status, painel do usuário e os dois formulários laterais. */

export function RolePill({ role, roles }: { role?: string; roles: Record<string, Role> }) {
  if (!role) return <span className="us-none">—</span>;
  const r = roles[role];
  return <span className={`us-pill${r?.plane === 'platform' ? ' is-platform' : ''}`}>{r?.label ?? role}</span>;
}

export function Status({ active }: { active: boolean }) {
  return <span className={`us-st${active ? ' is-on' : ''}`}><i />{active ? 'Ativo' : 'Inativo'}</span>;
}

const TONES = ['teal', 'red', 'rose', 'blue', 'green', 'amber'];
const tone = (s: string) => TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return <span className={`nx-avatar us-av is-${tone(name)}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials(name)}</span>;
}

/** Painel do usuário (clique na linha): acesso, papéis atribuídos e Editar. Mesmo padrão de drawer das outras telas. */
export function UserPanel({ u, roles, onClose, onEdit, onDelete }: { u: User; roles: Record<string, Role>; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const main = u.roles[0];
  return (
    <aside className="dv-drawer us-drawer" aria-label={`Usuário ${u.full_name || u.email}`}>
      <header className="dv-drawer__head">
        <Avatar name={u.full_name || u.email} size={40} />
        <div className="dv-drawer__title">
          <h2>{u.full_name || u.email}</h2>
          <p>{u.full_name ? u.email : 'Usuário'}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>
      <div className="dv-drawer__acts">
        <Button icon="edit" onClick={onEdit}>Editar</Button>
        <Button icon="trash" className="is-danger-ghost" onClick={onDelete}>Excluir</Button>
        <span className="dv-tools__sp" />
        <Status active={u.is_active} />
      </div>
      <div className="dv-drawer__body">
        <dl className="dv-info us-info">
          <div className="dv-info__row"><dt>Papel principal</dt><dd>{main ? <span className={`nx-badge us-role is-${roleTone(main)}`}>{roles[main]?.label ?? main}</span> : <span className="us-none">Nenhum</span>}</dd></div>
          <div className="dv-info__row"><dt>Permissões</dt><dd><b>{main && roles[main] ? roles[main].granted.length : 0}</b> <span className="us-none">de {TOTAL}</span></dd></div>
          <div className="dv-info__row"><dt>Acesso</dt><dd>{main && roles[main]?.plane === 'platform' ? 'Plataforma' : 'Cliente'}</dd></div>
        </dl>
        <section className="dv-sec">
          <div className="dv-sec__head"><h3>Papéis atribuídos</h3><span className="us-none">{u.roles.length}</span></div>
          {u.roles.length === 0 ? <p className="us-none">Nenhum papel</p> : (
            <ul className="lc-dlist us-alist">
              {u.roles.map((k) => (
                <li key={k}>
                  <span className={`dv-kind us-rkind${roles[k]?.plane === 'platform' ? ' is-platform' : ''}`}><Icon name="shield" size={16} /></span>
                  <span className="dv-name"><b>{roles[k]?.label ?? k}</b><span>{roles[k]?.plane === 'platform' ? 'Plataforma' : 'Cliente'} · {roles[k]?.granted.length ?? 0} permissões</span></span>
                  <code>{k}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

export type UserValues = { full_name: string; email: string; role: string; password: string; is_active: boolean };

/** Novo usuário / Editar usuário: nome, e-mail, papel, senha e ativo. */
export function UserForm({ id, initial, roles, rolesByKey, onClose, onSave }: { id?: string; initial: UserValues; roles: Role[]; rolesByKey: Record<string, Role>; onClose: () => void; onSave: (v: UserValues) => void }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof UserValues | 'confirm', string>>>({});
  const set = (p: Partial<UserValues>) => setV((x) => ({ ...x, ...p }));
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const gen = () => { const g = tempPassword(); set({ password: g }); setPw2(g); setShowPw(true); setErr((x) => ({ ...x, password: undefined, confirm: undefined })); };
  const save = () => {
    const pw = v.password.trim();
    const e: typeof err = {};
    if (!v.full_name.trim()) e.full_name = 'Informe o nome';
    if (!id && !/.+@.+\..+/.test(v.email)) e.email = 'E-mail inválido';
    if (pw && pw.length < 10) e.password = 'Senha de no mínimo 10 caracteres';
    else if (pw && pw2 !== v.password) e.confirm = 'As senhas não conferem';
    setErr(e);
    if (Object.keys(e).length) return;
    onSave({ ...v, full_name: v.full_name.trim(), email: v.email.trim(), password: pw });
  };
  const nPerm = rolesByKey[v.role]?.granted.length;
  return (
    <Sheet eyebrow={id ? 'Editar usuário' : 'Novo usuário'} title={v.full_name || v.email || 'Usuário'} width={500} onClose={onClose} onSubmit={save}
      footer={<><Button onClick={onClose}>Cancelar</Button><span className="dv-tools__sp" /><button type="submit" className="nx-btn nx-btn--primary">{id ? 'Salvar' : 'Criar'}</button></>}>
      <div className="us-fields">
        <label className={`dv-field${err.full_name ? ' is-err' : ''}`}>
          <span className="dv-field__l">Nome completo<i className="us-req">*</i></span>
          <span className="nx-input us-in"><input autoFocus value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} /></span>
          {err.full_name && <span className="dv-field__h">{err.full_name}</span>}
        </label>
        <label className={`dv-field${err.email ? ' is-err' : ''}`}>
          <span className="dv-field__l">E-mail<i className="us-req">*</i></span>
          <span className="nx-input us-in"><input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} /></span>
          {(err.email || id) && <span className="dv-field__h">{err.email ?? 'O e-mail identifica o login e não muda aqui.'}</span>}
        </label>
        <div className="dv-field us-sel">
          <span className="dv-field__l">Papel</span>
          <Select<string> label="Papel" value={v.role} onChange={(r) => set({ role: r })} options={roles.map((r) => ({ value: r.key, label: r.label }))} />
          {nPerm != null && <span className="dv-field__h">{nPerm} {nPerm === 1 ? 'permissão' : 'permissões'}</span>}
        </div>
        <div className={`dv-field${err.password ? ' is-err' : ''}`}>
          <span className="dv-field__l">{id ? 'Nova senha' : 'Senha'}</span>
          <span className="us-pwrow">
            <span className="nx-input us-in">
              <input type={showPw ? 'text' : 'password'} autoComplete="new-password" aria-label={id ? 'Nova senha' : 'Senha'} value={v.password}
                onChange={(e) => { set({ password: e.target.value }); setErr((x) => ({ ...x, password: undefined })); }} />
              <button type="button" className="us-eye" aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPw((x) => !x)}><Icon name={showPw ? 'eyeOff' : 'eye'} size={16} /></button>
            </span>
            <Button icon="refresh" onClick={gen}>Gerar</Button>
          </span>
          {v.password ? <Strength pw={v.password} /> : <span className="dv-field__h">{err.password ?? (id ? 'Deixe vazio para manter a atual.' : 'Deixe em branco para gerar uma senha temporária.')}</span>}
          {v.password && err.password && <span className="dv-field__h">{err.password}</span>}
        </div>
        {v.password && (
          <label className={`dv-field${err.confirm ? ' is-err' : ''}`}>
            <span className="dv-field__l">Repetir senha</span>
            <span className="nx-input us-in"><input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => { setPw2(e.target.value); setErr((x) => ({ ...x, confirm: undefined })); }} /></span>
            {(err.confirm || (pw2 && pw2 === v.password)) && <span className={`dv-field__h${!err.confirm ? ' us-ok' : ''}`}>{err.confirm ?? 'As senhas conferem'}</span>}
          </label>
        )}
        <div className="us-toggle">
          <span>Usuário ativo</span>
          <Switch checked={v.is_active} onChange={(a) => set({ is_active: a })} label="Usuário ativo" />
        </div>
      </div>
    </Sheet>
  );
}

/** Medidor de força da senha (DS › Key Components › Password Strength): 3 barras e os critérios abaixo. */
const RULES: [string, (p: string) => boolean][] = [
  ['Pelo menos 1 letra maiúscula', (p) => /[A-Z]/.test(p)],
  ['Pelo menos 1 número', (p) => /\d/.test(p)],
  ['Pelo menos 10 caracteres', (p) => p.length >= 10],
];
export function Strength({ pw }: { pw: string }) {
  const ok = RULES.map(([, t]) => t(pw));
  const n = ok.filter(Boolean).length;
  const lv = !pw ? 'empty' : n <= 1 ? 'weak' : n === 2 ? 'mid' : 'strong';
  const title = { empty: 'A senha precisa ter:', weak: 'Senha fraca. Precisa ter:', mid: 'Senha moderada. Precisa ter:', strong: 'Senha forte. Sua senha está segura.' }[lv];
  const lit = lv === 'empty' ? 0 : lv === 'weak' ? 1 : lv === 'mid' ? 2 : 3;
  return (
    <div className={`us-str is-${lv}`} aria-live="polite">
      <div className="us-str__bars">{[0, 1, 2].map((i) => <i key={i} className={i < lit ? 'is-on' : ''} />)}</div>
      <p>{title}</p>
      <ul>
        {RULES.map(([l], i) => (
          <li key={l} className={ok[i] ? 'is-ok' : pw ? 'is-no' : ''}><Icon name={ok[i] ? 'successFill' : pw ? 'errorFill' : 'successFill'} size={14} />{l}</li>
        ))}
      </ul>
    </div>
  );
}

/** Novo papel / Renomear papel: só o nome. As permissões são marcadas na matriz. */
export function RoleForm({ role, onClose, onSave }: { role: { key?: string; label: string }; onClose: () => void; onSave: (label: string) => void }) {
  const [label, setLabel] = useState(role.label);
  const [err, setErr] = useState('');
  const save = () => { if (!label.trim()) { setErr('Informe o nome do papel'); return; } onSave(label.trim()); };
  return (
    <Sheet eyebrow={role.key ? 'Renomear papel' : 'Novo papel'} title={label || 'Papel'} width={460} onClose={onClose} onSubmit={save}
      footer={<><Button onClick={onClose}>Cancelar</Button><span className="dv-tools__sp" /><button type="submit" className="nx-btn nx-btn--primary">{role.key ? 'Salvar' : 'Criar'}</button></>}>
      <div className="us-fields">
        <label className={`dv-field${err ? ' is-err' : ''}`}>
          <span className="dv-field__l">Nome do papel<i className="us-req">*</i></span>
          <span className="nx-input us-in"><input autoFocus value={label} onChange={(e) => { setLabel(e.target.value); setErr(''); }} /></span>
          {err && <span className="dv-field__h">{err}</span>}
        </label>
        <p className="us-hint">Depois de criar, marque as permissões deste papel na matriz (coluna do papel).{role.key ? '' : ' Começa sem nenhuma permissão.'}</p>
      </div>
    </Sheet>
  );
}

/** Senha temporária gerada ao criar sem senha: aparece uma vez só. */
export function PasswordModal({ pw, onClose }: { pw: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onClose]);
  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="us-pw" role="dialog" aria-modal="true" aria-labelledby="us-pw-t">
        <header>
          <span className="us-pw__ic"><Icon name="infoFill" size={20} /></span>
          <div><h2 id="us-pw-t">Senha temporária</h2><p>Copie agora, ela não aparece de novo.</p></div>
        </header>
        <div className="us-pw__box">
          <code>{pw}</code>
          <Button icon={copied ? 'check' : 'copy'} onClick={() => { navigator.clipboard?.writeText(pw).catch(() => {}); setCopied(true); }}>{copied ? 'Copiada' : 'Copiar'}</Button>
        </div>
        <footer><Button variant="primary" onClick={onClose}>Fechar</Button></footer>
      </div>
    </div>,
    document.body,
  );
}
