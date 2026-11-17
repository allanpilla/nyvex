import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Checkbox, ConfirmDialog, Icon, Segmented } from '../../ds/components';
import { CATALOG, TOTAL, type Module, type Role } from './data';

type Props = {
  roles: Role[];
  usersByRole: Record<string, number>;
  onToggle: (r: Role, key: string) => void;
  onSetMany: (r: Role, keys: string[], on: boolean) => void;
  onNew: () => void;
  onRename: (r: Role) => void;
  onDelete: (r: Role) => void;
};

type Mode = 'role' | 'compare';
type Show = 'all' | 'on';

const keysOf = (m: Module) => m.resources.flatMap((r) => r.permissions.map((p) => p[0]));
const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Papéis & Permissões em dois níveis: escolha o papel à esquerda e veja o que ele pode fazer, módulo a módulo,
 * com cada recurso numa linha e as ações como chips. "Comparar papéis" mostra módulos × papéis lado a lado.
 */
export function RolesView({ roles, usersByRole, onToggle, onSetMany, onNew, onRename, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>('role');
  const [selKey, setSelKey] = useState(roles[1]?.key ?? roles[0]?.key);
  const [open, setOpen] = useState<Set<string>>(() => new Set([CATALOG[0].label]));
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [del, setDel] = useState<Role | null>(null);

  // papel recém-criado já abre selecionado
  const prevLen = useRef(roles.length);
  useEffect(() => {
    if (roles.length > prevLen.current) { setSelKey(roles[roles.length - 1].key); setMode('role'); setOpen(new Set(CATALOG.map((m) => m.label))); }
    prevLen.current = roles.length;
  }, [roles]);

  const role = roles.find((r) => r.key === selKey) ?? roles[0];
  const sets = useMemo(() => Object.fromEntries(roles.map((r) => [r.key, new Set(r.granted)])), [roles]);
  const system = roles.filter((r) => r.is_system);
  const custom = roles.filter((r) => !r.is_system);

  const pick = (k: string, mod?: string) => {
    setSelKey(k); setMode('role');
    if (mod) setOpen(new Set([mod]));
  };
  const toggleMod = (label: string) => setOpen((s) => { const n = new Set(s); if (n.has(label)) n.delete(label); else n.add(label); return n; });

  const item = (r: Role) => {
    const n = r.granted.length;
    const u = usersByRole[r.key] ?? 0;
    return (
      <button key={r.key} type="button" className={`us-rl__item${r.key === role?.key ? ' is-sel' : ''}`} aria-current={r.key === role?.key} onClick={() => pick(r.key)}>
        <span className={`us-rl__ic${r.is_system ? '' : ' is-custom'}`}><Icon name={r.is_system ? 'lock' : 'shield'} size={14} /></span>
        <span className="us-rl__txt">
          <b>{r.label}</b>
          <span>{u} {u === 1 ? 'usuário' : 'usuários'}{r.plane === 'platform' ? ' · Plataforma' : ''}</span>
        </span>
        <span className="us-rl__n"><b>{n}</b>/{TOTAL}</span>
        <span className="us-bar us-rl__bar"><i style={{ width: `${pct(n, TOTAL)}%` }} /></span>
      </button>
    );
  };

  return (
    <div className="us-rv">
      <div className="us-rv__bar">
        <Segmented<Mode> label="Visualização" value={mode} onChange={setMode}
          options={[{ value: 'role', label: <><Icon name="panel" size={14} /> Por papel</> }, { value: 'compare', label: <><Icon name="grid" size={14} /> Comparar papéis</> }]} />
        <span className="us-rv__hint">{TOTAL} permissões em {CATALOG.length} módulos</span>
      </div>

      {mode === 'compare' ? (
        <Compare roles={roles} sets={sets} usersByRole={usersByRole} onPick={pick} />
      ) : role && (
        <div className="us-rv__split">
          <aside className="dv-tcard is-t2 us-rl" aria-label="Papéis">
            <div className="us-rl__grp">
              <span className="us-rl__h"><Icon name="lock" size={12} /> Do sistema <i>fixos</i></span>
              {system.map(item)}
            </div>
            <div className="us-rl__grp">
              <span className="us-rl__h"><Icon name="shield" size={12} /> Personalizados <i>editáveis</i></span>
              {custom.map(item)}
              <button type="button" className="us-rl__new" onClick={onNew}><Icon name="plus" size={14} /> Novo papel</button>
            </div>
          </aside>

          <section className="dv-tcard is-t2 us-rd" aria-label={`Permissões de ${role.label}`}>
            <RoleDetail role={role} set={sets[role.key]} users={usersByRole[role.key] ?? 0} open={open} q={q} show={show}
              setQ={setQ} setShow={setShow} toggleMod={toggleMod} setOpen={setOpen}
              onToggle={onToggle} onSetMany={onSetMany} onRename={onRename} onDelete={() => setDel(role)} />
          </section>
        </div>
      )}

      {del && (
        <ConfirmDialog title={`Excluir o papel ${del.label}?`} confirm="Excluir"
          text={(usersByRole[del.key] ?? 0) > 0 ? `${usersByRole[del.key]} ${usersByRole[del.key] === 1 ? 'usuário perde' : 'usuários perdem'} as permissões deste papel.` : 'Nenhum usuário usa este papel.'}
          onConfirm={() => { onDelete(del); setDel(null); setSelKey(roles[1]?.key ?? roles[0]?.key); }} onCancel={() => setDel(null)} />
      )}
    </div>
  );
}

type DetailProps = {
  role: Role; set: Set<string>; users: number; open: Set<string>; q: string; show: Show;
  setQ: (v: string) => void; setShow: (v: Show) => void; toggleMod: (l: string) => void; setOpen: (s: Set<string>) => void;
  onToggle: Props['onToggle']; onSetMany: Props['onSetMany']; onRename: Props['onRename']; onDelete: () => void;
};

function RoleDetail({ role, set, users, open, q, show, setQ, setShow, toggleMod, setOpen, onToggle, onSetMany, onRename, onDelete }: DetailProps) {
  const edit = !role.is_system;
  const n = role.granted.length;
  const term = fold(q.trim());
  const searching = term.length > 0;

  // módulos → recursos → ações, já filtrados pela busca e por "só concedidas"
  const mods = CATALOG.map((m) => ({
    m,
    keys: keysOf(m),
    res: m.resources
      .map((r) => ({ ...r, permissions: r.permissions.filter((p) => (show === 'all' || set.has(p[0])) && (!searching || fold(`${m.label} ${r.label} ${p[1]} ${p[0]}`).includes(term))) }))
      .filter((r) => r.permissions.length),
  })).filter((x) => x.res.length);
  const allOpen = mods.every((x) => open.has(x.m.label));

  return (
    <>
      <header className="us-rd__head">
        <span className={`us-rd__ic${edit ? ' is-custom' : ''}`}><Icon name={edit ? 'shield' : 'lock'} size={18} /></span>
        <div className="us-rd__title">
          <h2>{role.label} <Badge tone={edit ? 'info' : 'neutral'}>{edit ? 'Personalizado' : 'Do sistema'}</Badge></h2>
          <p>{users} {users === 1 ? 'usuário' : 'usuários'} com este papel · {role.plane === 'platform' ? 'Plataforma (equipe Nyvex)' : 'Cliente'}</p>
        </div>
        {edit && (
          <div className="us-rd__acts">
            <Button icon="edit" onClick={() => onRename(role)}>Renomear</Button>
            <Button icon="trash" className="is-danger-ghost" onClick={onDelete}>Excluir</Button>
          </div>
        )}
      </header>

      <div className="us-rd__sum">
        <div className="us-rd__big"><b>{n}</b><span>de {TOTAL} permissões</span></div>
        <span className="us-bar us-bar--lg"><i style={{ width: `${pct(n, TOTAL)}%` }} /></span>
        <p className="us-rd__note">
          <Icon name={edit ? 'infoFill' : 'lock'} size={14} />
          {edit ? 'Clique numa ação para conceder ou revogar. Use a caixa do módulo para marcar todas de uma vez.' : 'Papel do sistema: as permissões são fixas. Para outro conjunto, crie um papel personalizado.'}
        </p>
      </div>

      <div className="dv-tools us-rd__tools">
        <label className="nx-input dv-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar permissão, recurso ou chave" aria-label="Buscar permissões"
            onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
          {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
        </label>
        <Segmented<Show> size="sm" label="Mostrar" value={show} onChange={setShow} options={[{ value: 'all', label: 'Todas' }, { value: 'on', label: 'Só concedidas' }]} />
        <span className="dv-tools__sp" />
        <Button icon={allOpen ? 'collapse' : 'expand'} onClick={() => setOpen(allOpen ? new Set() : new Set(CATALOG.map((m) => m.label)))}>{allOpen ? 'Recolher' : 'Expandir'} tudo</Button>
      </div>

      <div className="us-rd__body">
        {mods.length === 0 && (
          <div className="dv-empty">
            <span className="dv-empty__ic"><Icon name="search" /></span>
            <b>{show === 'on' && !searching ? 'Este papel ainda não tem permissões' : 'Nenhuma permissão encontrada'}</b>
            <span>{show === 'on' && !searching ? (edit ? 'Mostre todas e clique nas ações para conceder.' : '') : 'Revise a busca.'}</span>
          </div>
        )}
        {mods.map(({ m, keys, res }) => {
          const on = keys.filter((k) => set.has(k)).length;
          const isOpen = searching || open.has(m.label);
          return (
            <section key={m.label} className={`us-mod${isOpen ? ' is-open' : ''}`}>
              <div className="us-mod__head">
                <button type="button" className="us-mod__tg" aria-expanded={isOpen} onClick={() => toggleMod(m.label)}>
                  <Icon name="chevron" size={14} className="us-mod__chev" />
                  <b>{m.label}</b>
                  <span className="us-mod__n">{on} de {keys.length}</span>
                  <span className="us-bar us-mod__bar"><i style={{ width: `${pct(on, keys.length)}%` }} /></span>
                </button>
                {edit && (
                  <Checkbox checked={on === keys.length} indeterminate={on > 0 && on < keys.length} label={`Conceder todas de ${m.label}`}
                    onChange={() => onSetMany(role, keys, on < keys.length)}>
                    <span className="us-mod__all">Todas</span>
                  </Checkbox>
                )}
              </div>
              {isOpen && (
                <ul className="us-res">
                  {res.map((r) => (
                    <li key={r.label}>
                      <span className="us-res__l">{r.label}</span>
                      <span className="us-res__acts">
                        {r.permissions.map(([key, label]) => {
                          const g = set.has(key);
                          return edit ? (
                            <button key={key} type="button" className={`us-chip${g ? ' is-on' : ''}`} aria-pressed={g} title={key}
                              aria-label={`${g ? 'Revogar' : 'Conceder'} ${r.label}: ${label}`} onClick={() => onToggle(role, key)}>
                              <Icon name={g ? 'check' : 'plus'} size={12} />{label}
                            </button>
                          ) : (
                            <span key={key} className={`us-chip is-ro${g ? ' is-on' : ''}`} title={key}>
                              {g ? <Icon name="check" size={12} /> : <Icon name="close" size={12} />}{label}
                            </span>
                          );
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Módulos × papéis: quanto de cada módulo cada papel tem. Clique numa célula para abrir o papel naquele módulo. */
function Compare({ roles, sets, usersByRole, onPick }: { roles: Role[]; sets: Record<string, Set<string>>; usersByRole: Record<string, number>; onPick: (k: string, mod?: string) => void }) {
  const cell = (r: Role, keys: string[], mod?: string) => {
    const on = keys.filter((k) => sets[r.key].has(k)).length;
    const p = pct(on, keys.length);
    return (
      <td key={r.key} className="us-cmp__c">
        <button type="button" className={`us-cmp__b${on === 0 ? ' is-zero' : p === 100 ? ' is-full' : ''}`} onClick={() => onPick(r.key, mod)}
          title={`${r.label}${mod ? ` · ${mod}` : ''}: ${on} de ${keys.length}`}>
          <span className="us-cmp__v">{on === 0 ? '—' : p === 100 ? 'Tudo' : `${on}/${keys.length}`}</span>
          <span className="us-bar"><i style={{ width: `${p}%` }} /></span>
        </button>
      </td>
    );
  };
  const all = CATALOG.flatMap(keysOf);
  return (
    <div className="dv-tcard is-t2 us-cmp">
      <div className="us-cmp__scroll">
        <table className="us-cmp__t">
          <thead>
            <tr>
              <th className="us-cmp__m">Módulo</th>
              {roles.map((r) => (
                <th key={r.key}>
                  <button type="button" className="us-cmp__rh" onClick={() => onPick(r.key)}>
                    <Icon name={r.is_system ? 'lock' : 'shield'} size={12} />
                    <b>{r.label}</b>
                  </button>
                  <span className="us-cmp__ru">{usersByRole[r.key] ?? 0} {(usersByRole[r.key] ?? 0) === 1 ? 'usuário' : 'usuários'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="us-cmp__tot">
              <td className="us-cmp__m"><b>Total</b><span>{TOTAL} permissões</span></td>
              {roles.map((r) => cell(r, all))}
            </tr>
            {CATALOG.map((m) => {
              const keys = keysOf(m);
              return (
                <tr key={m.label}>
                  <td className="us-cmp__m"><b>{m.label}</b><span>{keys.length} permissões</span></td>
                  {roles.map((r) => cell(r, keys, m.label))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
