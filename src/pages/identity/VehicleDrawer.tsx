import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Combobox, Icon, IconButton, Select, Sheet, Tabs } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { copy, norm } from '../devices/parts';
import {
  ageText, alarms24, camLabel, camShort, D, fmtDay, fmtDT, fmtTime, H, NOW, V_STATUS, V_TYPES, vDesc, vRisk, RISK_LABEL,
  type Person, type Vehicle, type VType,
} from './data';
import { PersonPic, Plate, PStatusDot, VStatusDot } from './parts';
import { RouteMap } from './RouteMap';

type Tab = 'resumo' | 'passagens' | 'rota';
type Props = { v: Vehicle; people: Person[]; tab?: Tab; onClose: () => void; onEdit: () => void; onMonitor: () => void };

/** Painel do veículo: resumo, passagens pelas câmeras de placa e rota do dia. */
export function VehicleDrawer({ v, people, tab: tab0 = 'resumo', onClose, onEdit, onMonitor }: Props) {
  const { toast } = useUi();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>(tab0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-smodal, .nx-menu, .nx-sheet-back:not(.is-soft)')) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const owner = v.owner ? people.find((p) => p.id === v.owner) : undefined;
  const p30 = v.passes.filter((x) => NOW - x.at < 30 * D);
  const last = v.passes[0];
  const risk = vRisk(v);

  return (
    <aside className="dv-drawer id-drawer" aria-label={`Veículo ${v.plate}`}>
      <header className="dv-drawer__head">
        <span className="dv-kind is-lg"><Icon name="car" size={20} /></span>
        <div className="dv-drawer__title">
          <h2><Plate>{v.plate}</Plate></h2>
          <p>{vDesc(v)} · {V_STATUS[v.status]}</p>
        </div>
        <IconButton icon="copy" label="Copiar placa" onClick={() => copy(v.plate, toast, 'Placa copiada')} tipPlace="bottom" />
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <Tabs label="Seções" value={tab} onChange={setTab} className="lc-tabs" options={[
        { value: 'resumo', label: 'Resumo' },
        { value: 'passagens', label: 'Passagens', count: v.passes.length },
        { value: 'rota', label: 'Rota' },
      ]} />

      <div className="dv-drawer__body" key={tab}>
        {tab === 'resumo' && (
          <>
            {v.status === 'bloqueado' && <Alert type="error" title="Veículo bloqueado">{v.interestReason ?? 'Entrada negada nas cancelas.'}</Alert>}
            {v.status !== 'bloqueado' && v.interest && <Alert type="warning" title="Veículo de interesse">{v.interestReason ?? 'Passagens geram alerta para a central.'}</Alert>}
            <div className="dv-stats">
              <div><span>Risco</span><b className={`id-statrisk is-${risk}`}>{RISK_LABEL[risk]}</b></div>
              <div><span>Passagens · 30 dias</span><b>{p30.length}</b></div>
              <div><span>Alarmes · 24 h</span><b className={alarms24(v) ? 'id-statrisk is-medio' : undefined}>{alarms24(v)}</b></div>
            </div>

            <section className="dv-sec">
              <div className="dv-sec__head"><h3>Pessoa vinculada</h3></div>
              {owner ? (
                <button type="button" className="id-owner" onClick={() => nav(`/pessoas?id=${owner.id}`)}>
                  <PersonPic p={owner} size={32} />
                  <span className="dv-name"><b>{owner.name}</b><span className="id-sub"><PStatusDot s={owner.status} />{v.fleet ? <span>{v.fleet}</span> : <span>Proprietário</span>}</span></span>
                  <Icon name="arrowRight" size={14} />
                </button>
              ) : <p className="dv-muted">{v.fleet ? `${v.fleet} · sem pessoa vinculada.` : 'Nenhuma pessoa vinculada. Vincule pelo cadastro do veículo.'}</p>}
            </section>

            <section className="dv-sec">
              <div className="dv-sec__head"><h3>Último avistamento</h3>{last && <button type="button" className="dv-link" onClick={() => setTab('rota')}>Ver rota</button>}</div>
              {last ? (
                <div className="id-lastpass">
                  <Icon name="camera" size={16} />
                  <span className="dv-two"><b>{camLabel(last.camId)}</b><span>{fmtDT(last.at)} · {ageText(last.at)} · leitura {last.conf}%</span></span>
                </div>
              ) : <p className="dv-muted">Nenhum avistamento registrado.</p>}
            </section>

            <section className="dv-sec">
              <div className="dv-sec__head"><h3>Cadastro</h3><button type="button" className="dv-link" onClick={onEdit}>Editar</button></div>
              <dl className="dv-info">
                <div className="dv-info__row"><dt>Status</dt><dd><VStatusDot s={v.status} /></dd></div>
                <div className="dv-info__row"><dt>Tipo</dt><dd>{v.type ?? <span className="lc-none">Não especificado</span>}</dd></div>
                <div className="dv-info__row"><dt>Marca e modelo</dt><dd>{v.brand ? `${v.brand} ${v.model}` : <span className="lc-none">Não especificado</span>}</dd></div>
                <div className="dv-info__row"><dt>Cor</dt><dd>{v.color || <span className="lc-none">—</span>}</dd></div>
                <div className="dv-info__row"><dt>Ano</dt><dd>{v.year ?? <span className="lc-none">—</span>}</dd></div>
                {v.fleet && <div className="dv-info__row"><dt>Frota</dt><dd>{v.fleet}</dd></div>}
                <div className="dv-info__row"><dt>Origem</dt><dd>{v.source === 'LPR' ? 'Criado pela leitura de placa' : 'Cadastro manual'} · {fmtDay(v.created)}</dd></div>
                <div className="dv-info__row"><dt>Inteligência</dt><dd>{v.intel ? `${v.intel} ${v.intel === 1 ? 'registro cita' : 'registros citam'} a placa` : <span className="lc-none">Sem sinais</span>}</dd></div>
              </dl>
            </section>
          </>
        )}

        {tab === 'passagens' && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Passagens pelas câmeras de placa</h3><span className="dv-muted">{v.passes.length} no histórico</span></div>
            {v.passes.length ? (
              <ul className="lc-dlist id-passes">
                {v.passes.slice(0, 40).map((x, i) => (
                  <li key={i}>
                    <span className="dv-kind"><Icon name="camera" size={14} /></span>
                    <span className="dv-name"><b>{camLabel(x.camId)}</b><span>{fmtDT(x.at)} · leitura {x.conf}%</span></span>
                    {x.dir && <span className="id-dir">{x.dir === 'entrada' ? 'Entrada' : 'Saída'}</span>}
                  </li>
                ))}
              </ul>
            ) : <div className="lc-empty"><span className="dv-empty__ic"><Icon name="camera" /></span><b className="wl-empty__t">Sem passagens</b><span>A placa ainda não foi lida por nenhuma câmera.</span></div>}
          </section>
        )}

        {tab === 'rota' && <VehicleRoute v={v} />}
      </div>

      <footer className="dv-drawer__foot id-dfoot">
        <Button variant={v.interest ? undefined : 'primary'} icon="eye" onClick={onMonitor}>{v.interest ? 'Deixar de monitorar' : 'Monitorar veículo'}</Button>
        <Button icon="edit" onClick={onEdit}>Editar</Button>
      </footer>
    </aside>
  );
}

function VehicleRoute({ v }: { v: Vehicle }) {
  const days = useMemo(() => [...new Set(v.passes.map((s) => Math.floor((s.at - 3 * H) / D)))].sort((a, b) => b - a), [v]);
  const [di, setDi] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const dayKey = days[Math.min(di, days.length - 1)];
  const stops = useMemo(() => v.passes.filter((s) => Math.floor((s.at - 3 * H) / D) === dayKey).sort((a, b) => a.at - b.at), [v, dayKey]);
  if (!days.length) return <div className="lc-empty"><span className="dv-empty__ic"><Icon name="map" /></span><b className="wl-empty__t">Sem rota</b><span>Sem passagens registradas para montar o trajeto.</span></div>;
  return (
    <section className="dv-sec">
      <div className="dv-sec__head">
        <h3>Rota do dia</h3>
        <span className="idp-daynav">
          <IconButton icon="arrowLeft" label="Dia anterior" disabled={di >= days.length - 1} onClick={() => { setDi(di + 1); setActive(null); }} tipPlace="top" />
          <b>{new Date(dayKey * D + 15 * H).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
          <IconButton icon="arrowRight" label="Dia seguinte" disabled={di === 0} onClick={() => { setDi(di - 1); setActive(null); }} tipPlace="top" />
        </span>
      </div>
      <div className="id-vroute"><RouteMap stops={stops.map((s) => ({ camId: s.camId, label: camLabel(s.camId), time: fmtTime(s.at) }))} active={active} onPick={setActive} /></div>
      <ol className="idp-seq">
        {stops.map((s, i) => (
          <li key={i} className={active === i ? 'is-on' : undefined}>
            <button type="button" onClick={() => setActive(active === i ? null : i)}>
              <span className="idp-seq__n">{i + 1}</span>
              <span className="dv-two"><b>{camShort(s.camId)}</b><span>{s.dir ? (s.dir === 'entrada' ? 'Entrada' : 'Saída') : 'Passagem'} · leitura {s.conf}%</span></span>
              <time>{fmtTime(s.at)}</time>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Cadastrar / editar veículo ───────────── */

export type VForm = Pick<Vehicle, 'plate' | 'type' | 'brand' | 'model' | 'color' | 'year' | 'owner' | 'fleet'>;
const BRANDS = ['BYD', 'Chevrolet', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jeep', 'Mercedes-Benz', 'Nissan', 'Renault', 'Toyota', 'Volkswagen', 'Yamaha'];
const COLORS = ['Branco', 'Preto', 'Prata', 'Cinza', 'Vermelho', 'Azul', 'Verde', 'Amarelo', 'Laranja', 'Marrom'];
export const normPlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function VehicleForm({ edit, plates, people, onClose, onSave }: { edit?: Vehicle; plates: string[]; people: Person[]; onClose: () => void; onSave: (d: VForm) => void }) {
  const [plate, setPlate] = useState(edit?.plate ?? '');
  const [type, setType] = useState<VType | ''>(edit?.type ?? '');
  const [brand, setBrand] = useState(edit?.brand ?? '');
  const [model, setModel] = useState(edit?.model ?? '');
  const [color, setColor] = useState(edit?.color ?? '');
  const [year, setYear] = useState(edit?.year ? String(edit.year) : '');
  const [owner, setOwner] = useState<string | null>(edit?.owner ?? null);
  const [fleet, setFleet] = useState(edit?.fleet ?? '');
  const [touched, setTouched] = useState(false);
  const p = normPlate(plate);
  const errors = {
    plate: !p ? 'Informe a placa' : !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p) ? 'Placa inválida (ex.: ABC1D23 ou ABC1234)' : plates.includes(p) && p !== edit?.plate ? 'Já existe um veículo com essa placa' : '',
    year: year && (+year < 1950 || +year > 2027) ? 'Ano entre 1950 e 2027' : '',
  };
  const nErr = Object.values(errors).filter(Boolean).length;
  const save = () => {
    setTouched(true);
    if (nErr) return;
    onSave({ plate: p, type: type || null, brand: brand.trim(), model: model.trim(), color: color.trim(), year: year ? +year : null, owner, fleet: fleet.trim() || undefined });
  };
  return (
    <Sheet eyebrow={edit ? 'Editar veículo' : 'Veículos · cadastro único'} title={edit ? edit.plate : 'Cadastrar veículo'} onClose={onClose} onSubmit={save} width={540}
      footer={
        <>
          {touched && nErr > 0 && <span className="dv-form__err"><Icon name="errorFill" size={14} />{nErr === 1 ? '1 campo precisa de atenção' : `${nErr} campos precisam de atenção`}</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">{edit ? 'Salvar alterações' : 'Cadastrar'}</button>
        </>
      }>
      <section className="dv-card2">
        <h3>Identificação</h3>
        <div className="dv-row">
          <label className={`dv-field${touched && errors.plate ? ' is-err' : ''}`}>
            <span className="dv-field__l">Placa<i>*</i></span>
            <span className="nx-input id-plateinput"><input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC1D23" maxLength={8} autoFocus={!edit} /></span>
            <span className="dv-field__h">{touched && errors.plate ? errors.plate : 'Sem traço; maiúsculas automáticas'}</span>
          </label>
          <div className="dv-field">
            <span className="dv-field__l">Tipo</span>
            <Select label="Tipo" value={type} onChange={setType} options={V_TYPES.map((t) => ({ value: t, label: t }))} />
          </div>
        </div>
        <div className="dv-row">
          <label className="dv-field">
            <span className="dv-field__l">Marca</span>
            <span className="nx-input"><input list="id-brands" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex.: Fiat" /></span>
            <datalist id="id-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
          </label>
          <label className="dv-field"><span className="dv-field__l">Modelo</span><span className="nx-input"><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex.: Argo" /></span></label>
        </div>
        <div className="dv-row">
          <label className="dv-field">
            <span className="dv-field__l">Cor</span>
            <span className="nx-input"><input list="id-colors" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ex.: Prata" /></span>
            <datalist id="id-colors">{COLORS.map((b) => <option key={b} value={b} />)}</datalist>
          </label>
          <label className={`dv-field${touched && errors.year ? ' is-err' : ''}`}>
            <span className="dv-field__l">Ano do modelo</span>
            <span className="nx-input"><input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ex.: 2022" /></span>
            {touched && errors.year && <span className="dv-field__h">{errors.year}</span>}
          </label>
        </div>
        <span className="dv-field__h">Marca e cor sugerem do catálogo; valores fora da lista também são aceitos.</span>
      </section>
      <section className="dv-card2">
        <h3>Vínculo</h3>
        <div className="dv-field">
          <span className="dv-field__l">Pessoa vinculada</span>
          <Combobox label="Pessoa vinculada" value={owner} placeholder="Buscar pessoa cadastrada" searchPlaceholder="Buscar pelo nome"
            options={people.filter((x) => x.status !== 'falecida').map((x) => ({ value: x.id, label: x.name }))} onChange={setOwner} />
          {owner && <button type="button" className="dv-link id-sample" onClick={() => setOwner(null)}>Remover vínculo</button>}
        </div>
        <label className="dv-field">
          <span className="dv-field__l">Frota ou empresa</span>
          <span className="nx-input"><input value={fleet} onChange={(e) => setFleet(e.target.value)} placeholder="Ex.: Frota · Manutenção" /></span>
        </label>
      </section>
    </Sheet>
  );
}

/* ───────────── Monitorar veículo ───────────── */

export function MonitorVehicle({ v, onClose, onSave }: { v: Vehicle; onClose: () => void; onSave: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const err = !reason.trim() ? 'Descreva o motivo documentado' : '';
  return (
    <Sheet eyebrow="Monitorar veículo" title={v.plate} onClose={onClose} onSubmit={() => { setTouched(true); if (!err) onSave(reason.trim()); }} width={460}
      footer={<><span className="dv-tools__sp" /><Button onClick={onClose}>Cancelar</Button><button type="submit" className="nx-btn nx-btn--primary">Monitorar</button></>}>
      <p className="dv-muted id-lead">Cada nova leitura da placa gera um alerta para a central, até o monitoramento ser encerrado.</p>
      <label className={`dv-field${touched && err ? ' is-err' : ''}`}>
        <span className="dv-field__l">Motivo<i>*</i></span>
        <textarea className="wl-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: veículo citado na ocorrência OC-2611-0123 (fica na trilha de auditoria)" autoFocus />
        {touched && err && <span className="dv-field__h">{err}</span>}
      </label>
    </Sheet>
  );
}

export const plateMatch = (v: Vehicle, q: string) => norm(`${v.plate} ${vDesc(v)} ${v.fleet ?? ''}`).includes(q);
