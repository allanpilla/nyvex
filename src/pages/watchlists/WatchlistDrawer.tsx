import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Combobox, ConfirmDialog, DateTimePicker, Icon, IconButton, Menu, NavItem, Tabs } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { copy } from '../devices/parts';
import {
  ageText, expiryText, fmtDT, isExpired, MATCH_LABEL, pending, REGISTERED, STATE_LABEL, THRESHOLDS,
  type MatchStatus, type Watchlist, type WlMatch,
} from './data';

type Tab = 'pessoas' | 'veiculos' | 'atividade' | 'sobre';
type Props = { w: Watchlist; onClose: () => void; onEdit: () => void; onToggle: () => void; onExport: () => void; onChange: (fn: (w: Watchlist) => Watchlist) => void };

/**
 * Gestão da lista (a página de detalhe do sistema atual, agora num painel flutuante):
 * Pessoas, Veículos, Atividade e Sobre (o antigo bloco “Contexto”).
 */
export function WatchlistDrawer({ w, onClose, onEdit, onToggle, onExport, onChange }: Props) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('pessoas');
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [adding, setAdding] = useState(false);
  const [remove, setRemove] = useState<{ kind: 'p' | 'v'; id: string; label: string } | null>(null);
  const [spin, setSpin] = useState(false);
  const on = w.state === 'ativa';

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-smodal, .nx-menu, .nx-sheet-back:not(.is-soft)')) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const doRemove = () => {
    if (!remove) return;
    onChange((x) => (remove.kind === 'p' ? { ...x, people: x.people.filter((p) => p.id !== remove.id) } : { ...x, vehicles: x.vehicles.filter((v) => v.id !== remove.id) }));
    toast(`${remove.label} retirad${remove.kind === 'p' ? 'a' : 'o'} da lista`);
    setRemove(null);
  };
  const review = (m: WlMatch, status: MatchStatus) => {
    onChange((x) => ({ ...x, matches: x.matches.map((y) => (y.id === m.id ? { ...y, status } : y)) }));
    toast(status === 'confirmado' ? 'Match revisado: procede' : 'Match revisado: descartado');
  };

  return (
    <aside className="dv-drawer wl-drawer" aria-label={`Lista ${w.name}`}>
      <header className="dv-drawer__head">
        <span className={`dv-kind is-lg wl-kind is-${w.state}`}><Icon name="eye" size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{w.name}</h2>
          <p>Watchlist · {STATE_LABEL[w.state]} · atualizada {ageText(w.updated)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__acts">
        <Button icon={on ? 'pause' : 'play'} variant={on ? undefined : 'primary'} onClick={onToggle}>{on ? 'Pausar lista' : 'Ativar lista'}</Button>
        <Button icon="edit" onClick={onEdit}>Editar</Button>
        <span className="dv-tools__sp" />
        <IconButton icon="refresh" label="Atualizar" className={spin ? 'is-spin' : undefined} onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }} tipPlace="bottom" />
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
      </div>

      {!on && (
        <div className="wl-note">
          <Alert type="warning" title="Lista pausada">Os vínculos permanecem cadastrados, mas não geram novos matches por esta lista.</Alert>
        </div>
      )}

      <div className="wl-kpis">
        <div><span>Pessoas</span><b>{w.people.length}</b></div>
        <div><span>Veículos</span><b>{w.vehicles.length}</b></div>
        <div><span>Matches</span><b>{w.restricted || !w.matches.length ? '—' : w.matches.length}</b>{pending(w) > 0 && <small className="wl-pend">{pending(w)} para revisar</small>}</div>
      </div>

      <Tabs label="Seções" value={tab} onChange={(t) => { setTab(t); setAdding(false); }} className="lc-tabs" options={[
        { value: 'pessoas', label: 'Pessoas', count: w.people.length },
        { value: 'veiculos', label: 'Veículos', count: w.vehicles.length },
        { value: 'atividade', label: 'Atividade', count: w.restricted ? undefined : pending(w) || undefined },
        { value: 'sobre', label: 'Sobre' },
      ]} />

      <div className="dv-drawer__body" key={tab}>
        {tab === 'pessoas' && (
          <section className="dv-sec">
            <div className="dv-sec__head">
              <h3>Pessoas monitoradas</h3>
              {!adding && <Button icon="plus" onClick={() => setAdding(true)}>Incluir pessoa</Button>}
            </div>
            <p className="dv-muted">Associações ativas ou expiradas desta lista, com motivo e limiar.</p>
            {adding && (
              <AddPerson taken={w.people.map((p) => p.name)} onCancel={() => setAdding(false)}
                onAdd={(p) => {
                  onChange((x) => ({ ...x, people: [...x.people, { ...p, id: `p-${Date.now()}`, added: new Date().toISOString() }] }));
                  setAdding(false);
                  toast(`${p.name} incluída na lista${on ? '' : ' · a lista está pausada'}`);
                }} />
            )}
            {w.people.length === 0 && !adding ? (
              <Empty icon="people" title="Nenhuma pessoa nesta lista" text="Inclua uma pessoa cadastrada para iniciar o acompanhamento." />
            ) : (
              <ul className="lc-dlist wl-mlist">
                {w.people.map((p) => {
                  const exp = isExpired(p.until);
                  return (
                    <li key={p.id} className={exp ? 'is-expired' : undefined}>
                      <span className="lc-avatar">{p.name.replace(/\[.*?\]/, '').trim().split(' ').map((s) => s[0]).slice(0, 2).join('')}</span>
                      <span className="dv-name">
                        <b>{p.name}</b>
                        <span className="wl-reason">{p.reason}</span>
                        <span className="wl-meta">Limiar {p.threshold}% · <em className={exp ? 'is-bad' : expiryText(p.until) === 'vence hoje' ? 'is-warn' : undefined}>{expiryText(p.until)}</em></span>
                      </span>
                      {exp && <Badge tone="danger">Expirada</Badge>}
                      <Button className="is-danger-ghost wl-out" onClick={() => setRemove({ kind: 'p', id: p.id, label: p.name })}>Retirar</Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === 'veiculos' && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Veículos monitorados</h3></div>
            <p className="dv-muted">Veículos canônicos vinculados a esta lista.</p>
            <Alert type="information">Para incluir, abra o cadastro do veículo e escolha “Monitorar veículo”. Esta lista não pesquisa uma frota parcial.</Alert>
            {w.vehicles.length === 0 ? (
              <Empty icon="car" title="Nenhum veículo nesta lista" text="Os veículos incluídos pelo cadastro aparecem aqui." />
            ) : (
              <ul className="lc-dlist wl-mlist">
                {w.vehicles.map((v) => {
                  const exp = isExpired(v.until);
                  const today = expiryText(v.until) === 'vence hoje';
                  return (
                    <li key={v.id} className={exp ? 'is-expired' : undefined}>
                      <span className="dv-kind wl-plateic"><Icon name="car" size={14} /></span>
                      <span className="dv-name">
                        <b><span className="wl-plate">{v.plate}</span>{v.model && <span className="wl-model">{v.model}</span>}</b>
                        <span className="wl-reason">{v.reason}</span>
                        <span className="wl-meta"><em className={exp ? 'is-bad' : today ? 'is-warn' : undefined}>{expiryText(v.until)}</em></span>
                      </span>
                      <Button className="is-danger-ghost wl-out" onClick={() => setRemove({ kind: 'v', id: v.id, label: v.plate })}>Retirar</Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button icon="external" onClick={() => toast('Cadastro de veículos · ainda não desenhado no protótipo')}>Abrir cadastro de veículos</Button>
          </section>
        )}

        {tab === 'atividade' && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Atividade vinculada</h3></div>
            <p className="dv-muted">Amostra dos últimos 100 alertas consultados, não o histórico total da lista.</p>
            {w.restricted ? (
              <Empty icon="lock" title="Atividade restrita" text="A leitura de incidentes requer permissão adicional." />
            ) : w.matches.length === 0 ? (
              <Empty icon="activity" title="Nenhum match nesta amostra" text="A ausência de alertas nesta amostra não equivale a zero histórico." />
            ) : (
              <ul className="wl-matches">
                {[...w.matches].sort((a, b) => b.at.localeCompare(a.at)).map((m) => (
                  <li key={m.id} className={`is-${m.status}`}>
                    <span className="wl-thumb" aria-hidden="true"><Icon name={m.kind === 'pessoa' ? 'faces' : 'car'} size={18} /></span>
                    <span className="dv-name">
                      <b>{m.kind === 'veiculo' ? <span className="wl-plate">{m.who}</span> : m.who}<span className="wl-score">{m.score}%</span></b>
                      <span>{m.cam} · {m.local}</span>
                      <span className="wl-meta">{fmtDT(m.at)} · {ageText(m.at)}</span>
                    </span>
                    <span className="wl-mside">
                      <span className={`wl-mst is-${m.status}`}><i />{MATCH_LABEL[m.status]}</span>
                      {m.status === 'pendente' ? (
                        <span className="wl-macts">
                          <Button onClick={() => review(m, 'descartado')}>Descartar</Button>
                          <Button variant="primary" onClick={() => review(m, 'confirmado')}>Procede</Button>
                        </span>
                      ) : (
                        <button type="button" className="dv-link" onClick={() => toast('Abrir alerta · simulado no protótipo')}>Ver alerta</button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'sobre' && (
          <>
            <section className="dv-sec">
              <div className="dv-sec__head"><h3>Sobre esta lista</h3></div>
              <p className="wl-desc">{w.description || 'Sem descrição.'}</p>
              <dl className="dv-info">
                <div className="dv-info__row"><dt>Estado</dt><dd><Badge tone={on ? 'success' : 'neutral'}>{STATE_LABEL[w.state]}</Badge></dd></div>
                <div className="dv-info__row"><dt>Justificativa</dt><dd className="wl-wrap">{w.justification}</dd></div>
                <div className="dv-info__row"><dt>Criada em</dt><dd>{fmtDT(w.created)} · {w.createdBy}</dd></div>
                <div className="dv-info__row"><dt>Atualizada em</dt><dd>{fmtDT(w.updated)}</dd></div>
                <div className="dv-info__row"><dt>ID</dt><dd><button type="button" className="dv-copyval is-mono" onClick={() => copy(w.id, toast, 'ID copiado')}><span>{w.id}</span><Icon name="copy" size={14} /></button></dd></div>
              </dl>
            </section>
            <Alert type="information" title="Leitura operacional">A ausência de alertas nesta amostra não equivale a zero histórico.</Alert>
          </>
        )}
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          <NavItem role="menuitem" icon="download" label="Exportar monitorados" onClick={() => { setMore(null); onExport(); }} />
          <NavItem role="menuitem" icon="copy" label="Copiar ID" onClick={() => { setMore(null); copy(w.id, toast, 'ID copiado'); }} />
        </Menu>
      )}

      {remove && (
        <ConfirmDialog title={`Retirar ${remove.label} da lista?`}
          text={`Novas detecções ${remove.kind === 'p' ? 'desta pessoa' : 'deste veículo'} deixam de gerar matches por “${w.name}”. Os alertas já registrados continuam no histórico.`}
          confirm="Retirar" onConfirm={doRemove} onCancel={() => setRemove(null)} />
      )}
    </aside>
  );
}

/** Formulário em linha “Incluir pessoa”, com os mesmos campos do sistema atual. */
function AddPerson({ taken, onCancel, onAdd }: { taken: string[]; onCancel: () => void; onAdd: (p: { name: string; reason: string; threshold: number; until: string | null }) => void }) {
  const [name, setName] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState(75);
  const [noExp, setNoExp] = useState(true);
  const [until, setUntil] = useState('2027-01-01T00:00');
  const [touched, setTouched] = useState(false);
  const err = { name: !name ? 'Escolha uma pessoa cadastrada' : '', reason: !reason.trim() ? 'Descreva o motivo documentado' : '' };
  const submit = () => {
    setTouched(true);
    if (err.name || err.reason) return;
    onAdd({ name: name!, reason: reason.trim(), threshold, until: noExp ? null : new Date(`${until}:00-03:00`).toISOString() });
  };
  return (
    <div className="dv-card2 wl-add">
      <h3>Incluir pessoa</h3>
      <div className={`dv-field${touched && err.name ? ' is-err' : ''}`}>
        <span className="dv-field__l">Pessoa cadastrada<i>*</i></span>
        <Combobox label="Pessoa cadastrada" value={name} placeholder="Buscar pelo nome" searchPlaceholder="Buscar pelo nome (mín. 2 caracteres)" invalid={touched && !!err.name}
          options={REGISTERED.filter((p) => !taken.includes(p)).map((p) => ({ value: p, label: p }))} onChange={setName} />
        {touched && err.name && <span className="dv-field__h">{err.name}</span>}
      </div>
      <label className={`dv-field${touched && err.reason ? ' is-err' : ''}`}>
        <span className="dv-field__l">Motivo operacional<i>*</i></span>
        <textarea className="wl-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo documentado para acompanhamento" />
        {touched && err.reason && <span className="dv-field__h">{err.reason}</span>}
      </label>
      <div className="dv-row">
        <label className="dv-field">
          <span className="dv-field__l">Similaridade mínima</span>
          <select className="nx-select lc-select" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
            {THRESHOLDS.map((t) => <option key={t} value={t}>{t}%</option>)}
          </select>
        </label>
        <div className="dv-field">
          <span className="dv-field__l">Válido até · Brasília</span>
          {noExp ? <span className="nx-input wl-noexp">Sem vencimento</span> : <DateTimePicker label="Válido até" value={until} onChange={setUntil} />}
          <Checkbox label="Sem vencimento" checked={noExp} onChange={setNoExp}><span className="wl-chk">Sem vencimento</span></Checkbox>
        </div>
      </div>
      <p className="dv-field__hint">Validade e limiar são conferidos no servidor a cada match. O resultado exige revisão humana.</p>
      <div className="wl-add__foot">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" icon="plus" onClick={submit}>Incluir pessoa</Button>
      </div>
    </div>
  );
}

function Empty({ icon, title, text }: { icon: 'people' | 'car' | 'lock' | 'activity'; title: string; text: string }) {
  return <div className="lc-empty"><span className="dv-empty__ic"><Icon name={icon} /></span><b className="wl-empty__t">{title}</b><span>{text}</span></div>;
}
