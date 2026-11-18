import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Icon, IconButton, Menu, NavItem, Select, Switch, useTooltip } from '../../ds/components';
import { copy } from '../devices/parts';
import { Attr } from './TraitDrawer';
import { Vehicle } from './Vehicle';
import { camName, camOf, when, type Search } from './data';
import { dayKey, dayLabel, PERIOD_LABEL } from './parts';
import { runVehicleSearch, vDescribe, VCOLOR, vIsSet, VKEYS, vLabel, vOk, vScore, VTYPE_LABEL, VTYPE_SHORT, type VFilters, type VObs } from './vehicles';

const PAGE = 48;
type Sort = 'recent' | 'match';

/** Placa no desenho Mercosul. */
export function Plate({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' }) {
  return <span className={`tr-pl is-${size}`}><i>BRASIL</i><b>{plate}</b></span>;
}

/** Resultados de uma busca de veículo: mesma estrutura da busca de pessoa, com passagens no lugar de registros. */
export function VehicleResults({ s, all, busy, onBack, onEdit, onLike, toast }: { s: Search; all: VObs[]; busy: boolean; onBack: () => void; onEdit: () => void; onLike: (f: Partial<VFilters>) => void; toast: (m: string) => void }) {
  const vf = s.vf!;
  const [sort, setSort] = useState<Sort>('recent');
  const [group, setGroup] = useState(true);
  const [day, setDay] = useState('');
  const [cam, setCam] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const res = useMemo(() => runVehicleSearch(all, vf, s.at), [all, vf, s.at]);
  const days = useMemo(() => {
    const m = new Map<string, { t: number; n: number }>();
    for (const o of res.exact) { const k = dayKey(o.at); const g = m.get(k); if (g) g.n++; else m.set(k, { t: o.at, n: 1 }); }
    return [...m.entries()].sort((a, b) => b[1].t - a[1].t);
  }, [res]);
  const filtered = res.exact.filter((o) => (!day || dayKey(o.at) === day) && (!cam || o.src === cam));
  const shown = useMemo(() => {
    const sorted = [...filtered].sort((x, y) => (sort === 'match' ? vScore(y, vf) - vScore(x, vf) || y.at - x.at : y.at - x.at));
    if (!group) return sorted.map((o) => ({ o, n: 1 }));
    const seen = new Map<number, { o: VObs; n: number }>();
    for (const o of sorted) { const g = seen.get(o.vehicle); if (g) g.n++; else seen.set(o.vehicle, { o, n: 1 }); }
    return [...seen.values()];
  }, [filtered, vf, sort, group]);
  const narrowed = !!day || !!cam;
  const open = openId ? all.find((o) => o.id === openId) ?? null : null;
  const chips = [...VKEYS.filter((k) => vIsSet(vf, k)).map((k) => vLabel(vf, k)), vf.locais.length ? vf.locais.join(' ou ') : 'Todos os locais', PERIOD_LABEL[vf.period]];
  const nv = (n: number) => `${n} ${n === 1 ? 'veículo' : 'veículos'}`;

  return (
    <div className="tr-res">
      <div className="tr-rhead">
        <IconButton icon="arrowLeft" label="Voltar para as buscas" onClick={onBack} tipPlace="bottom" />
        <div className="tr-rhead__t">
          <b>{vDescribe(vf)}</b>
          <p><span className="tr-code">{s.code}</span><span>·</span>{s.by}<span>·</span>{when(s.at, now)}<span>·</span><Icon name="lock" size={12} /><span className="tr-rhead__p" title={s.purpose}>{s.purpose}</span></p>
        </div>
        <span className="dv-tools__sp" />
        <Button icon="edit" onClick={onEdit}>Editar busca</Button>
        <IconButton icon="download" label="Exportar relatório" tipPlace="bottom" onClick={() => toast(`Relatório de ${s.code} gerado com a finalidade registrada`)} />
      </div>

      {busy ? (
        <div className="tr-intro">
          <div className="tr-intro__art tr-intro__veh"><Vehicle type={vf.types[0]} colors={vf.colors} /><i className="tr-scan" /></div>
          <h2>Pesquisando nas câmeras…</h2>
          <p>{vDescribe(vf)}</p>
        </div>
      ) : (
        <div className="tr-rbody">
          <div className="tr-bar2">
            <div className="tr-sum__n">
              <b>{narrowed ? `${filtered.length} de ${res.exact.length}` : res.exact.length.toLocaleString('pt-BR')}</b>
              <span>{res.exact.length === 1 ? 'passagem' : 'passagens'} · {nv(res.vehicles)}</span>
            </div>
            <span className="dv-tools__sp" />
            <div className="tr-sel"><Select<string> label="Dia" value={day} onChange={(v) => { setDay(v); setLimit(PAGE); }}
              options={[{ value: '', label: 'Todos os dias' }, ...days.map(([k, d]) => ({ value: k, label: <>{dayLabel(d.t, now)} <span className="tr-sel__n">{d.n}</span></> }))]} /></div>
            <div className="tr-sel"><Select<string> label="Câmera" value={cam} onChange={(v) => { setCam(v); setLimit(PAGE); }}
              options={[{ value: '', label: 'Todas as câmeras' }, ...res.cams.map(([id, n]) => ({ value: id, label: <>{camName(id)} <span className="tr-sel__n">{n}</span></> }))]} /></div>
            <div className="tr-sel"><Select<Sort> label="Ordenar" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'match', label: 'Maior correspondência' }]} /></div>
            <label className="tr-group"><Switch size="sm" checked={group} onChange={(v) => { setGroup(v); setLimit(PAGE); }} label="Agrupar mesmo veículo" />Agrupar mesmo veículo</label>
          </div>

          <div className="tr-crit">
            <span>Critérios</span>
            {chips.map((c) => <span key={c} className="tr-crit__c">{c}</span>)}
            {narrowed && <button type="button" className="tr-link" onClick={() => { setDay(''); setCam(''); }}>Limpar dia e câmera</button>}
          </div>

          {shown.length > 0 ? (
            <>
              <div className="tr-grid">
                {shown.slice(0, limit).map(({ o, n }) => <VCard key={o.id} o={o} n={n} vf={vf} now={now} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
              </div>
              {shown.length > limit && <div className="tr-more"><Button onClick={() => setLimit(limit + PAGE)}>Mostrar mais {Math.min(PAGE, shown.length - limit)} de {shown.length - limit}</Button></div>}
            </>
          ) : (
            <div className="mv-empty tr-empty">
              <Icon name="car" size={28} />
              <b>Nenhuma passagem no recorte</b>
              <span>Edite a busca para ampliar o período, tirar características ou usar só um trecho da placa.</span>
              <Button icon="edit" onClick={onEdit}>Editar busca</Button>
            </div>
          )}
        </div>
      )}

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <VehicleDrawer key={open.id} o={open} vf={vf} all={all} now={now} onOpen={setOpenId} onClose={() => setOpenId(null)} toast={toast}
              onSearchLike={(nf) => { setOpenId(null); onLike(nf); }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function VCard({ o, n, vf, now, on, onOpen }: { o: VObs; n: number; vf: VFilters; now: number; on: boolean; onOpen: () => void }) {
  const tip = useTooltip(`Passou ${n} vezes no recorte`, undefined, n > 1, 'top');
  const cam = camOf(o.src);
  return (
    <button type="button" className={`tr-card tr-vcard${on ? ' is-on' : ''}${n > 1 ? ' is-stack' : ''}`} onClick={onOpen} aria-label={`${VTYPE_SHORT[o.type]} ${o.brand} ${o.model}, ${camName(o.src)}, ${when(o.at, now)}`}>
      <span className={`tr-card__img tr-vcard__img${cam.night ? ' is-night' : ''}`}>
        <Vehicle type={o.type} colors={[o.color]} />
        <span className="fc-det">{vScore(o, vf)}%</span>
        {n > 1 && <span className="tr-stack" {...tip}><Icon name="stack" size={12} />{n}×</span>}
        {o.plate && <span className="tr-vcard__plate"><Plate plate={o.plate} size="sm" /></span>}
      </span>
      <span className="tr-card__body">
        <b>{o.brand} {o.model}</b>
        <span className="tr-card__wear"><i style={{ background: VCOLOR[o.color].hex }} />{VCOLOR[o.color].label}<span>·</span>{VTYPE_SHORT[o.type]}</span>
        <span className="tr-card__meta"><span>{camName(o.src)}</span><time>{when(o.at, now)}</time></span>
      </span>
    </button>
  );
}

function VehicleDrawer({ o, vf, all, now, onOpen, onClose, toast, onSearchLike }: { o: VObs; vf: VFilters; all: VObs[]; now: number; onOpen: (id: string) => void; onClose: () => void; toast: (m: string) => void; onSearchLike: (f: Partial<VFilters>) => void }) {
  const navigate = useNavigate();
  const [more, setMore] = useState<HTMLElement | null>(null);
  const cam = camOf(o.src);
  const trail = all.filter((x) => x.vehicle === o.vehicle).sort((a, b) => b.at - a.at);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.nx-menu')) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  const asked = (k: Parameters<typeof vIsSet>[1]) => vIsSet(vf, k);
  const ok = (k: Parameters<typeof vIsSet>[1]) => vOk(o, vf, k);
  return (
    <aside className="dv-drawer tr-drawer" aria-label="Detalhe da passagem">
      <header className="dv-drawer__head">
        <span className="dv-kind is-lg"><Icon name="car" size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{o.brand} {o.model}</h2>
          <p>{camName(o.src)} · {when(o.at, now)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>
      <div className="dv-drawer__body">
        <div className={`tr-vhero${cam.night ? ' is-night' : ''}`}>
          <Vehicle type={o.type} colors={[o.color]} />
          <span className="fc-hero__det">Track #{o.track}</span>
          {o.plate && <Plate plate={o.plate} />}
        </div>
        <Alert type="information" title={o.plate ? 'A placa identifica o veículo, não quem dirige' : 'Bicicleta não tem placa'}>
          {o.plate ? 'Para saber quem estava nele, cruze com o reconhecimento facial e a gravação.' : 'Passagens parecidas podem ser de outra bicicleta igual.'}
        </Alert>
        <div className="fc-acts2">
          <Button variant="primary" icon="tv" onClick={() => { navigate('/mural-de-video'); toast(`Gravação de ${camName(o.src)} às ${new Date(o.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`); }}>Ver gravação</Button>
          <Button icon="search" onClick={() => onSearchLike({ types: [o.type], colors: [o.color], brands: [o.brand], models: [`${o.brand} ${o.model}`], plate: '' })}>Buscar parecidos</Button>
          <span className="dv-tools__sp" />
          <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
        </div>
        <section className="dv-sec">
          <div className="dv-sec__head"><h3>Características</h3><span className="fc-muted">confiança do motor</span></div>
          <div className="tr-attrs">
            <Attr label="Tipo" value={VTYPE_LABEL[o.type]} conf={o.conf.type} asked={asked('types')} ok={ok('types')} />
            <Attr label="Marca" value={o.brand} conf={o.conf.brand} asked={asked('brands')} ok={ok('brands')} />
            <Attr label="Modelo" value={o.model} conf={o.conf.model} asked={asked('models')} ok={ok('models')} />
            <Attr label="Cor" value={<><i className="tr-dot" style={{ background: VCOLOR[o.color].hex }} />{VCOLOR[o.color].label}</>} conf={o.conf.color} asked={asked('colors')} ok={ok('colors')} />
            <Attr label="Placa" value={o.plate ? <span className="tr-code">{o.plate}</span> : '—'} conf={o.plate ? o.conf.plate : undefined} asked={asked('plate')} ok={ok('plate')} />
          </div>
        </section>
        <dl className="dv-info">
          <div className="dv-info__row"><dt>Câmera</dt><dd>{cam.name ?? <span className="fc-muted">Sem nome cadastrado</span>}</dd></div>
          <div className="dv-info__row"><dt>Local</dt><dd>{cam.local}</dd></div>
          <div className="dv-info__row"><dt>Capturada em</dt><dd>{new Date(o.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}</dd></div>
        </dl>
        {trail.length > 1 && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>{o.plate ? 'Passagens deste veículo' : 'Vista com esta descrição'}</h3><span className="fc-muted">{trail.length}</span></div>
            {!o.plate && <p className="fc-hint">Pode ser outra bicicleta igual.</p>}
            <ol className="tr-trail">
              {trail.map((x) => (
                <li key={x.id} className={x.id === o.id ? 'is-cur' : undefined}>
                  <button type="button" onClick={() => x.id !== o.id && onOpen(x.id)} disabled={x.id === o.id}>
                    <span className="tr-trail__img tr-trail__veh"><Vehicle type={x.type} colors={[x.color]} size="sm" /></span>
                    <span className="tr-trail__t"><b>{camName(x.src)}</b><em>{camOf(x.src).local}</em></span>
                    <time>{when(x.at, now)}</time>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          <NavItem role="menuitem" icon="ocor" label="Anexar a uma ocorrência" onClick={() => { setMore(null); toast('Passagem anexada à ocorrência OC-2026-0142'); }} />
          <NavItem role="menuitem" icon="download" label="Baixar recorte" onClick={() => { setMore(null); toast('Recorte salvo em Exportações'); }} />
          {o.plate && <NavItem role="menuitem" icon="copy" label="Copiar placa" onClick={() => { setMore(null); copy(o.plate!, toast, 'Placa copiada'); }} />}
        </Menu>
      )}
    </aside>
  );
}
