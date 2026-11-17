import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, DateTimePicker, Icon, IconButton, Kbd, PageHeader, Segmented, Select, Switch, useTooltip } from '../../ds/components';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { storage } from '../../lib/storage';
import { FaceImg } from '../faces/FaceImg';
import { Figure } from './Figure';
import { TraitDrawer } from './TraitDrawer';
import {
  AGES, buildObs, camName, camOf, COLOR, COLORS, EMPTY, EXAMPLES, EXTRAS, GENDER_LABEL, isSet, LOCAIS, MOODS, nTraits, obsTrait, parseDescription, range, score,
  TRAIT_KEYS, traitLabel, traitOk, when, type Color, type Filters, type Obs, type TraitKey, type Tri,
} from './data';
import '../mural/mural.css';
import '../devices/devices.css';
import '../faces/faces.css';
import './traits.css';

type Sort = 'recent' | 'match';
type Run = { f: Filters; purpose: string; n: number; at: number };
type Recent = { label: string; f: Filters };
const PAGE = 48;

const toggle = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
const readRecent = (): Recent[] => { try { return JSON.parse(storage.get('nx-traits-recent') ?? '[]'); } catch { return []; } };
const readPurposes = (): string[] => { try { return JSON.parse(storage.get('nx-traits-purposes') ?? '[]'); } catch { return []; } };
const describe = (f: Filters) => TRAIT_KEYS.filter((k) => isSet(f, k)).map((k) => traitLabel(f, k)).join(' · ') || 'Todas as pessoas';
const PERIOD_LABEL = { '1h': 'Última hora', '24h': 'Últimas 24 h', '7d': 'Últimos 7 dias', custom: 'Personalizado' } as const;

export function TraitsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [now, setNow] = useState(() => Date.now());
  const all = useMemo(() => buildObs(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [f, setF] = useState<Filters>(EMPTY);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [askPurpose, setAskPurpose] = useState(false);
  const [text, setText] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [group, setGroup] = useState(true);
  const [bucket, setBucket] = useState<number | null>(null);
  const [cam, setCam] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>(readRecent);
  const descRef = useRef<HTMLInputElement>(null);
  const resRef = useRef<HTMLDivElement>(null);
  const upperRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const parsed = useMemo(() => (text.trim().length > 2 ? parseDescription(text) : {}), [text]);
  const parsedKeys = Object.keys(parsed) as (keyof Filters)[];

  /** Executa a consulta (vinculada à finalidade). Simula a ida ao servidor. */
  const execute = (nf: Filters, p = purpose) => {
    setBusy(true); setBucket(null); setCam(null); setLimit(PAGE);
    const t = Date.now();
    setTimeout(() => {
      setNow(t);
      setRun((r) => ({ f: nf, purpose: p, n: (r?.n ?? 0) + 1, at: t }));
      setBusy(false);
      const label = describe(nf);
      setRecent((list) => { const n = [{ label, f: nf }, ...list.filter((x) => x.label !== label)].slice(0, 5); storage.set('nx-traits-recent', JSON.stringify(n)); return n; });
    }, 420);
  };
  const search = (nf = f) => { if (!purpose.trim()) { setAskPurpose(true); return; } execute(nf); };

  // Depois da primeira consulta, mudar um filtro refaz a busca (mesma finalidade).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!run) return;
    const t = setTimeout(() => execute(f), 260);
    return () => clearTimeout(t);
  }, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !el.closest('input, textarea, [contenteditable]')) { e.preventDefault(); descRef.current?.focus(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const applyText = () => {
    if (!parsedKeys.length) { toast('Não reconheci nenhuma característica. Tente “camiseta vermelha com mochila”.'); return; }
    const nf = { ...f, ...parsed };
    setF(nf); setText('');
    if (!run) search(nf);
  };
  const useExample = (t: string) => { const nf = { ...EMPTY, ...parseDescription(t) }; setF(nf); search(nf); };

  /* ── resultados ── */
  const rf = run?.f;
  const res = useMemo(() => {
    if (!rf) return null;
    const [a, b] = range(rf, run!.at);
    const base = all.filter((o) => o.at >= a && o.at <= b && (!rf.locais.length || rf.locais.includes(camOf(o.src).local)));
    const keys = TRAIT_KEYS.filter((k) => isSet(rf, k));
    const exact: Obs[] = [], near: { o: Obs; miss: TraitKey }[] = [];
    for (const o of base) {
      const miss = keys.filter((k) => !traitOk(o, rf, k));
      if (!miss.length) exact.push(o);
      else if (miss.length === 1 && keys.length >= 2 && miss[0] !== 'gender') near.push({ o, miss: miss[0] });
    }
    // linha do tempo
    const span = b - Math.max(a, base.length ? Math.min(...base.map((o) => o.at)) : a);
    const n = rf.period === '1h' ? 12 : rf.period === '24h' ? 24 : 28;
    const start = rf.period === 'custom' ? b - span : a;
    const size = (b - start) / n;
    const buckets = Array.from({ length: n }, (_, i) => ({ from: start + i * size, to: start + (i + 1) * size, n: 0 }));
    for (const o of exact) { const i = Math.min(n - 1, Math.floor((o.at - start) / size)); if (i >= 0) buckets[i].n++; }
    const byCam = new Map<string, number>();
    for (const o of exact) byCam.set(o.src, (byCam.get(o.src) ?? 0) + 1);
    const cams = [...byCam.entries()].sort((x, y) => y[1] - x[1]);
    return { exact, near, buckets, cams, people: new Set(exact.map((o) => o.person)).size };
  }, [rf, run, all]);

  const shown = useMemo(() => {
    if (!res || !rf) return [];
    let l = res.exact;
    if (bucket != null) { const bk = res.buckets[bucket]; l = l.filter((o) => o.at >= bk.from && o.at < bk.to); }
    if (cam) l = l.filter((o) => o.src === cam);
    const sorted = [...l].sort((x, y) => (sort === 'match' ? score(y, rf) - score(x, rf) || y.at - x.at : y.at - x.at));
    if (!group) return sorted.map((o) => ({ o, n: 1 }));
    // Agrupa observações com a mesma descrição (mesma pessoa provável): fica a primeira pela ordem escolhida.
    const seen = new Map<number, { o: Obs; n: number }>();
    for (const o of sorted) { const g = seen.get(o.person); if (g) g.n++; else seen.set(o.person, { o, n: 1 }); }
    return [...seen.values()];
  }, [res, rf, bucket, cam, sort, group]);
  const nShown = shown.reduce((s, g) => s + g.n, 0);

  const open = openId ? all.find((o) => o.id === openId) ?? null : null;
  const nT = nTraits(f);
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY);

  const chips: { k: string; label: string; clear: () => void }[] = [
    ...TRAIT_KEYS.filter((k) => isSet(f, k)).map((k) => ({ k, label: traitLabel(f, k), clear: () => set(k, (Array.isArray(f[k]) ? [] : '') as never) })),
    ...(f.locais.length ? [{ k: 'locais', label: f.locais.join(' ou '), clear: () => set('locais', []) }] : []),
  ];

  return (
    <div className="mv tr">
      <div className="mv-main">
        <PageHeader
          title={screen.label}
          icon="search"
          description="O que a câmera descreveu, não quem a pessoa é"
          actions={
            <>
              {run && <Button icon="download" onClick={() => toast(`Relatório gerado · consulta #${run.n} com a finalidade registrada`)}>Exportar</Button>}
              <IconButton icon="refresh" label="Atualizar" tipPlace="bottom" disabled={!run || busy} onClick={() => run && execute(run.f)} />
            </>
          }
        />

        <div className="tr-body">
          {/* ───────── filtros ───────── */}
          <aside className="tr-panel" aria-label="Características">
            <div className="tr-panel__scroll">
              <div className="tr-desc">
                <label className="nx-input tr-desc__in">
                  <Icon name="sparkle" size={16} />
                  <input ref={descRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Descreva: homem de camiseta vermelha com mochila"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyText(); } if (e.key === 'Escape') setText(''); }} aria-label="Descrever a pessoa" />
                  {text ? <Kbd>Enter</Kbd> : <Kbd>/</Kbd>}
                </label>
                {text.trim().length > 2 && (
                  <div className="tr-desc__pre" aria-live="polite">
                    {parsedKeys.length ? (
                      <><span>Entendi:</span>{parsedKeys.map((k) => <b key={k}>{k === 'locais' ? parsed.locais!.join(', ') : k === 'period' ? PERIOD_LABEL[parsed.period!] : traitLabel({ ...EMPTY, ...parsed }, k as TraitKey)}</b>)}</>
                    ) : <span>Nada reconhecido ainda…</span>}
                  </div>
                )}
              </div>

              <div className="tr-hero">
                <Figure upper={f.upper} lower={f.lower} gender={f.gender} hat={f.hat === 'sim'} glasses={f.glasses === 'sim'} backpack={f.backpack === 'sim'} extras={f.extras}
                  onPart={(p) => (p === 'upper' ? upperRef : p === 'lower' ? lowerRef : upperRef).current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
                <div className="tr-hero__txt">
                  <span className="tr-eyebrow">Retrato da busca</span>
                  <p>{nT ? describe(f) : 'Escolha cores e acessórios, ou descreva a pessoa no campo acima.'}</p>
                  {nT > 0 && <button type="button" className="tr-link" onClick={() => setF({ ...EMPTY, period: f.period, from: f.from, to: f.to, locais: f.locais })}>Limpar características</button>}
                </div>
              </div>

              <Field label="Gênero" hint="como reportado pelo motor">
                <Segmented<'' | 'M' | 'F'> label="Gênero" size="sm" value={f.gender} onChange={(v) => set('gender', v)}
                  options={[{ value: '', label: 'Tanto faz' }, { value: 'M', label: GENDER_LABEL.M }, { value: 'F', label: GENDER_LABEL.F }]} />
              </Field>

              <Field label="Faixa etária" hint="estimada">
                <div className="tr-chips is-ages">
                  {AGES.map((a) => <Chip key={a} on={f.ages.includes(a)} onClick={() => set('ages', toggle(f.ages, a))}>{a}</Chip>)}
                </div>
              </Field>

              <Field label="Roupa superior" refEl={upperRef} count={f.upper.length} onClear={() => set('upper', [])}>
                <Swatches value={f.upper} onChange={(v) => set('upper', v)} kind="upper" />
              </Field>
              <Field label="Roupa inferior" refEl={lowerRef} count={f.lower.length} onClear={() => set('lower', [])}>
                <Swatches value={f.lower} onChange={(v) => set('lower', v)} kind="lower" />
              </Field>

              <Field label="Acessórios">
                <div className="tr-tris">
                  <TriRow icon="hat" label="Boné ou chapéu" value={f.hat} onChange={(v) => set('hat', v)} />
                  <TriRow icon="glasses" label="Óculos" value={f.glasses} onChange={(v) => set('glasses', v)} />
                  <TriRow icon="backpack" label="Mochila" value={f.backpack} onChange={(v) => set('backpack', v)} />
                </div>
                <div className="tr-chips">
                  {EXTRAS.map((x) => <Chip key={x.id} on={f.extras.includes(x.id)} onClick={() => set('extras', toggle(f.extras, x.id))}>{x.label}</Chip>)}
                </div>
              </Field>

              <Field label="Humor aparente" badge="palpite" hint="Atributo de maior incerteza do motor">
                <div className="tr-chips">
                  {MOODS.map((m) => <Chip key={m.id} on={f.moods.includes(m.id)} onClick={() => set('moods', toggle(f.moods, m.id))}>{m.label}</Chip>)}
                </div>
              </Field>

              <Field label="Onde" count={f.locais.length} onClear={() => set('locais', [])}>
                <div className="tr-chips">
                  {LOCAIS.map((l) => <Chip key={l} on={f.locais.includes(l)} onClick={() => set('locais', toggle(f.locais, l))}>{l}</Chip>)}
                </div>
              </Field>

              <Field label="Quando">
                <Segmented<Filters['period']> label="Período" size="sm" value={f.period} onChange={(v) => setF((x) => ({ ...x, period: v, ...(v === 'custom' && !x.from ? { from: isoLocal(now - 2 * 86400e3), to: isoLocal(now) } : {}) }))}
                  options={[{ value: '1h', label: '1 h' }, { value: '24h', label: '24 h' }, { value: '7d', label: '7 dias' }, { value: 'custom', label: 'Período' }]} />
                {f.period === 'custom' && (
                  <div className="tr-dates">
                    <DateTimePicker label="De" value={f.from} onChange={(v) => set('from', v)} max={f.to || undefined} />
                    <DateTimePicker label="Até" value={f.to} onChange={(v) => set('to', v)} max={isoLocal(now)} />
                  </div>
                )}
                {f.period === 'custom' && f.from && f.to && new Date(f.from) > new Date(f.to) && <p className="tr-err" role="alert">A data inicial não pode ser posterior à data final.</p>}
              </Field>
            </div>

            <footer className="tr-panel__foot">
              {purpose ? (
                <button type="button" className="tr-purpose" onClick={() => setAskPurpose(true)}>
                  <Icon name="lock" size={14} />
                  <span className="tr-purpose__t"><em>Finalidade</em><b>{purpose}</b></span>
                  <Icon name="edit" size={14} />
                </button>
              ) : (
                <p className="tr-foot-hint"><Icon name="lock" size={14} />Cada consulta exige uma finalidade, registrada na auditoria.</p>
              )}
              {run ? (
                <p className="tr-foot-live"><i className={busy ? 'is-busy' : undefined} />{busy ? 'Pesquisando…' : 'Resultados acompanham os filtros'}</p>
              ) : (
                <Button variant="primary" icon="search" className="tr-go" onClick={() => search()} disabled={busy}>{busy ? 'Pesquisando…' : 'Pesquisar'}</Button>
              )}
            </footer>
          </aside>

          {/* ───────── resultados ───────── */}
          <section className="tr-res" ref={resRef} aria-label="Resultados" aria-busy={busy}>
            {!run || !res ? (
              <Intro busy={busy} recent={recent} onExample={useExample} onRecent={(r) => { setF(r.f); search(r.f); }} />
            ) : (
              <>
                <div className="tr-sum">
                  <div className="tr-sum__n">
                    <b>{res.exact.length.toLocaleString('pt-BR')}</b>
                    <span>{res.exact.length === 1 ? 'observação' : 'observações'} · cerca de {res.people} {res.people === 1 ? 'pessoa' : 'pessoas'} pela descrição</span>
                  </div>
                  <span className="dv-tools__sp" />
                  <Audit run={run} />
                  <label className="tr-group"><Switch size="sm" checked={group} onChange={(v) => { setGroup(v); setLimit(PAGE); }} label="Agrupar parecidos" />Agrupar parecidos</label>
                  <div className="tr-sort"><Select<Sort> label="Ordenar" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'match', label: 'Maior correspondência' }]} /></div>
                </div>

                {chips.length > 0 && (
                  <div className="dv-chips">
                    {chips.map((c) => <span key={c.k} className="dv-chip">{c.label}<button type="button" aria-label={`Remover ${c.label}`} onClick={c.clear}><Icon name="close" size={12} /></button></span>)}
                    <span className="dv-chip is-period">{f.period === 'custom' ? 'Período personalizado' : PERIOD_LABEL[f.period]}</span>
                    {dirty && <button type="button" className="dv-chips__clear" onClick={() => setF({ ...EMPTY, period: f.period })}>Limpar tudo</button>}
                  </div>
                )}

                <Timeline buckets={res.buckets} sel={bucket} onSel={(i) => { setBucket(bucket === i ? null : i); setLimit(PAGE); }} period={run.f.period} />

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
                    {bucket != null && <> · {fmtBucket(res.buckets[bucket], run.f.period)}</>}
                    {cam && <> · {camName(cam)}</>}
                    <button type="button" className="tr-link" onClick={() => { setBucket(null); setCam(null); }}>Ver todas</button>
                  </div>
                )}

                <div className={`tr-scroll${busy ? ' is-busy' : ''}`}>
                  {shown.length > 0 ? (
                    <>
                      <div className="tr-grid">
                        {shown.slice(0, limit).map(({ o, n }) => <Card key={o.id} o={o} n={n} f={run.f} now={now} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
                      </div>
                      {shown.length > limit && <div className="tr-more"><Button onClick={() => setLimit(limit + PAGE)}>Mostrar mais {Math.min(PAGE, shown.length - limit)} de {shown.length - limit}</Button></div>}
                    </>
                  ) : (
                    <div className="mv-empty tr-empty">
                      <Icon name="search" size={28} />
                      <b>Nenhum registro no recorte</b>
                      <span>Amplie o período ou remova filtros. “Tanto faz” não filtra o atributo.</span>
                    </div>
                  )}

                  {res.near.length > 0 && bucket == null && !cam && (
                    <section className="tr-near">
                      <div className="tr-near__head">
                        <h3>Quase batem</h3>
                        <span>{res.near.length} observações diferem em só uma característica. A câmera erra, principalmente em cor com pouca luz.</span>
                      </div>
                      <div className="tr-grid is-near">
                        {res.near.slice(0, 12).map(({ o, miss }) => <Card key={o.id} o={o} f={run.f} now={now} miss={miss} on={openId === o.id} onOpen={() => setOpenId(o.id)} />)}
                      </div>
                    </section>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {askPurpose && <PurposeModal initial={purpose} onCancel={() => setAskPurpose(false)}
        onOk={(p) => { setPurpose(p); setAskPurpose(false); const l = [p, ...readPurposes().filter((x) => x !== p)].slice(0, 4); storage.set('nx-traits-purposes', JSON.stringify(l)); execute(f, p); }} />}

      {open && run && createPortal(
        <div className="nx-sheet-back is-soft" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="nx-sheet dv-dsheet" style={{ width: 'min(480px, 100%)' }}>
            <TraitDrawer key={open.id} o={open} f={run.f} all={all} now={now} onOpen={setOpenId} onClose={() => setOpenId(null)} toast={toast}
              onSearchLike={(nf) => { setOpenId(null); setF({ ...f, ...nf }); toast('Filtros trocados pela descrição desta observação'); }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ───────────── peças ───────────── */

function Audit({ run }: { run: Run }) {
  const tip = useTooltip(`Finalidade: ${run.purpose}`, undefined, true, 'bottom');
  return <span className="tr-audit" tabIndex={0} {...tip}><Icon name="audit" size={14} />Consulta #{run.n} registrada</span>;
}
const isoLocal = (t: number) => { const d = new Date(t); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function Field({ label, hint, badge, count, onClear, refEl, children }: { label: string; hint?: string; badge?: string; count?: number; onClear?: () => void; refEl?: React.Ref<HTMLDivElement>; children: ReactNode }) {
  const tip = useTooltip(hint ?? '', undefined, !!hint && !!badge, 'top');
  return (
    <div className="tr-field" ref={refEl}>
      <div className="tr-field__head">
        <span className="tr-field__l">{label}</span>
        {badge && <span className="tr-badge" {...tip}>{badge}</span>}
        {hint && !badge && <span className="tr-field__h">{hint}</span>}
        <span className="dv-tools__sp" />
        {!!count && onClear && <button type="button" className="tr-link" onClick={onClear}>Limpar ({count})</button>}
      </div>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`tr-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>{on && <Icon name="check" size={12} />}{children}</button>;
}

function Swatches({ value, onChange, kind }: { value: Color[]; onChange: (v: Color[]) => void; kind: 'upper' | 'lower' }) {
  return (
    <div className="tr-sws" role="group" aria-label={kind === 'upper' ? 'Cores da roupa superior' : 'Cores da roupa inferior'}>
      {COLORS.filter((c) => kind === 'lower' || !c.lowerOnly).map((c) => <Swatch key={c.id} c={c} on={value.includes(c.id)} onClick={() => onChange(toggle(value, c.id))} />)}
    </div>
  );
}
function Swatch({ c, on, onClick }: { c: (typeof COLORS)[number]; on: boolean; onClick: () => void }) {
  const tip = useTooltip(c.label, undefined, true, 'top');
  return (
    <button type="button" className={`tr-sw${on ? ' is-on' : ''}${c.id === 'jeans' ? ' is-jeans' : ''}`} style={{ '--c': c.hex } as React.CSSProperties} aria-pressed={on} aria-label={c.label} {...tip} onClick={onClick}>
      <i />{on && <Icon name="check" size={12} />}
    </button>
  );
}

const TRI_ICON = {
  hat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M4 15a8 7 0 0 1 16 0z" /><path d="M20 15h2.5" strokeLinecap="round" /></svg>,
  glasses: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14h4M3 13 4.5 7M21 13l-1.5-6" strokeLinecap="round" /></svg>,
  backpack: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M6 10a6 6 0 0 1 12 0v10H6z" /><path d="M9 4.5V3h6v1.5M9 15h6" strokeLinecap="round" /></svg>,
};
function TriRow({ icon, label, value, onChange }: { icon: keyof typeof TRI_ICON; label: string; value: Tri; onChange: (v: Tri) => void }) {
  return (
    <div className="tr-tri">
      <span className="tr-tri__ic" aria-hidden="true">{TRI_ICON[icon]}</span>
      <span className="tr-tri__l">{label}</span>
      <Segmented<Tri> label={label} size="sm" value={value} onChange={onChange} options={[{ value: '', label: 'Tanto faz' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
    </div>
  );
}
export { TRI_ICON };

function Intro({ busy, recent, onExample, onRecent }: { busy: boolean; recent: Recent[]; onExample: (t: string) => void; onRecent: (r: Recent) => void }) {
  return (
    <div className={`tr-intro${busy ? ' is-busy' : ''}`}>
      <div className="tr-intro__art" aria-hidden="true">
        <Figure upper={['azul']} lower={['jeans']} backpack size="lg" />
        <Figure upper={['vermelho']} lower={['preto']} hat gender="M" size="lg" />
        <Figure upper={['branco']} lower={['bege']} glasses gender="F" extras={['bolsa']} size="lg" />
      </div>
      <h2>{busy ? 'Pesquisando nas câmeras…' : 'Descreva quem você procura'}</h2>
      <p>Combine gênero, idade, cores da roupa e acessórios. Cada consulta fica vinculada à finalidade declarada e entra na trilha de auditoria.</p>
      <div className="tr-intro__ex">
        <span>Experimente</span>
        {EXAMPLES.map((e) => <button key={e.text} type="button" className="tr-chip" onClick={() => onExample(e.text)}><Icon name="sparkle" size={12} />{e.label}</button>)}
      </div>
      {recent.length > 0 && (
        <div className="tr-intro__rec">
          <span>Buscas recentes</span>
          {recent.map((r) => <button key={r.label} type="button" className="tr-rec" onClick={() => onRecent(r)}><Icon name="clock" size={14} /><span>{r.label}</span><Icon name="arrowRight" size={14} /></button>)}
        </div>
      )}
      <Alert type="information" className="tr-intro__note" title="Estes registros descrevem, não identificam">
        Quem a pessoa é vem do reconhecimento facial, que é outra tela. Aqui você encontra pessoas vistas pelas câmeras a partir da aparência.
      </Alert>
    </div>
  );
}

function fmtBucket(b: { from: number; to: number }, period: Filters['period']) {
  const d = new Date(b.from);
  const hm = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (period === '1h' || period === '24h') return `${hm(b.from)}–${hm(b.to)}`;
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} ${hm(b.from)}–${hm(b.to)}`;
}

function Timeline({ buckets, sel, onSel, period }: { buckets: { from: number; to: number; n: number }[]; sel: number | null; onSel: (i: number) => void; period: Filters['period'] }) {
  const max = Math.max(1, ...buckets.map((b) => b.n));
  const ticks = period === '7d' ? buckets.map((b, i) => (i % 4 === 0 ? new Date(b.from).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }) : null))
    : buckets.map((b, i) => (i % (period === '1h' ? 3 : period === '24h' ? 4 : 6) === 0 ? new Date(b.from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null));
  return (
    <div className="tr-tl" role="group" aria-label="Distribuição no tempo">
      <div className="tr-tl__bars">
        {buckets.map((b, i) => <Bar key={i} b={b} h={b.n / max} on={sel === i} dim={sel != null && sel !== i} label={fmtBucket(b, period)} onClick={() => b.n && onSel(i)} />)}
      </div>
      <div className="tr-tl__axis">{ticks.map((t, i) => <span key={i}>{t}</span>)}</div>
    </div>
  );
}
function Bar({ b, h, on, dim, label, onClick }: { b: { n: number }; h: number; on: boolean; dim: boolean; label: string; onClick: () => void }) {
  const tip = useTooltip(`${label} · ${b.n} ${b.n === 1 ? 'observação' : 'observações'}`, undefined, true, 'top');
  return (
    <button type="button" className={`tr-bar${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}${b.n ? '' : ' is-zero'}`} onClick={onClick} aria-label={`${label}: ${b.n}`} {...tip}>
      <i style={{ height: `${Math.max(b.n ? 8 : 2, h * 100)}%` }} />
    </button>
  );
}

function Card({ o, n = 1, f, now, on, miss, onOpen }: { o: Obs; n?: number; f: Filters; now: number; on: boolean; miss?: TraitKey; onOpen: () => void }) {
  const tip = useTooltip(`Vista ${n} vezes com esta descrição no recorte`, undefined, n > 1, 'top');
  const cam = camOf(o.src);
  const sc = score(o, f);
  return (
    <button type="button" className={`tr-card${on ? ' is-on' : ''}${miss ? ' is-near' : ''}${n > 1 ? ' is-stack' : ''}`} onClick={onOpen} aria-label={`${GENDER_LABEL[o.gender]}, ${o.age} anos, ${camName(o.src)}, ${when(o.at, now)}`}>
      <span className="tr-card__img">
        <FaceImg seed={o.seed} night={cam.night} />
        <span className="fc-det">{sc}%</span>
        {n > 1 && <span className="tr-stack" {...tip}><Icon name="stack" size={12} />{n}×</span>}
        <span className="tr-card__fig"><Figure size="sm" upper={[o.upper]} lower={[o.lower]} gender={o.gender} hat={o.hat} glasses={o.glasses} backpack={o.backpack} extras={o.extras} /></span>
        {miss && <span className="tr-miss"><Icon name="warn" size={12} />{obsTrait(o, miss)}</span>}
      </span>
      <span className="tr-card__body">
        <b>{GENDER_LABEL[o.gender]} · {o.age}</b>
        <span className="tr-card__wear">
          <i style={{ background: COLOR[o.upper].hex }} />{COLOR[o.upper].label}
          <span>/</span>
          <i style={{ background: COLOR[o.lower].hex }} />{COLOR[o.lower].label}
          {(o.backpack || o.hat || o.glasses) && <span className="tr-card__acc">{o.hat && TRI_ICON.hat}{o.glasses && TRI_ICON.glasses}{o.backpack && TRI_ICON.backpack}</span>}
        </span>
        <span className="tr-card__meta"><span className={cam.name ? undefined : 'is-id'}>{camName(o.src)}</span><time>{when(o.at, now)}</time></span>
      </span>
    </button>
  );
}

function PurposeModal({ initial, onOk, onCancel }: { initial: string; onOk: (p: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const recent = readPurposes();
  const ok = () => {
    const t = v.trim();
    if (t.length < 3) { setErr('Informe uma finalidade com pelo menos 3 caracteres antes de pesquisar.'); return; }
    if (t.length > 500) { setErr('A finalidade deve ter no máximo 500 caracteres.'); return; }
    onOk(t);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onCancel]);
  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <form className="nx-smodal tr-pm is-information" role="dialog" aria-modal="true" aria-labelledby="tr-pm-t" onSubmit={(e) => { e.preventDefault(); ok(); }}>
        <div className="nx-smodal__body">
          <span className="nx-smodal__ic"><Icon name="lock" size={20} /></span>
          <div className="nx-smodal__text">
            <h2 id="tr-pm-t">Finalidade da consulta</h2>
            <p>Descreva o caso ou a razão operacional. Esta informação será registrada na trilha de auditoria.</p>
          </div>
        </div>
        <div className="tr-pm__in">
          <textarea className={`nx-textarea${err ? ' is-err' : ''}`} autoFocus value={v} maxLength={500} rows={3} placeholder="Ex.: apuração do incidente 42 no acesso norte"
            onChange={(e) => { setV(e.target.value); setErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ok(); } }} />
          <div className="tr-pm__meta">{err ? <span className="tr-err" role="alert">{err}</span> : <span>Vale para as próximas consultas desta tela.</span>}<em>{v.length}/500</em></div>
          {recent.length > 0 && (
            <div className="tr-pm__rec">
              <span>Recentes</span>
              {recent.map((r) => <button key={r} type="button" className="tr-chip" onClick={() => { setV(r); setErr(''); }}>{r}</button>)}
            </div>
          )}
        </div>
        <div className="nx-smodal__foot">
          <span className="nx-smodal__sp" />
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" icon="search" type="submit">Pesquisar</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
