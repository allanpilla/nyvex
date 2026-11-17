import { useMemo, useState } from 'react';
import { Button, IconButton, PageHeader, Tabs } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { RolesMatrix } from './RolesView';
import { Avatar, PasswordModal, RoleForm, RolePill, Status, UserForm, UserPanel, type UserValues } from './parts';
import { ROLES, tempPassword, USERS, type Role, type User } from './data';
import '../devices/devices.css';
import './users.css';

type Tab = 'usuarios' | 'permissoes';

/**
 * Usuários e Permissões, fiel ao sistema atual: aba Usuários (tabela, painel lateral, editar e remover)
 * e aba Papéis & Permissões (matriz). Criar e editar abrem um formulário lateral.
 */
export function UsersPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<User[]>(USERS);
  const [roles, setRoles] = useState<Role[]>(ROLES);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id?: string; values: UserValues } | null>(null);
  const [roleEditor, setRoleEditor] = useState<{ key?: string; label: string } | null>(null);
  const [pw, setPw] = useState<string | null>(null);

  const byKey = useMemo(() => Object.fromEntries(roles.map((r) => [r.key, r])), [roles]);
  const tenantRoles = roles.filter((r) => r.plane === 'tenant');
  const open = users.find((u) => u.id === openId) ?? null;

  const newUser = () => setEditor({ values: { full_name: '', email: '', role: tenantRoles[0]?.key ?? 'operator', password: '', is_active: true } });
  const editUser = (u: User) => setEditor({ id: u.id, values: { full_name: u.full_name, email: u.email, role: u.roles[0] ?? 'operator', password: '', is_active: u.is_active } });
  const saveUser = (v: UserValues) => {
    if (editor?.id) {
      const id = editor.id;
      setUsers((l) => l.map((u) => (u.id === id ? { ...u, full_name: v.full_name, roles: [v.role], is_active: v.is_active } : u)));
      toast('Usuário atualizado');
    } else {
      setUsers((l) => [...l, { id: `n${Date.now()}`, full_name: v.full_name, email: v.email, roles: [v.role], is_active: true }]);
      if (!v.password) setPw(tempPassword());
      toast('Usuário criado');
    }
    setEditor(null);
  };
  const askRemove = (id: string) => { setConfirm(id); setTimeout(() => setConfirm((c) => (c === id ? null : c)), 3000); };
  const remove = (id: string) => { setConfirm(null); setUsers((l) => l.filter((u) => u.id !== id)); if (openId === id) setOpenId(null); toast('Usuário removido'); };

  const toggle = (r: Role, key: string) => setRoles((l) => l.map((x) => (x.key === r.key ? { ...x, granted: x.granted.includes(key) ? x.granted.filter((k) => k !== key) : [...x.granted, key] } : x)));
  const saveRole = (label: string) => {
    if (roleEditor?.key) {
      const k = roleEditor.key;
      setRoles((l) => l.map((r) => (r.key === k ? { ...r, label } : r)));
      toast('Papel atualizado');
    } else {
      setRoles((l) => [...l, { key: `r${Date.now()}`, label, plane: 'tenant', is_system: false, granted: [] }]);
      toast('Papel criado');
    }
    setRoleEditor(null);
  };

  return (
    <div className="dv us">
      <div className="dv-main">
        <PageHeader title={screen.label} icon="shield" description="Quem acessa o sistema e o que cada papel pode fazer."
          actions={tab === 'usuarios'
            ? <Button variant="primary" icon="plus" onClick={newUser}>Novo usuário</Button>
            : <Button variant="primary" icon="plus" onClick={() => setRoleEditor({ label: '' })}>Novo papel</Button>} />

        <div className="us-body">
          <Tabs<Tab> label="Seções" value={tab} onChange={setTab} options={[
            { value: 'usuarios', label: 'Usuários', icon: 'people' },
            { value: 'permissoes', label: 'Papéis & Permissões', icon: 'shield' },
          ]} />

          {tab === 'usuarios' ? (
            <div className="us-card us-users">
              <div className="us-users__scroll">
                <div className="dv-table us-table" role="table" aria-label="Usuários">
                  <div className="dv-tr dv-th" role="row">
                    <span className="dv-c" role="columnheader">Usuário</span>
                    <span className="dv-c" role="columnheader">Papel</span>
                    <span className="dv-c" role="columnheader">Status</span>
                    <span className="dv-c" role="columnheader"><span className="nx-sr">Ações</span></span>
                  </div>
                  {users.map((u) => (
                    <div key={u.id} role="row" tabIndex={0} className={`dv-tr${openId === u.id ? ' is-open' : ''}`}
                      onClick={() => setOpenId(openId === u.id ? null : u.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setOpenId(openId === u.id ? null : u.id); }}>
                      <span className="dv-c us-c-user" role="cell">
                        <Avatar name={u.full_name || u.email} />
                        <span className="dv-two"><b>{u.full_name || '—'}</b><span>{u.email}</span></span>
                      </span>
                      <span className="dv-c" role="cell"><RolePill role={u.roles[0]} roles={byKey} /></span>
                      <span className="dv-c" role="cell"><Status active={u.is_active} /></span>
                      <span className="dv-c dv-c--act us-c-act" role="cell" onClick={(e) => e.stopPropagation()}>
                        <IconButton icon="edit" label="Editar" onClick={() => editUser(u)} tipPlace="top" />
                        {confirm === u.id
                          ? <button type="button" className="us-confirm" onClick={() => remove(u.id)}>Confirmar?</button>
                          : <IconButton icon="trash" label="Remover" className="us-del" onClick={() => askRemove(u.id)} tipPlace="top" />}
                      </span>
                    </div>
                  ))}
                  {users.length === 0 && <p className="us-empty">Nenhum usuário ainda.</p>}
                </div>
              </div>
              {open && <UserPanel key={open.id} u={open} roles={byKey} onClose={() => setOpenId(null)} onEdit={() => { editUser(open); setOpenId(null); }} />}
            </div>
          ) : (
            <RolesMatrix roles={roles} onToggle={toggle} onRename={(r) => setRoleEditor({ key: r.key, label: r.label })}
              onDelete={(r) => { setRoles((l) => l.filter((x) => x.key !== r.key)); toast('Papel removido'); }} />
          )}
        </div>
      </div>

      {editor && <UserForm id={editor.id} initial={editor.values} roles={tenantRoles} rolesByKey={byKey} onClose={() => setEditor(null)} onSave={saveUser} />}
      {roleEditor && <RoleForm role={roleEditor} onClose={() => setRoleEditor(null)} onSave={saveRole} />}
      {pw && <PasswordModal pw={pw} onClose={() => setPw(null)} />}
    </div>
  );
}
