import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, PageHeader, Segmented, Select, Switch } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { Figure } from './Figure';
import { NewSearch } from './NewSearch';
import { SearchMotion } from './SearchMotion';
import { TraitDrawer } from './TraitDrawer';
import { Card, describe, fmtBucket, PERIOD_LABEL, Timeline } from './parts';
import { buildObs, camName, isSet, ME, nextCode, runSearch, score, seedSearches, TRAIT_KEYS, traitLabel, when, type Filters, type Obs, type Search } from './data';
import '../mural/mural.css';
import '../devices/devices.css';
import '../faces/faces.css';
import '../occurrences/occurrences.css';
import './traits.css';

type Sort = 'recent' | 'match';
type Who = 'todas' | 'minhas';
const PAGE = 48;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function TraitsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [now] = useState(() => Date.now());
  const all = useMemo(() => buildObs(now), [now]);
  const [list, setList] = useState<Search[]>(() => seedSearches(all, now));
  const [q, setQ] = useState('');
  const [who, setWho] = useState<Who>('todas');
  const [wizard, setWizard] = useState<{ initial?: Filters } | null>(null);
  const [openSearch, setOpenSearch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = (f: Filters, purpose: string) => {
    const at = Date.now();
    const r = runSearch(all, f, at);
    const s: Search = { id: `n${at}`, code: nextCode(), f, purpose, by: ME, me: true, at, n: r.exact.length, people: r.people };
    setWizard(null);
    setList((l) => [s, ...l]);
    setOpenSearch(s.id);
    setBusy(true);
    setTimeout(() => setBusy(false), 4200);
  };

  const nq = norm(q.trim());
  const rows = list.filter((s) => (who === 'todas' || s.me) && (!nq || norm(`${s.code} ${describe(s.f)} ${s.purpose} ${s.by} ${s.f.locais.join(' ')}`).includes(nq)));
  const cur = openSearch ? list.find((s) => s.id === openSearch) ?? null : null;

  return (
    <div className="mv tr">
      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="search"
          description="Encontre pessoas vistas pelas câmeras pela aparência. Descreve, não identifica."
          actions={<Button variant="primary" icon="plus" onClick={() => setWizard({})}>Nova busca</Button>}
        />

        {cur ? (
          <Results key={cur.id} s={cur} all={all} busy={busy} onBack={() => setOpenSearch(null)} onEdit={() => setWizard({ initial: cur.f })} onLike={(nf) => setWizard({ initial: { ...cur.f, ...nf } })} toast={toast} />
        ) : (
          <div className="dv-body tr-list">
            <div className="dv-tools">
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição, finalidade ou autor" aria-label="Filtrar buscas" />
                {q && <button type="button" className="dv-search__x" aria-label="Limpar" onClick={() => setQ('')}><Icon name="close" size={14} /></button>}
              </label>
              <Segmented<Who> label="Autor" value={who} onChange={setWho} options={[
                { value: 'todas', label: <>Todas <span className="nx-seg__n">{list.length}</span></> },
                { value: 'minhas', label: <>Minhas <span className="nx-seg__n">{list.filter((s) => s.me).length}</span></> },
              ]} />
              <span className="dv-tools__sp" />
              <span className="tr-list__note"><Icon name="audit" size={14} />Toda busca fica registrada com a finalidade</span>
            </div>

            <div className="dv-table tr-table" role="table" aria-label="Buscas feitas">
              <div className="dv-tr dv-th" role="row">
                <span className="dv-c" role="columnheader">Busca</span>
                <span className="dv-c" role="columnheader">Finalidade</span>
                <span className="dv-c" role="columnheader">Onde e quando</span>
                <span className="dv-c" role="columnheader">Resultados</span>
                <span className="dv-c" role="columnheader">Feita por</span>
                <span className="dv-c" role="columnheader"><span className="nx-sr">Abrir</span></span>
              </div>
              {rows.map((s) => (
                <div key={s.id} className="dv-tr" role="row" tabIndex={0} onClick={() => setOpenSearch(s.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenSearch(s.id); }}>
                  <span className="dv-c tr-c-desc" role="cell">
                    <span className="tr-mini"><Figure size="sm" upper={s.f.upper} lower={s.f.lower} gender={s.f.gender} hat={s.f.hat === 'sim'} glasses={s.f.glasses === 'sim'} backpack={s.f.backpack === 'sim'} extras={s.f.extras} /></span>
                    <span className="dv-two"><b>{describe(s.f)}</b><span><em className="tr-code">{s.code}</em></span></span>
                  </span>
                  <span className="dv-c tr-c-purp" role="cell">{s.purpose}</span>
                  <span className="dv-c" role="cell"><span className="dv-two"><b>{s.f.locais.length ? s.f.locais.join(', ') : 'Todos os locais'}</b><span>{PERIOD_LABEL[s.f.period]}</span></span></span>
                  <span className="dv-c" role="cell"><span className="dv-two"><b className="tr-num">{s.n.toLocaleString('pt-BR')} {s.n === 1 ? 'registro' : 'registros'}</b><span>cerca de {s.people} {s.people === 1 ? 'pessoa' : 'pessoas'}</span></span></span>
                  <span className="dv-c tr-c-by" role="cell"><span className="nx-avatar tr-av">{initials(s.by)}</span><span className="dv-two"><b>{s.by}</b><span>{when(s.at, now)}</span></span></span>
                  <span className="dv-c tr-c-go" role="cell"><Icon name="chevron" size={16} /></span>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="mv-empty tr-empty">
                  <Icon name="search" size={24} />
                  <b>Nenhuma busca encontrada</b>
                  <span>Troque o filtro ou faça uma nova busca.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {wizard && <NewSearch initial={wizard.initial} all={all} onClose={() => setWizard(null)} onSearch={create} />}
    </div>
  );
}

/* ───────────── resultados de uma busca ───────────── */

function Results({ s, all, busy, onBack, onEdit, onLike, toast }: { s: Search; all: Obs[]; busy: boolean; onBack: () => void; onEdit: () => void; onLike: (f: Partial<Filters>) => void; toast: (m: string) => void }) {
  const [sort, setSort] = useState<Sort>('recent');
  const [group, setGroup] = useState(true);
  const [bucket, setBucket] = useState<number | null>(null);
  const [cam, setCam] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const f = s.f;
  const res = useMemo(() => runSearch(all, f, s.at), [all, f, s.at]);

  const shown = useMemo(() => {
    let l = res.exact;
    if (bucket != null) { const bk = res.buckets[bucket]; l = l.filter((o) => o.at >= bk.from && o.at < bk.to); }
    if (cam) l = l.filter((o) => o.src === cam);
    const sorted = [...l].sort((x, y) => (sort === 'match' ? score(y, f) - score(x, f) || y.at - x.at : y.at - x.at));
    if (!group) return sorted.map((o) => ({ o, n: 1 }));
    const seen = new Map<number, { o: Obs; n: number }>();
    for (const o of sorted) { const g = seen.get(o.person); if (g) g.n++; else seen.set(o.person, { o, n: 1 }); }
    return [...seen.values()];
  }, [res, f, bucket, cam, sort, group]);
  const nShown = shown.reduce((a, g) => a + g.n, 0);
  const open = openId ? all.find((o) => o.id === openId) ?? null : null;
  const chips = [...TRAIT_KEYS.filter((k) => isSet(f, k)).map((k) => traitLabel(f, k)), f.locais.length ? f.locais.join(' ou ') : 'Todos os locais', PERIOD_LABEL[f.period]];

  return (
    <div className="tr-res">
      <div className="tr-rhead">
        <IconButton icon="arrowLeft" label="Voltar para as buscas" onClick={onBack} tipPlace="bottom" />
        <div className="tr-rhead__t">
          <b>{s.code}<span>·</span>{s.by}<span>·</span>{when(s.at, now)}</b>
          <p title={s.purpose}><Icon name="lock" size={12} />{s.purpose}</p>
        </div>
        <span className="dv-tools__sp" />
        <Button icon="edit" onClick={onEdit}>Editar busca</Button>
        <Button icon="download" onClick={() => toast(`Relatório de ${s.code} gerado com a finalidade registrada`)}>Exportar</Button>
      </div>

      {busy ? (
        <div className="tr-intro">
          <div className="tr-intro__art"><SearchMotion fast /></div>
          <h2>Pesquisando nas câmeras…</h2>
          <p>{describe(f)}</p>
        </div>
      ) : (
        <>
          <div className="tr-sum">
            <div className="tr-sum__n">
              <b>{res.exact.length.toLocaleString('pt-BR')}</b>
              <span>{res.exact.length === 1 ? 'registro' : 'registros'} · cerca de {res.people} {res.people === 1 ? 'pessoa' : 'pessoas'} pela descrição</span>
            </div>
            <span className="dv-tools__sp" />
            <label className="tr-group"><Switch size="sm" checked={group} onChange={(v) => { setGroup(v); setLimit(PAGE); }} label="Agrupar parecidos" />Agrupar parecidos</label>
            <div className="tr-sort"><Select<Sort> label="Ordenar" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'match', label: 'Maior correspondência' }]} /></div>
          </div>

          <div className="dv-chips">{chips.map((c) => <span key={c} className="dv-chip tr-chip-ro">{c}</span>)}</div>

          <Timeline buckets={res.buckets} sel={bucket} onSel={(i) => { setBucket(bucket === i ? null : i); setLimit(PAGE); }} period={f.period} />

          {res.cams.length > 1 && (
            <div className="tr-cams" aria-label="Por câmera">
              <span className="tr-cams__t">Por câmera</span>
              {res.cams.slice(0, 6).map(([id, n]) => (
                <button key={id} type="button" className={`tr-cam${cam === id ? ' is-on' : ''}`} onClick={() => { setCam(cam === id ? null : id); setLimit(PAGE); }}>
                  <Icon name="camera" size={14} /><span>{camName(id)}</span><em>{n}</em>
                </button>
              ))}
              {res.cams.length > 6 && <span className="tr-cams__more">+{res.cams.length - 6}</span>}
            </div>
          )}

          {(bucket != null || cam) && (
            <div className="tr-narrow">
              <Icon name="filter" size={14} />
              Mostrando {nShown} de {res.exact.length}
              {bucket != null && <> · {fmtBucket(res.buckets[bucket], f.period)}</>}
              {cam && <> · {camName(cam)}</>}
              <button type="button" className="tr-link" onClick={() => { setBucket(null); setCam(null); }}>Ver todas</button>
            </div>
          )}

          <div className="tr-scroll">
            {shown.length > 0 ? (
              <>
                <div className="tr-grid">
                  {shown.slice(0, limit).map(({ o, n }) => <Card key={o.id} o={o} n={n} f={f} now={now} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
                </div>
                {shown.length > limit && <div className="tr-more"><Button onClick={() => setLimit(limit + PAGE)}>Mostrar mais {Math.min(PAGE, shown.length - limit)} de {shown.length - limit}</Button></div>}
              </>
            ) : (
              <div className="mv-empty tr-empty">
                <Icon name="search" size={28} />
                <b>Nenhum registro no recorte</b>
                <span>Edite a busca para ampliar o período ou tirar características. “Tanto faz” não filtra o atributo.</span>
                <Button icon="edit" onClick={onEdit}>Editar busca</Button>
              </div>
            )}

            {res.near.length > 0 && bucket == null && !cam && (
              <section className="tr-near">
                <div className="tr-near__head">
                  <h3>Quase batem</h3>
                  <span>{res.near.length} registros diferem em só uma característica. A câmera erra, principalmente em cor com pouca luz.</span>
                </div>
                <div className="tr-grid is-near">
                  {res.near.slice(0, 12).map(({ o, miss }) => <Card key={o.id} o={o} f={f} now={now} miss={miss} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {open && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <TraitDrawer key={open.id} o={open} f={f} all={all} now={now} onOpen={setOpenId} onClose={() => setOpenId(null)} toast={toast}
              onSearchLike={(nf) => { setOpenId(null); onLike(nf); }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
