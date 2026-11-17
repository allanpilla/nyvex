import { Fragment, useState } from 'react';
import { Icon, IconButton } from '../../ds/components';
import { CATALOG, TOTAL, type Role } from './data';

type Props = { roles: Role[]; onToggle: (r: Role, key: string) => void; onRename: (r: Role) => void; onDelete: (r: Role) => void };

/** Matriz papéis × permissões. Papéis do sistema são fixos; nos papéis do cliente, clique na célula para conceder. */
export function RolesMatrix({ roles, onToggle, onRename, onDelete }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const sets = roles.map((r) => new Set(r.granted));
  const askDelete = (k: string) => { setConfirm(k); setTimeout(() => setConfirm((c) => (c === k ? null : c)), 3000); };

  return (
    <div className="dv-tcard is-t2 us-mx">
      <p className="us-intro">
        <Icon name="infoFill" size={14} />
        <span>{TOTAL} permissões que o sistema controla. Papéis <b>do sistema</b> são fixos; nos <b className="is-blue">seus papéis</b> clique nas células para conceder. Atribua o papel a um usuário na aba Usuários.</span>
      </p>
      <div className="us-mx__scroll">
        <table className="us-mx__t">
          <thead>
            <tr>
              <th className="us-mx__p">Permissão</th>
              {roles.map((r) => (
                <th key={r.key} className="us-mx__r">
                  <span className="us-mx__rn">
                    <Icon name={r.is_system ? 'lock' : 'wrench'} size={12} className={r.is_system ? undefined : 'is-blue'} />
                    <span title={r.label}>{r.label}</span>
                  </span>
                  {r.is_system ? <span className="us-mx__sys">Sistema</span> : (
                    <span className="us-mx__acts">
                      <IconButton icon="edit" label="Renomear" onClick={() => onRename(r)} tipPlace="bottom" />
                      {confirm === r.key
                        ? <button type="button" className="us-mx__ok" onClick={() => { setConfirm(null); onDelete(r); }}>ok?</button>
                        : <IconButton icon="trash" label="Excluir" onClick={() => askDelete(r.key)} tipPlace="bottom" />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATALOG.map((m) => (
              <Fragment key={m.label}>
                <tr className="us-mx__mod"><td colSpan={roles.length + 1}>{m.label}</td></tr>
                {m.resources.map((res) => res.permissions.map(([key, label], i) => (
                  <tr key={key}>
                    <td className="us-mx__p">
                      {i === 0 ? <span className="us-mx__res">{res.label} · </span> : <span className="us-mx__dot">· </span>}
                      <span>{label}</span>
                      <code>{key}</code>
                    </td>
                    {roles.map((r, ri) => {
                      const on = sets[ri].has(key);
                      return (
                        <td key={r.key} className="us-mx__c">
                          {r.is_system
                            ? (on ? <Icon name="check" size={14} className="us-mx__yes" /> : <span className="us-mx__no">·</span>)
                            : <button type="button" className={`us-mx__cell${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={`${on ? 'Revogar' : 'Conceder'} ${key} para ${r.label}`} onClick={() => onToggle(r, key)}><Icon name="check" size={12} /></button>}
                        </td>
                      );
                    })}
                  </tr>
                )))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
