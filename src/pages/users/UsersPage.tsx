import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Checkbox, ConfirmDialog, Icon, IconButton, Menu, NavItem, PageHeader, Tabs, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { FilterToggle, SortButton } from '../devices/tableModel';
import { RolesView } from './RolesView';
import { PasswordModal, RoleForm, roleTone, UserForm, UserPanel, type UserValues } from './parts';
import { initials, ROLES, tempPassword, USERS, type Role, type User } from './data';
import '../devices/devices.css';
import '../locations/locations.css';
import '../watchlists/watchlists.css';
import './users.css';

type Tab = 'usuarios' | 'permissoes';
type FKey = 'role' | 'status';
type Filters = Record<FKey, string[]>;
const EMPTY: Filters = { role: [], status: [] };
type Quick = 'all' | 'ativo' | 'inativo' | 'super_admin' | 'admin' | 'operator';
type SortKey = 'name' | 'role' | 'status';
const SORT_OPTS: [SortKey, string][] = [['name', 'Usuário'], ['role', 'Papel'], ['status', 'Status']];

/**
 * Usuários e Permissões no padrão das outras listagens (cards de resumo, tabela em card, drawer).
 * Funções do sistema atual: criar, editar, remover usuário; matriz de papéis × permissões.
 */
/** Cor fixa por papel do sistema; papéis criados pelo cliente usam a mesma cor. */

export function UsersPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<User[]>(USERS);
  const [roles, setRoles] = useState<Role[]>(ROLES);
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [showF, setShowF] = useState(false);
  const [filterBtn, setFilterBtn] = useState<{ key: FKey; el: HTMLElement } | null>(null);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'name', dir: 1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [remove, setRemove] = useState<User | null>(null);
  const [editor, setEditor] = useState<{ id?: string; values: UserValues } | null>(null);
  const [roleEditor, setRoleEditor] = useState<{ key?: string; label: string } | null>(null);
  const [pw, setPw] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkRemove, setBulkRemove] = useState(false);
  const [roleMenu, setRoleMenu] = useState<HTMLElement | null>(null);

  const byKey = useMemo(() => Object.fromEntries(roles.map((r) => [r.key, r])), [roles]);
  const tenantRoles = roles.filter((r) => r.plane === 'tenant');
  const selUsers = users.filter((u) => sel.has(u.id));
  const nSel = (n: number) => `${n} ${n === 1 ? 'usuário' : 'usuários'}`;
  const setActive = (to: boolean) => {
    const n = selUsers.filter((u) => u.is_active !== to).length;
    setUsers((l) => l.map((u) => (sel.has(u.id) ? { ...u, is_active: to } : u)));
    toast(`${nSel(n)} ${to ? (n === 1 ? 'ativado' : 'ativados') : (n === 1 ? 'desativado' : 'desativados')}`);
  };
  const setRoleBulk = (key: string) => {
    setUsers((l) => l.map((u) => (sel.has(u.id) ? { ...u, roles: [key, ...u.roles.filter((r) => r !== key).slice(1)] } : u)));
    setRoleMenu(null);
    toast(`Papel ${byKey[key]?.label ?? key} aplicado a ${nSel(selUsers.length)}`);
  };
  const roleLabel = (k?: string) => (k ? byKey[k]?.label ?? k : '');
  const F_GROUPS: { key: FKey; label: string; opts: [string, string][] }[] = [
    { key: 'role', label: 'Papel', opts: roles.map((r) => [r.key, r.label]) },
    { key: 'status', label: 'Status', opts: [['ativo', 'Ativo'], ['inativo', 'Inativo']] },
  ];
  const fLabel = (k: FKey, v: string) => F_GROUPS.find((g) => g.key === k)!.opts.find((o) => o[0] === v)?.[1] ?? v;

  const matches = (u: User, fl: Filters) => (fl.role.length === 0 || fl.role.includes(u.roles[0]))
    && (fl.status.length === 0 || fl.status.includes(u.is_active ? 'ativo' : 'inativo'));
  const quickMatch = (k: Quick, u: User) => k === 'all' || (k === 'ativo' ? u.is_active : k === 'inativo' ? !u.is_active : u.roles[0] === k);
  const nq = norm(q.trim());
  const textMatch = (u: User) => !nq || norm(`${u.full_name} ${u.email} ${u.roles.map(roleLabel).join(' ')}`).includes(nq);
  const base = users.filter((u) => matches(u, f) && textMatch(u));
  const hits = base.filter((u) => quickMatch(quick, u));
  const rows = [...hits].sort((a, b) => {
    const r = sort.k === 'role' ? roleLabel(a.roles[0]).localeCompare(roleLabel(b.roles[0]), 'pt-BR')
      : sort.k === 'status' ? Number(b.is_active) - Number(a.is_active) : 0;
    return r * sort.dir || (a.full_name || a.email).localeCompare(b.full_name || b.email, 'pt-BR') * (sort.k === 'name' ? sort.dir : 1);
  });
  const anyFilter = Object.values(f).some((a) => a.length) || !!nq || quick !== 'all';
  const nF = F_GROUPS.filter((g) => f[g.key].length).length;
  const count = (k: Quick) => base.filter((u) => quickMatch(k, u)).length;
  const allOn = rows.length > 0 && rows.every((u) => sel.has(u.id));
  const someOn = rows.some((u) => sel.has(u.id));
  const open = openId ? users.find((u) => u.id === openId) ?? null : null;

  const toggleF = (k: FKey, v: string) => setF((o) => ({ ...o, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const clearAll = () => { setF(EMPTY); setQ(''); setQuick('all'); };
  const sortBy = (k: SortKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }));

  const newUser = () => setEditor({ values: { full_name: '', email: '', role: tenantRoles[0]?.key ?? 'operator', password: '', is_active: true } });
  const editUser = (u: User) => setEditor({ id: u.id, values: { full_name: u.full_name, email: u.email, role: u.roles[0] ?? 'operator', password: '', is_active: u.is_active } });
  const saveUser = (v: UserValues) => {
    if (editor?.id) {
      const id = editor.id;
      setUsers((l) => l.map((u) => (u.id === id ? { ...u, full_name: v.full_name, roles: [v.role, ...u.roles.filter((r) => r !== v.role).slice(1)], is_active: v.is_active } : u)));
      toast('Usuário atualizado');
    } else {
      setUsers((l) => [...l, { id: `n${Date.now()}`, full_name: v.full_name, email: v.email, roles: [v.role], is_active: true }]);
      if (!v.password) setPw(tempPassword());
      toast('Usuário criado');
    }
    setEditor(null);
  };
  const usersByRole = useMemo(() => { const m: Record<string, number> = {}; users.forEach((u) => u.roles.forEach((k) => { m[k] = (m[k] ?? 0) + 1; })); return m; }, [users]);
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

  const cards: { k: Quick; label: string; icon: IconName; tone: string; hint: string }[] = [
    { k: 'all', label: 'Usuários', icon: 'people', tone: 'neutral', hint: 'Todos os usuários com acesso' },
    { k: 'ativo', label: 'Ativos', icon: 'play', tone: 'ok', hint: 'Conseguem entrar no sistema' },
    { k: 'inativo', label: 'Inativos', icon: 'pause', tone: 'neutral', hint: 'Acesso bloqueado' },
    { k: 'super_admin', label: 'Super Admin', icon: 'shield', tone: 'neutral', hint: 'Papel da plataforma (equipe Nyvex)' },
    { k: 'admin', label: 'Administradores', icon: 'settings', tone: 'neutral', hint: 'Gestores do cliente' },
    { k: 'operator', label: 'Operadores', icon: 'tv', tone: 'neutral', hint: 'Operadores da central' },
  ];

  return (
    <div className="dv lc wl us">
      <div className="dv-main">
        <PageHeader title={screen.label} icon="shield" description="Quem acessa o sistema e o que cada papel pode fazer."
          actions={tab === 'usuarios'
            ? <Button variant="primary" icon="plus" onClick={newUser}>Novo usuário</Button>
            : <Button variant="primary" icon="plus" onClick={() => setRoleEditor({ label: '' })}>Novo papel</Button>} />

        <div className="us-tabs">
          <Tabs<Tab> label="Seções" value={tab} onChange={setTab} options={[
            { value: 'usuarios', label: 'Usuários', icon: 'people', count: users.length },
            { value: 'permissoes', label: 'Papéis & Permissões', icon: 'shield', count: roles.length },
          ]} />
        </div>

        {tab === 'usuarios' ? (
          <div className="dv-body">
            <section className="dv-sum" aria-label="Resumo">
              <div className="dv-cards" role="group" aria-label="Filtrar">
                {cards.map((c) => {
                  const n = count(c.k);
                  const on = quick === c.k;
                  return (
                    <CardBtn key={c.k} hint={c.hint} aria-pressed={on}
                      className={`dv-card is-${c.tone}${on ? ' is-on' : ''}${n === 0 && c.k !== 'all' ? ' is-zero' : ''}`}
                      onClick={() => setQuick(on || c.k === 'all' ? 'all' : c.k)}>
                      <span className="dv-card__top"><Icon name={c.icon} size={16} />{c.label}</span>
                      <b>{n}</b>
                    </CardBtn>
                  );
                })}
              </div>
            </section>

            <section className="dv-tcard is-t2" aria-label="Usuários">
              <div className="dv-tools">
                <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'usuário' : 'usuários'}</span>
                <span className="dv-tools__sp" />
                <label className="nx-input dv-search">
                  <Icon name="search" size={16} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, e-mail ou papel" aria-label="Buscar usuários"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                  {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
                </label>
                <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
                <SortButton options={SORT_OPTS} sort={sort} onChange={setSort} />
                <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }} tipPlace="bottom" />
              </div>

              {showF && <div className="dv-filters" role="group" aria-label="Filtros">
                {F_GROUPS.map((g) => (
                  <button key={g.key} type="button" className={`dv-fdrop${f[g.key].length ? ' is-on' : ''}${filterBtn?.key === g.key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={filterBtn?.key === g.key}
                    onClick={(e) => setFilterBtn(filterBtn?.key === g.key ? null : { key: g.key, el: e.currentTarget })}>
                    <span className="dv-fdrop__k">{g.label}:</span>
                    <span className="dv-fdrop__v">{f[g.key].length === 0 ? 'todos' : f[g.key].length === 1 ? fLabel(g.key, f[g.key][0]) : `${f[g.key].length} selecionados`}</span>
                    <Icon name="chevron" size={14} />
                  </button>
                ))}
              </div>}

              {anyFilter && (
                <div className="dv-chips">
                  <span className="dv-chips__n"><b>{hits.length}</b> de {users.length}</span>
                  {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                  {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                  {F_GROUPS.flatMap((g) => f[g.key].map((v) => <Chip key={g.key + v} onRemove={() => toggleF(g.key, v)}><span className="dv-chip__k">{g.label}:</span> {fLabel(g.key, v)}</Chip>))}
                  <button type="button" className="dv-chips__clear" onClick={clearAll}>Limpar filtros</button>
                </div>
              )}

              <div className="dv-table us-table" role="table" aria-label="Usuários">
                <div className="dv-tr dv-th" role="row">
                  <span className="dv-c dv-c--chk" role="columnheader">
                    <Checkbox label="Selecionar todos" checked={allOn} indeterminate={!allOn && someOn}
                      onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((u) => (allOn ? n.delete(u.id) : n.add(u.id))); return n; })} />
                  </span>
                  <Th k="name" sort={sort} onSort={sortBy} cls="dv-c--name">Usuário</Th>
                  <Th k="role" sort={sort} onSort={sortBy} cls="us-c--role">Papel</Th>
                  <Th k="status" sort={sort} onSort={sortBy} cls="us-c--st">Status</Th>
                  <span className="dv-c dv-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
                </div>
                {rows.map((u) => (
                  <div key={u.id} role="row" tabIndex={0} aria-selected={sel.has(u.id)} className={`dv-tr${sel.has(u.id) ? ' is-sel' : ''}${openId === u.id ? ' is-open' : ''}${u.is_active ? '' : ' is-inactive'}`}
                    onClick={() => setOpenId(openId === u.id ? null : u.id)}
                    onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') setOpenId(openId === u.id ? null : u.id); }}>
                    <span className="dv-c dv-c--chk" role="cell"><Checkbox label={`Selecionar ${u.full_name || u.email}`} checked={sel.has(u.id)} onChange={(v) => setSel((s) => { const n = new Set(s); if (v) n.add(u.id); else n.delete(u.id); return n; })} /></span>
                    <span className="dv-c dv-c--name" role="cell">
                      <span className={`dv-kind us-kind${byKey[u.roles[0]]?.plane === 'platform' ? ' is-platform' : ''}`}>{initials(u.full_name || u.email)}</span>
                      <span className="dv-name"><b>{u.full_name || '—'}</b><span>{u.email}</span></span>
                    </span>
                    <span className="dv-c us-c--role" role="cell">{u.roles[0] ? <span className={`nx-badge us-role is-${roleTone(u.roles[0])}`}>{roleLabel(u.roles[0])}</span> : <span className="us-none">—</span>}</span>
                    <span className="dv-c us-c--st" role="cell"><Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Ativo' : 'Inativo'}</Badge></span>
                    <span className="dv-c dv-c--act" role="cell" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon="edit" label="Editar" onClick={() => editUser(u)} tipPlace="top" />
                      <IconButton icon="more" label="Mais ações" onClick={(e) => setRowMenu(rowMenu?.id === u.id ? null : { el: e.currentTarget, id: u.id })} tipPlace="top" />
                    </span>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="dv-empty">
                    <span className="dv-empty__ic"><Icon name="search" /></span>
                    <b>{users.length ? 'Nenhum usuário encontrado' : 'Nenhum usuário ainda.'}</b>
                    {users.length > 0 && <><span>Revise a busca ou os filtros aplicados.</span><Button onClick={clearAll}>Limpar filtros</Button></>}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
        {tab === 'usuarios' && (
          <footer className="dv-foot">
            <span>{rows.length} de {users.length} usuários</span>
          </footer>
        )}
        {tab !== 'usuarios' && (
          <div className="dv-body us-mxbody">
            <RolesView roles={roles} usersByRole={usersByRole} onSave={(r, granted) => { setRoles((l) => l.map((x) => (x.key === r.key ? { ...x, granted } : x))); toast(`Permissões de ${r.label} salvas`); }}
              onNew={() => setRoleEditor({ label: '' })} onRename={(r) => setRoleEditor({ key: r.key, label: r.label })}
              onDelete={(r) => { setRoles((l) => l.filter((x) => x.key !== r.key)); toast('Papel excluído'); }} />
          </div>
        )}
        {tab === 'usuarios' && sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para os selecionados">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionado' : 'selecionados'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="shield" onClick={(e) => setRoleMenu(roleMenu ? null : e.currentTarget)}>Mudar papel</Button>
            {selUsers.some((u) => !u.is_active) && <Button icon="play" onClick={() => setActive(true)}>Ativar</Button>}
            <Button icon="pause" disabled={!selUsers.some((u) => u.is_active)} onClick={() => setActive(false)}>Desativar</Button>
            <Button icon="trash" className="is-danger-ghost" onClick={() => setBulkRemove(true)}>Remover</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(440px, 100%)' }}>
            <UserPanel key={open.id} u={open} roles={byKey} onClose={() => setOpenId(null)} onEdit={() => { editUser(open); setOpenId(null); }} />
          </div>
        </div>,
        document.body,
      )}

      {filterBtn && (() => {
        const g = F_GROUPS.find((x) => x.key === filterBtn.key)!;
        return (
          <Menu anchor={filterBtn.el} align="left" onClose={() => setFilterBtn(null)} className="dv-fmenu">
            <div className="dv-fmenu__body">
              <div className="nx-menu__title">{g.label}</div>
              {g.opts.map(([v, lb]) => (
                <Checkbox key={v} label={lb} checked={f[g.key].includes(v)} onChange={() => toggleF(g.key, v)}>
                  <span className="dv-fmenu__l">{lb}</span>
                  <span className="dv-fmenu__n">{users.filter((u) => textMatch(u) && matches(u, { ...f, [g.key]: [v] })).length}</span>
                </Checkbox>
              ))}
            </div>
            <div className="dv-fmenu__foot">
              <Button disabled={!f[g.key].length} onClick={() => setF((o) => ({ ...o, [g.key]: [] }))}>Limpar</Button>
              <Button variant="primary" onClick={() => setFilterBtn(null)}>Ver {hits.length}</Button>
            </div>
          </Menu>
        );
      })()}

      {roleMenu && sel.size > 0 && (
        <Menu anchor={roleMenu} onClose={() => setRoleMenu(null)}>
          <div className="nx-menu__title">Mudar papel de {nSel(sel.size)}</div>
          {tenantRoles.map((r) => (
            <NavItem key={r.key} role="menuitem" icon={selUsers.every((u) => u.roles[0] === r.key) ? 'check' : 'shield'} label={r.label} onClick={() => setRoleBulk(r.key)} />
          ))}
        </Menu>
      )}

      {rowMenu && (() => {
        const u = users.find((x) => x.id === rowMenu.id)!;
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="panel" label="Abrir usuário" onClick={close(() => setOpenId(u.id))} />
            <NavItem role="menuitem" icon="edit" label="Editar" onClick={close(() => editUser(u))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="trash" label="Remover" className="us-danger" onClick={close(() => setRemove(u))} />
          </Menu>
        );
      })()}

      {remove && (
        <ConfirmDialog title={`Remover ${remove.full_name || remove.email}?`} confirm="Remover"
          text="O usuário perde o acesso ao sistema."
          onConfirm={() => { setUsers((l) => l.filter((x) => x.id !== remove.id)); if (openId === remove.id) setOpenId(null); setRemove(null); toast('Usuário removido'); }}
          onCancel={() => setRemove(null)} />
      )}
      {bulkRemove && (
        <ConfirmDialog title={`Remover ${sel.size} ${sel.size === 1 ? 'usuário' : 'usuários'}?`} confirm="Remover"
          text="Os usuários selecionados perdem o acesso ao sistema."
          onConfirm={() => { setUsers((l) => l.filter((x) => !sel.has(x.id))); toast(`${sel.size} ${sel.size === 1 ? 'usuário removido' : 'usuários removidos'}`); setSel(new Set()); setBulkRemove(false); }}
          onCancel={() => setBulkRemove(false)} />
      )}
      {editor && <UserForm id={editor.id} initial={editor.values} roles={tenantRoles} rolesByKey={byKey} onClose={() => setEditor(null)} onSave={saveUser} />}
      {roleEditor && <RoleForm role={roleEditor} onClose={() => setRoleEditor(null)} onSave={saveRole} />}
      {pw && <PasswordModal pw={pw} onClose={() => setPw(null)} />}
    </div>
  );
}

function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}
function Th({ k, sort, onSort, cls, children }: { k: SortKey; sort: { k: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; cls: string; children: ReactNode }) {
  const on = sort.k === k;
  return (
    <span className={`dv-c ${cls}`} role="columnheader" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`dv-sort${on ? ' is-on' : ''}`} onClick={() => onSort(k)}>
        {children}<Icon name={on ? 'chevron' : 'sort'} size={14} className={on ? (sort.dir === 1 ? 'is-asc' : 'is-desc') : undefined} />
      </button>
    </span>
  );
}
function CardBtn({ hint, ...rest }: { hint: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = useTooltip(hint, undefined, true, 'bottom');
  return <button type="button" {...tip} {...rest} />;
}
