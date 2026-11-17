import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader, Segmented, Select, Tabs, useTooltip } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { UserWizard, type UserDraft } from './UserWizard';
import { RolesView } from './RolesView';
import { RoleWizard, type RoleDraft } from './RoleWizard';
import { PasswordModal, RoleTag } from './parts';
import { ago, buildUsers, fmtDate, initials, ROLES, STATUS_LABEL, tempPassword, type Role, type User, type UStatus } from './data';
import '../mural/mural.css';
import '../devices/devices.css';
import '../occurrences/occurrences.css';
import '../traits/traits.css';
import './users.css';

type Tab = 'usuarios' | 'papeis';
type StatusF = 'todos' | UStatus;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function UsersPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [now] = useState(() => Date.now());
  const [users, setUsers] = useState<User[]>(() => buildUsers(now));
  const [roles, setRoles] = useState<Role[]>(ROLES);
  const [tab, setTab] = useState<Tab>('usuarios');
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('');
  const [statusF, setStatusF] = useState<StatusF>('todos');
  const [wizard, setWizard] = useState<{ edit?: User } | null>(null);
  const [roleWiz, setRoleWiz] = useState<{ edit?: Role; base?: Role } | null>(null);
  const [roleSel, setRoleSel] = useState(ROLES[0].key);
  const [menu, setMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'deactivate' | 'removeRole'; id: string } | null>(null);
  const [pw, setPw] = useState<{ name: string; email: string; pw: string } | null>(null);

  const roleOf = (k: string) => roles.find((r) => r.key === k);
  const nq = norm(q.trim());
  const base = users.filter((u) => (!roleF || u.role === roleF) && (!nq || norm(`${u.name} ${u.email} ${u.team} ${roleOf(u.role)?.label ?? ''}`).includes(nq)));
  const rows = useMemo(() => base.filter((u) => statusF === 'todos' || u.status === statusF)
    .sort((a, b) => (a.status === 'inativo' ? 1 : 0) - (b.status === 'inativo' ? 1 : 0) || a.name.localeCompare(b.name, 'pt-BR')), [base, statusF]);
  const nStatus = (s: StatusF) => base.filter((u) => s === 'todos' || u.status === s).length;
  const filtered = !!nq || !!roleF || statusF !== 'todos';

  const patch = (id: string, p: Partial<User>) => setUsers((l) => l.map((u) => (u.id === id ? { ...u, ...p } : u)));
  const saveUser = (d: UserDraft) => {
    if (wizard?.edit) {
      patch(wizard.edit.id, { name: d.name, team: d.team, role: d.role, locais: d.locais, mfa: d.mfa, status: d.active ? (wizard.edit.status === 'pendente' ? 'pendente' : 'ativo') : 'inativo' });
      toast('Usuário atualizado');
    } else {
      const u: User = { id: `n${Date.now()}`, name: d.name, email: d.email, team: d.team, role: d.role, locais: d.locais, mfa: d.mfa, status: d.access === 'convite' ? 'pendente' : 'ativo', lastSeen: null, created: Date.now() };
      setUsers((l) => [u, ...l]);
      if (d.access === 'senha') setPw({ name: d.name, email: d.email, pw: tempPassword() });
      else toast(`Convite enviado para ${d.email}`);
    }
    setWizard(null);
  };
  const saveRole = (d: RoleDraft) => {
    if (roleWiz?.edit) {
      const k = roleWiz.edit.key;
      setRoles((l) => l.map((r) => (r.key === k ? { ...r, label: d.label, description: d.description, perms: d.perms } : r)));
      toast('Papel atualizado');
    } else {
      const key = `r${Date.now()}`;
      const tones = ['teal', 'rose', 'blue', 'amber', 'violet', 'green'];
      setRoles((l) => [...l, { key, label: d.label, description: d.description, perms: d.perms, system: false, tone: tones[l.length % tones.length] }]);
      setRoleSel(key);
      toast(`Papel “${d.label}” criado`);
    }
    setRoleWiz(null);
  };

  const cur = menu ? users.find((u) => u.id === menu.id) ?? null : null;
  const cUser = confirm && confirm.kind !== 'removeRole' ? users.find((u) => u.id === confirm.id) : undefined;
  const cRole = confirm?.kind === 'removeRole' ? roleOf(confirm.id) : undefined;

  return (
    <div className="mv us">
      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="shield"
          description="Quem acessa o sistema e o que cada papel pode fazer."
          actions={tab === 'usuarios'
            ? <Button variant="primary" icon="plus" onClick={() => setWizard({})}>Novo usuário</Button>
            : <Button variant="primary" icon="plus" onClick={() => setRoleWiz({})}>Novo papel</Button>}
        />
        <div className="us-tabs">
          <Tabs<Tab> label="Seções" value={tab} onChange={setTab} options={[
            { value: 'usuarios', label: 'Usuários', icon: 'people', count: users.length },
            { value: 'papeis', label: 'Papéis e permissões', icon: 'shield', count: roles.length },
          ]} />
        </div>

        {tab === 'usuarios' ? (
          <div className="dv-body us-list">
            <div className="dv-tools">
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou equipe" aria-label="Buscar usuários"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q && <button type="button" className="dv-search__x" aria-label="Limpar" onClick={() => setQ('')}><Icon name="close" size={14} /></button>}
              </label>
              <div className="tr-sel us-sel">
                <Select<string> label="Papel" value={roleF} onChange={setRoleF} options={[
                  { value: '', label: 'Todos os papéis' },
                  ...roles.map((r) => ({ value: r.key, label: <><RoleTag role={r} plain /><span className="tr-sel__n">{users.filter((u) => u.role === r.key).length}</span></> })),
                ]} />
              </div>
              <Segmented<StatusF> label="Status" value={statusF} onChange={setStatusF} options={([
                ['todos', 'Todos'], ['ativo', 'Ativos'], ['pendente', 'Pendentes'], ['inativo', 'Inativos'],
              ] as [StatusF, string][]).map(([v, l]) => ({ value: v, label: <>{l} <span className="nx-seg__n">{nStatus(v)}</span></> }))} />
              <span className="dv-tools__sp" />
              {filtered && <button type="button" className="tr-link" onClick={() => { setQ(''); setRoleF(''); setStatusF('todos'); }}>Limpar filtros</button>}
            </div>

            <div className="dv-table us-table" role="table" aria-label="Usuários">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c" role="columnheader">Usuário</span>
                <span className="dv-c" role="columnheader">Papel</span>
                <span className="dv-c us-c-loc" role="columnheader">Locais</span>
                <span className="dv-c us-c-last" role="columnheader">Último acesso</span>
                <span className="dv-c" role="columnheader">Status</span>
                <span className="dv-c" role="columnheader"><span className="nx-sr">Ações</span></span>
              </div>
              {rows.map((u) => {
                const r = roleOf(u.role);
                return (
                  <div key={u.id} className={`dv-tr${u.status === 'inativo' ? ' is-off' : ''}`} role="row" tabIndex={0}
                    onClick={() => setWizard({ edit: u })} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setWizard({ edit: u }); }}>
                    <span className="dv-c us-c-user" role="cell">
                      <span className={`nx-avatar us-av is-${r?.tone ?? 'gray'}`}>{initials(u.name)}</span>
                      <span className="dv-two"><b>{u.name}</b><span>{u.email}</span></span>
                    </span>
                    <span className="dv-c" role="cell"><span className="dv-two">{r ? <RoleTag role={r} /> : <b>Sem papel</b>}<span>{u.team}</span></span></span>
                    <span className="dv-c us-c-loc" role="cell"><Locais locais={u.locais} /></span>
                    <span className="dv-c us-c-last" role="cell"><span className="dv-two"><b>{ago(u.lastSeen, now)}</b><span>Desde {fmtDate(u.created)}</span></span></span>
                    <span className="dv-c" role="cell"><Status s={u.status} mfa={u.mfa} /></span>
                    <span className="dv-c dv-c--act us-c-act" role="cell" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon="edit" label="Editar" onClick={() => setWizard({ edit: u })} tipPlace="top" />
                      <IconButton icon="more" label="Mais ações" onClick={(e) => setMenu(menu?.id === u.id ? null : { el: e.currentTarget, id: u.id })} tipPlace="top" />
                    </span>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="mv-empty tr-empty">
                  <Icon name="search" size={24} />
                  <b>Nenhum usuário encontrado</b>
                  <span>Revise a busca ou os filtros.</span>
                </div>
              )}
            </div>
            <p className="us-foot">{rows.length} de {users.length} usuários · Clique em uma linha para editar</p>
          </div>
        ) : (
          <RolesView roles={roles} users={users} sel={roleSel} onSel={setRoleSel}
            onNew={(baseRole) => setRoleWiz({ base: baseRole })}
            onEdit={(r) => setRoleWiz({ edit: r })}
            onRemove={(r) => setConfirm({ kind: 'removeRole', id: r.key })}
            onSeeUsers={(r) => { setRoleF(r.key); setStatusF('todos'); setQ(''); setTab('usuarios'); }} />
        )}
      </div>

      {menu && cur && (() => {
        const close = (fn: () => void) => () => { setMenu(null); fn(); };
        return (
          <Menu anchor={menu.el} onClose={() => setMenu(null)}>
            <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => setWizard({ edit: cur }))} />
            {cur.status === 'pendente'
              ? <NavItem role="menuitem" icon="replay" label="Reenviar convite" onClick={close(() => toast(`Convite reenviado para ${cur.email}`))} />
              : <NavItem role="menuitem" icon="lock" label="Gerar senha temporária" onClick={close(() => setPw({ name: cur.name, email: cur.email, pw: tempPassword() }))} />}
            {cur.status === 'inativo'
              ? <NavItem role="menuitem" icon="play" label="Reativar acesso" onClick={close(() => { patch(cur.id, { status: 'ativo' }); toast(`${cur.name} reativado`); })} />
              : <NavItem role="menuitem" icon="pause" label="Desativar acesso" onClick={close(() => setConfirm({ kind: 'deactivate', id: cur.id }))} />}
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="trash" label="Remover usuário" className="us-danger" onClick={close(() => setConfirm({ kind: 'remove', id: cur.id }))} />
          </Menu>
        );
      })()}

      {cUser && confirm?.kind === 'deactivate' && (
        <ConfirmDialog type="warning" title={`Desativar ${cUser.name}?`} confirm="Desativar acesso"
          text="A pessoa perde o acesso na hora e as sessões abertas são encerradas. O histórico e a auditoria continuam guardados, e você pode reativar depois."
          onConfirm={() => { patch(cUser.id, { status: 'inativo' }); setConfirm(null); toast(`${cUser.name} desativado`); }} onCancel={() => setConfirm(null)} />
      )}
      {cUser && confirm?.kind === 'remove' && (
        <ConfirmDialog title={`Remover ${cUser.name}?`} confirm="Remover usuário"
          text="O usuário some da lista e não consegue mais entrar. As ações já feitas continuam na auditoria. Se for só uma pausa, prefira desativar."
          onConfirm={() => { setUsers((l) => l.filter((u) => u.id !== cUser.id)); setConfirm(null); toast('Usuário removido'); }} onCancel={() => setConfirm(null)} />
      )}
      {cRole && (
        <ConfirmDialog title={`Excluir o papel “${cRole.label}”?`} confirm="Excluir papel"
          text="O papel e as permissões marcadas nele deixam de existir. Nenhum usuário usa este papel hoje."
          onConfirm={() => { setRoles((l) => l.filter((r) => r.key !== cRole.key)); setRoleSel(roles[0].key); setConfirm(null); toast('Papel excluído'); }} onCancel={() => setConfirm(null)} />
      )}

      {wizard && <UserWizard edit={wizard.edit} roles={roles} emails={users.map((u) => u.email)} onClose={() => setWizard(null)} onSave={saveUser} />}
      {roleWiz && <RoleWizard edit={roleWiz.edit} base={roleWiz.base} roles={roles} onClose={() => setRoleWiz(null)} onSave={saveRole} />}
      {pw && <PasswordModal {...pw} onClose={() => { setPw(null); toast('Usuário pronto para entrar'); }} />}
    </div>
  );
}

function Locais({ locais }: { locais: string[] }) {
  const tip = useTooltip(locais.join(', '), undefined, locais.length > 1, 'top');
  if (!locais.length) return <span className="us-loc is-all">Todos os locais</span>;
  return <span className="us-loc" {...tip}>{locais[0]}{locais.length > 1 && <em>+{locais.length - 1}</em>}</span>;
}

function Status({ s, mfa }: { s: UStatus; mfa: boolean }) {
  const tip = useTooltip('Verificação em duas etapas ativa', undefined, mfa && s === 'ativo', 'top');
  return (
    <span className={`us-st is-${s}`}>
      <i />{STATUS_LABEL[s]}
      {mfa && s === 'ativo' && <span className="us-mfa" {...tip}>2FA</span>}
    </span>
  );
}
