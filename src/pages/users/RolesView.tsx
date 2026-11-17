import { useState } from 'react';
import { Button, Icon, IconButton, Segmented, useTooltip } from '../../ds/components';
import { permCount, RoleTag } from './parts';
import { MODULES, type Role, type User } from './data';

type View = 'papel' | 'comparar';
type Props = {
  roles: Role[]; users: User[]; sel: string; onSel: (k: string) => void;
  onNew: (base?: Role) => void; onEdit: (r: Role) => void; onRemove: (r: Role) => void; onSeeUsers: (r: Role) => void;
};

/** Papéis à esquerda e o que o papel escolhido libera à direita. “Comparar” mostra a matriz papéis × permissões. */
export function RolesView({ roles, users, sel, onSel, onNew, onEdit, onRemove, onSeeUsers }: Props) {
  const [view, setView] = useState<View>('papel');
  const role = roles.find((r) => r.key === sel) ?? roles[0];
  const nUsers = (r: Role) => users.filter((u) => u.role === r.key).length;
  const groups: [string, Role[]][] = [['Do sistema', roles.filter((r) => r.system)], ['Personalizados', roles.filter((r) => !r.system)]];

  return (
    <div className="dv-body us-rbody">
      <div className="dv-tools">
        <Segmented<View> label="Visualização" value={view} onChange={setView} options={[{ value: 'papel', label: 'Por papel' }, { value: 'comparar', label: 'Comparar papéis' }]} />
        <span className="dv-tools__sp" />
        <span className="tr-list__note"><Icon name="lock" size={14} />Papéis do sistema são fixos. Duplique um para personalizar.</span>
      </div>

      {view === 'papel' ? (
        <div className="us-split">
          <nav className="us-rlist" aria-label="Papéis">
            {groups.map(([title, list]) => (
              <div key={title} className="us-rlist__g">
                <span className="tr-eyebrow">{title}</span>
                {list.map((r) => (
                  <button key={r.key} type="button" className={`us-ritem${r.key === role.key ? ' is-on' : ''}`} aria-current={r.key === role.key} onClick={() => onSel(r.key)}>
                    <RoleTag role={r} plain />
                    <span className="us-ritem__m">{nUsers(r)} {nUsers(r) === 1 ? 'usuário' : 'usuários'} · {r.perms.length} permissões</span>
                  </button>
                ))}
                {title === 'Personalizados' && (
                  <button type="button" className="us-ritem is-add" onClick={() => onNew()}><Icon name="plus" size={14} />Novo papel</button>
                )}
              </div>
            ))}
          </nav>

          <section className="us-rdet" key={role.key} aria-label={`Papel ${role.label}`}>
            <header className="us-rdet__head">
              <div className="us-rdet__t">
                <h2><RoleTag role={role} plain />{role.system ? <em>Sistema</em> : <em className="is-custom">Personalizado</em>}</h2>
                <p>{role.description}</p>
                <div className="us-rdet__meta">
                  <button type="button" className="tr-link" onClick={() => onSeeUsers(role)}><Icon name="people" size={13} />{nUsers(role)} {nUsers(role) === 1 ? 'usuário' : 'usuários'}</button>
                  <span>·</span>
                  <span>{permCount(role.perms)}</span>
                </div>
              </div>
              <div className="us-rdet__act">
                <Button icon="copy" onClick={() => onNew(role)}>Duplicar</Button>
                {!role.system && <Button icon="edit" onClick={() => onEdit(role)}>Editar</Button>}
                {!role.system && <RemoveBtn n={nUsers(role)} onClick={() => onRemove(role)} />}
              </div>
            </header>
            <div className="us-perms">
              {MODULES.map((m) => {
                const n = m.perms.filter((p) => role.perms.includes(p.key)).length;
                return (
                  <section key={m.id} className="us-pmod">
                    <h3><Icon name={m.icon} size={16} />{m.label}<span>{n} de {m.perms.length}</span></h3>
                    <ul>
                      {m.perms.map((p) => {
                        const on = role.perms.includes(p.key);
                        return (
                          <li key={p.key} className={on ? 'is-on' : undefined}>
                            <span className="us-pmark">{on ? <Icon name="check" size={12} /> : <i />}</span>
                            <span className="us-pl"><b>{p.label}{p.sensitive && <span className="tr-badge">sensível</span>}</b><em>{p.hint}</em></span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="us-matrix" role="table" aria-label="Papéis e permissões">
          <div className="us-mx-row us-mx-head" role="row" style={{ '--n': roles.length } as React.CSSProperties}>
            <span role="columnheader">Permissão</span>
            {roles.map((r) => (
              <button key={r.key} type="button" role="columnheader" className="us-mx-col" onClick={() => { onSel(r.key); setView('papel'); }}>
                <RoleTag role={r} plain /><em>{r.perms.length}</em>
              </button>
            ))}
          </div>
          {MODULES.map((m) => (
            <div key={m.id} role="rowgroup">
              <div className="us-mx-mod"><Icon name={m.icon} size={14} />{m.label}</div>
              {m.perms.map((p) => (
                <div key={p.key} className="us-mx-row" role="row" style={{ '--n': roles.length } as React.CSSProperties}>
                  <span role="rowheader" className="us-mx-p"><b>{p.label}</b>{p.sensitive && <span className="tr-badge">sensível</span>}</span>
                  {roles.map((r) => (
                    <span key={r.key} role="cell" className="us-mx-c">
                      {r.perms.includes(p.key) ? <span className={`us-mx-on is-${r.tone}`}><Icon name="check" size={12} /></span> : <i className="us-mx-off" aria-label="Não" />}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemoveBtn({ n, onClick }: { n: number; onClick: () => void }) {
  const tip = useTooltip(`Mova ${n === 1 ? 'o usuário' : `os ${n} usuários`} para outro papel antes de excluir`, undefined, n > 0, 'bottom');
  if (!n) return <IconButton icon="trash" label="Excluir papel" onClick={onClick} tipPlace="bottom" />;
  return <span className="us-dis" {...tip}><IconButton icon="trash" label="Excluir papel" disabled tipPlace="bottom" /></span>;
}
