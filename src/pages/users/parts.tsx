import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Select, Sheet, Switch } from '../../ds/components';
import { initials, type Role, type User } from './data';

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

/** Painel do usuário, ao lado da tabela: acesso, papéis atribuídos e Editar. */
export function UserPanel({ u, roles, onClose, onEdit }: { u: User; roles: Record<string, Role>; onClose: () => void; onEdit: () => void }) {
  const main = u.roles[0];
  return (
    <aside className="us-panel" aria-label="Usuário">
      <header className="us-panel__head">
        <Avatar name={u.full_name || u.email} size={40} />
        <div className="us-panel__t">
          <h2>{u.full_name || u.email}</h2>
          {u.full_name && <p>{u.email}</p>}
          <Status active={u.is_active} />
        </div>
        <IconButton icon="close" label="Fechar painel" onClick={onClose} tipPlace="bottom" />
      </header>
      <div className="us-panel__body">
        <section>
          <h3>Acesso</h3>
          <div className="us-kpis">
            <div className="us-kpi">
              <span className="us-kpi__l"><span className="us-kpi__ic is-blue"><Icon name="shield" size={14} /></span>Papel</span>
              <b>{(main && roles[main]?.label) || main || '—'}</b>
              <em>Papel principal</em>
            </div>
            <div className="us-kpi">
              <span className="us-kpi__l"><span className="us-kpi__ic is-violet"><Icon name="wrench" size={14} /></span>Papéis</span>
              <b>{u.roles.length}</b>
              <em>Papéis atribuídos</em>
            </div>
          </div>
        </section>
        <section>
          <h3>Papéis atribuídos <span>{u.roles.length}</span></h3>
          {u.roles.length === 0 ? <p className="us-none">Nenhum papel</p> : (
            <ul className="us-alist">
              {u.roles.map((k) => <li key={k}><Icon name="shield" size={14} /><span className="us-alist__l">{roles[k]?.label ?? k}</span><code>{k}</code></li>)}
            </ul>
          )}
        </section>
      </div>
      <footer className="us-panel__foot"><Button variant="primary" icon="edit" onClick={onEdit}>Editar</Button></footer>
    </aside>
  );
}

export type UserValues = { full_name: string; email: string; role: string; password: string; is_active: boolean };

/** Novo usuário / Editar usuário: nome, e-mail, papel, senha e ativo. */
export function UserForm({ id, initial, roles, rolesByKey, onClose, onSave }: { id?: string; initial: UserValues; roles: Role[]; rolesByKey: Record<string, Role>; onClose: () => void; onSave: (v: UserValues) => void }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof UserValues, string>>>({});
  const set = (p: Partial<UserValues>) => setV((x) => ({ ...x, ...p }));
  const save = () => {
    const pw = v.password.trim();
    const e: typeof err = {};
    if (!v.full_name.trim()) e.full_name = 'Informe o nome';
    else if (!id && !/.+@.+\..+/.test(v.email)) e.email = 'E-mail inválido';
    else if (!id && pw && pw.length < 10) e.password = 'Senha de no mínimo 10 caracteres';
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
        <label className={`dv-field${err.password ? ' is-err' : ''}`}>
          <span className="dv-field__l">{id ? 'Nova senha' : 'Senha'}</span>
          <span className="nx-input us-in"><input type="password" autoComplete="new-password" value={v.password} onChange={(e) => set({ password: e.target.value })} /></span>
          <span className="dv-field__h">{err.password ?? (id ? 'Deixe vazio para manter a atual.' : 'Deixe em branco para gerar uma senha temporária.')}</span>
        </label>
        <div className="us-toggle">
          <span>Usuário ativo</span>
          <Switch checked={v.is_active} onChange={(a) => set({ is_active: a })} label="Usuário ativo" />
        </div>
      </div>
    </Sheet>
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
