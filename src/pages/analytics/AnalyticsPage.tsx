import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Checkbox, Icon, IconButton, Menu, NavItem, PageHeader, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { FilterToggle } from '../devices/tableModel';
import { CameraSettings } from '../devices/CameraSettings';
import { A_LOCAIS, ACAMS, ANALYTICS, BY_K, GROUPS, initialConfig, LICENSE, offline, PROFILES, type ACam } from './data';
import '../devices/devices.css';
import '../watchlists/watchlists.css';
import './analytics.css';

type Cfg = Record<string, string[]>;
type Quick = 'all' | 'ia' | 'wall' | 'parada';
type Tri = 'on' | 'off' | 'mixed';
type BulkMenu = { kind: 'on' | 'off' | 'modelo'; el: HTMLElement } | null;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const triOf = (ids: string[], k: string, cfg: Cfg): Tri => {
  const n = ids.filter((id) => cfg[id].includes(k)).length;
  return n === 0 ? 'off' : n === ids.length ? 'on' : 'mixed';
};
const diffCount = (a: Cfg, b: Cfg) => {
  let changes = 0; const cams = new Set<string>();
  for (const id of Object.keys(a)) {
    const x = new Set(a[id]); const y = new Set(b[id]);
    for (const k of ANALYTICS.map((v) => v.k)) if (x.has(k) !== y.has(k)) { changes++; cams.add(id); }
  }
  return { changes, cams: cams.size };
};

/**
 * Analíticos por câmera: o admin marca o que a IA analisa em cada câmera.
 * Mesmo padrão de tabela das listagens, em matriz: câmeras agrupadas por local nas linhas, analíticos nas colunas.
 * Em massa: caixa no cabeçalho da coluna (todas as exibidas), caixa na linha do local (todas do local)
 * e barra de selecionadas (ligar, desligar, aplicar modelo, colar de outra câmera). Tudo fica em rascunho até salvar.
 */
export function AnalyticsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [saved, setSaved] = useState<Cfg>(initialConfig);
  const [cfg, setCfg] = useState<Cfg>(saved);
  const [hist, setHist] = useState<Cfg[]>([]);
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [locs, setLocs] = useState<string[]>([]);
  const [onlyK, setOnlyK] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [shut, setShut] = useState<Set<string>>(new Set());
  const [colMenu, setColMenu] = useState<{ k: string; el: HTMLElement } | null>(null);
  const [bulk, setBulk] = useState<BulkMenu>(null);
  const [rowMenu, setRowMenu] = useState<{ id: string; el: HTMLElement } | null>(null);
  const [fMenu, setFMenu] = useState<{ key: 'sit' | 'local' | 'an'; el: HTMLElement } | null>(null);
  const [showF, setShowF] = useState(false);
  const [clip, setClip] = useState<{ id: string; ks: string[] } | null>(null);
  const [cs, setCs] = useState<ACam | null>(null);

  /* ── filtros ── */
  const nq = norm(q.trim());
  const base = ACAMS.filter((c) => (!nq || norm(`${c.name} ${c.local} ${c.area} ${c.camType}`).includes(nq))
    && (!locs.length || locs.includes(c.local)) && (!onlyK || cfg[c.id].includes(onlyK)));
  const quickOk = (c: ACam, k: Quick) => k === 'all' || (k === 'ia' ? cfg[c.id].length > 0 : k === 'wall' ? cfg[c.id].length === 0 : cfg[c.id].length > 0 && offline(c));
  const rows = base.filter((c) => quickOk(c, quick));
  const ids = rows.map((c) => c.id);
  const groups = A_LOCAIS.map((l) => ({ local: l, cams: rows.filter((c) => c.local === l) })).filter((g) => g.cams.length);
  const anyFilter = !!nq || locs.length > 0 || !!onlyK || quick !== 'all';

  /* ── edição em rascunho, com desfazer ── */
  const commit = (next: Cfg) => { setHist((h) => [...h.slice(-49), cfg]); setCfg(next); };
  const setMany = (camIds: string[], k: string, on: boolean) => {
    const next = { ...cfg };
    camIds.forEach((id) => { const s = new Set(next[id]); if (on) s.add(k); else s.delete(k); next[id] = ANALYTICS.map((a) => a.k).filter((x) => s.has(x)); });
    commit(next);
  };
  const replaceMany = (camIds: string[], ks: string[]) => { const next = { ...cfg }; camIds.forEach((id) => { next[id] = [...ks]; }); commit(next); };
  const undo = () => { if (!hist.length) return; setCfg(hist[hist.length - 1]); setHist((h) => h.slice(0, -1)); };
  const discard = () => { setHist([]); setCfg(saved); toast('Alterações descartadas'); };

  const { changes, cams: changedCams } = useMemo(() => diffCount(saved, cfg), [saved, cfg]);
  const dirty = changes > 0;
  const use = (k: 'face' | 'placa') => ACAMS.filter((c) => cfg[c.id].includes(k)).length;
  const over = (['face', 'placa'] as const).filter((k) => use(k) > LICENSE[k]);
  const save = () => {
    if (over.length) { toast(`Licenças insuficientes para ${over.map((k) => BY_K[k].short.toLowerCase()).join(' e ')}. Desligue algumas câmeras antes de salvar.`); return; }
    setSaved(cfg); setHist([]); toast(`Analíticos salvos em ${plural(changedCams, 'câmera', 'câmeras')}. A IA aplica em até 1 min.`);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target as HTMLElement).closest('input, textarea')) { e.preventDefault(); undo(); }
      if (e.key === 'Escape' && !document.querySelector('.nx-menu') && !cs) setSel(new Set());
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  /* ── seleção ── */
  const toggleSel = (list: string[], on: boolean) => setSel((s) => { const n = new Set(s); list.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  const selIds = [...sel];
  const allSel: Tri = ids.length && ids.every((id) => sel.has(id)) ? 'on' : ids.some((id) => sel.has(id)) ? 'mixed' : 'off';

  /* ── resumo ── */
  const nIa = ACAMS.filter((c) => cfg[c.id].length).length;
  const nParada = ACAMS.filter((c) => cfg[c.id].length && offline(c)).length;
  const cards: { k: Quick; label: string; icon: IconName; tone: string; n: number; hint: string }[] = [
    { k: 'all', label: 'Câmeras', icon: 'camera', tone: 'neutral', n: ACAMS.length, hint: 'Todas as câmeras cadastradas em Dispositivos' },
    { k: 'ia', label: 'Com analíticos', icon: 'sparkle', tone: 'ok', n: nIa, hint: 'A IA analisa ao menos um item nestas câmeras' },
    { k: 'wall', label: 'Só no mural', icon: 'tv', tone: 'neutral', n: ACAMS.length - nIa, hint: 'Sem nenhuma marca: a câmera fica só no mural de vídeo, sem IA' },
    { k: 'parada', label: 'IA parada', icon: 'nosignal', tone: 'bad', n: nParada, hint: 'Têm analíticos, mas estão sem sinal ou em manutenção. A IA retoma quando a imagem voltar' },
  ];

  const colTip = (k: string, t: Tri) => `${t === 'on' ? 'Desligar' : 'Ligar'} ${BY_K[k].short.toLowerCase()} ${rows.length === ACAMS.length ? 'em todas as câmeras' : `nas ${plural(rows.length, 'câmera exibida', 'câmeras exibidas')}`}`;
  const nF = [quick !== 'all', locs.length > 0, !!onlyK].filter(Boolean).length;
  const fLabel = (key: 'sit' | 'local' | 'an') => key === 'sit' ? (quick === 'all' ? 'todas' : cards.find((c) => c.k === quick)!.label) : key === 'local' ? (locs.length === 0 ? 'todos' : locs.length === 1 ? locs[0] : `${locs.length} selecionados`) : (onlyK ? BY_K[onlyK].short : 'qualquer');

  return (
    <div className="dv wl ac">
      <div className="dv-main">
        <PageHeader title={screen.label} icon="sparkle" description="O que a IA analisa em cada câmera. Marque uma a uma, por local ou em todas de uma vez."
          actions={<>
            {dirty && <Button onClick={discard}>Descartar</Button>}
            <Button variant="primary" icon="check" disabled={!dirty} onClick={save}>{dirty ? `Salvar ${plural(changes, 'alteração', 'alterações')}` : 'Salvar'}</Button>
          </>} />

        <div className="dv-body">
          {over.length > 0 && (
            <Alert type="error" title="Mais câmeras do que licenças">
              {over.map((k) => `${BY_K[k].short} está marcado em ${use(k)} câmeras e a licença cobre ${LICENSE[k]}`).join('. ')}. Desligue o excedente ou amplie a licença para salvar.
            </Alert>
          )}

          <section className="dv-tcard is-t2 ac-card" aria-label="Analíticos por câmera">
            <div className="dv-tools">
              <span className="wl-title"><b>{rows.length}</b> {rows.length === 1 ? 'câmera' : 'câmeras'}</span>
              <span className="ac-lics" aria-label="Licenças em uso">
                {(['face', 'placa'] as const).map((k) => <Lic key={k} label={BY_K[k].short} value={use(k)} total={LICENSE[k]} />)}
              </span>
              <span className="dv-tools__sp" />
              <label className="nx-input dv-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar câmera ou local" aria-label="Buscar câmeras"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); } }} />
                {q ? <button type="button" className="dv-search__x" aria-label="Limpar busca" onClick={() => setQ('')}><Icon name="close" size={14} /></button> : null}
              </label>
              <FilterToggle on={showF} count={nF} onClick={() => setShowF((v) => !v)} />
            </div>

            {showF && <div className="dv-filters" role="group" aria-label="Filtros">
              {(['sit', 'local', 'an'] as const).map((key) => {
                const on = key === 'sit' ? quick !== 'all' : key === 'local' ? locs.length > 0 : !!onlyK;
                return (
                  <button key={key} type="button" className={`dv-fdrop${on ? ' is-on' : ''}${fMenu?.key === key ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={fMenu?.key === key}
                    onClick={(e) => setFMenu(fMenu?.key === key ? null : { key, el: e.currentTarget })}>
                    <span className="dv-fdrop__k">{key === 'sit' ? 'Situação' : key === 'local' ? 'Local' : 'Analítico'}:</span>
                    <span className="dv-fdrop__v">{fLabel(key)}</span>
                    <Icon name="chevron" size={14} />
                  </button>
                );
              })}
            </div>}

            {anyFilter && (
              <div className="dv-chips">
                <span className="dv-chips__n"><b>{rows.length}</b> de {ACAMS.length}</span>
                {quick !== 'all' && <Chip onRemove={() => setQuick('all')}>{cards.find((c) => c.k === quick)!.label}</Chip>}
                {q.trim() && <Chip onRemove={() => setQ('')}>“{q.trim()}”</Chip>}
                {locs.map((l) => <Chip key={l} onRemove={() => setLocs(locs.filter((x) => x !== l))}><span className="dv-chip__k">Local:</span> {l}</Chip>)}
                {onlyK && <Chip onRemove={() => setOnlyK(null)}><span className="dv-chip__k">Analítico:</span> {BY_K[onlyK].short}</Chip>}
                <button type="button" className="dv-chips__clear" onClick={() => { setQ(''); setLocs([]); setOnlyK(null); setQuick('all'); }}>Limpar filtros</button>
                <span className="ac-chips__note">As caixas do cabeçalho agem só nas câmeras exibidas.</span>
              </div>
            )}

            <div className="ac-scroll">
              <div className="ac-table" role="table" aria-label="Analíticos por câmera" aria-rowcount={rows.length + 2}>
                {/* faixa de grupos */}
                <div className="ac-tr ac-gh" role="row">
                  <span className="ac-c ac-c--chk ac-stick" />
                  <span className="ac-c ac-c--name ac-stick" />
                  {GROUPS.map((g) => (
                    <span key={g.id} role="columnheader" className="ac-c ac-gh__g" style={{ gridColumn: `span ${ANALYTICS.filter((a) => a.group === g.id).length}` }}>{g.label}</span>
                  ))}
                  <span className="ac-c" />
                </div>

                {/* cabeçalho das colunas: nome (menu) + caixa que liga/desliga em todas as exibidas */}
                <div className="ac-tr ac-th" role="row">
                  <span className="ac-c ac-c--chk ac-stick" role="columnheader">
                    <Checkbox label="Selecionar todas as câmeras exibidas" checked={allSel === 'on'} indeterminate={allSel === 'mixed'} onChange={() => toggleSel(ids, allSel !== 'on')} />
                  </span>
                  <span className="ac-c ac-c--name ac-stick" role="columnheader"><span className="ac-th__cam">Câmera</span><span className="ac-th__hint">Ligar em todas</span><Icon name="arrowRight" size={14} /></span>
                  {ANALYTICS.map((a, i) => {
                    const t = triOf(ids, a.k, cfg);
                    const n = ids.filter((id) => cfg[id].includes(a.k)).length;
                    const first = i === 0 || ANALYTICS[i - 1].group !== a.group;
                    return (
                      <span key={a.k} role="columnheader" className={`ac-c ac-c--an${first ? ' is-gstart' : ''}${onlyK === a.k ? ' is-filter' : ''}`}>
                        <ColHead a={a.k} n={n} total={ids.length} open={colMenu?.k === a.k} onOpen={(el) => setColMenu(colMenu?.k === a.k ? null : { k: a.k, el })} />
                        <Cell tri={t} big tip={colTip(a.k, t)} disabled={!ids.length} onClick={() => setMany(ids, a.k, t !== 'on')} />
                      </span>
                    );
                  })}
                  <span className="ac-c ac-c--act" role="columnheader"><span className="nx-sr">Ações</span></span>
                </div>

                {groups.map((g) => {
                  const gIds = g.cams.map((c) => c.id);
                  const closed = shut.has(g.local);
                  const gSel: Tri = gIds.every((id) => sel.has(id)) ? 'on' : gIds.some((id) => sel.has(id)) ? 'mixed' : 'off';
                  const gIa = gIds.filter((id) => cfg[id].length).length;
                  return (
                    <Fragment key={g.local}>
                      <div className="ac-tr ac-grp" role="row">
                        <span className="ac-c ac-c--chk ac-stick" role="cell"><Checkbox label={`Selecionar câmeras de ${g.local}`} checked={gSel === 'on'} indeterminate={gSel === 'mixed'} onChange={() => toggleSel(gIds, gSel !== 'on')} /></span>
                        <span className="ac-c ac-c--name ac-stick" role="rowheader">
                          <button type="button" className="ac-grp__btn" aria-expanded={!closed} onClick={() => setShut((s) => { const n = new Set(s); if (closed) n.delete(g.local); else n.add(g.local); return n; })}>
                            <Icon name="chevron" size={14} className={closed ? 'is-closed' : undefined} />
                            <b>{g.local}</b>
                            <span>{plural(g.cams.length, 'câmera', 'câmeras')} · {gIa} com IA</span>
                          </button>
                        </span>
                        {ANALYTICS.map((a, i) => {
                          const t = triOf(gIds, a.k, cfg);
                          return (
                            <span key={a.k} role="cell" className={`ac-c ac-c--an${i === 0 || ANALYTICS[i - 1].group !== a.group ? ' is-gstart' : ''}`}>
                              <Cell tri={t} tip={`${t === 'on' ? 'Desligar' : 'Ligar'} ${a.short.toLowerCase()} em ${g.local} (${plural(gIds.length, 'câmera', 'câmeras')})`} onClick={() => setMany(gIds, a.k, t !== 'on')} />
                            </span>
                          );
                        })}
                        <span className="ac-c ac-c--act" role="cell" />
                      </div>

                      {!closed && g.cams.map((c) => {
                        const mine = cfg[c.id];
                        const off = offline(c);
                        return (
                          <div key={c.id} role="row" className={`ac-tr ac-row${sel.has(c.id) ? ' is-sel' : ''}${off ? ' is-off' : ''}`}>
                            <span className="ac-c ac-c--chk ac-stick" role="cell"><Checkbox label={`Selecionar ${c.name}`} checked={sel.has(c.id)} onChange={(v) => toggleSel([c.id], v)} /></span>
                            <span className="ac-c ac-c--name ac-stick" role="rowheader">
                              <span className="dv-name">
                                <b>{c.name.replace(`${c.local} · `, '')}</b>
                                <span className="ac-sub">
                                  <span className={`ac-dot is-${off ? (c.situacao === 'manutencao' ? 'maint' : 'off') : c.conn === 'instavel' ? 'warn' : 'on'}`} />
                                  {off ? (c.situacao === 'manutencao' ? 'Em manutenção' : 'Sem sinal') : c.camType}
                                  <i>·</i>
                                  {mine.length === 0 ? 'Só no mural' : c.zones || c.lines ? [c.zones && plural(c.zones, 'zona', 'zonas'), c.lines && plural(c.lines, 'linha', 'linhas')].filter(Boolean).join(', ') : 'Imagem inteira'}
                                </span>
                              </span>
                            </span>
                            {ANALYTICS.map((a, i) => {
                              const on = mine.includes(a.k);
                              const was = saved[c.id].includes(a.k);
                              return (
                                <span key={a.k} role="cell" className={`ac-c ac-c--an${i === 0 || ANALYTICS[i - 1].group !== a.group ? ' is-gstart' : ''}`}>
                                  <Cell tri={on ? 'on' : 'off'} dirty={on !== was} label={`${a.label} em ${c.name}`} onClick={() => setMany([c.id], a.k, !on)} />
                                </span>
                              );
                            })}
                            <span className="ac-c ac-c--act" role="cell">
                              <IconButton icon="sliders" label="Regras e zonas" onClick={() => setCs(c)} tipPlace="top" />
                              <IconButton icon="more" label="Mais ações" onClick={(e) => setRowMenu(rowMenu?.id === c.id ? null : { id: c.id, el: e.currentTarget })} tipPlace="top" />
                            </span>
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}

                {rows.length === 0 && (
                  <div className="dv-empty">
                    <span className="dv-empty__ic"><Icon name="search" /></span>
                    <b>Nenhuma câmera encontrada</b>
                    <span>Revise a busca ou os filtros aplicados.</span>
                    <Button onClick={() => { setQ(''); setLocs([]); setOnlyK(null); setQuick('all'); }}>Limpar filtros</Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="dv-foot ac-foot">
          {dirty ? (
            <>
              <span className="ac-foot__dirty"><i />{plural(changes, 'alteração', 'alterações')} em {plural(changedCams, 'câmera', 'câmeras')}, ainda não salvas</span>
              <span className="dv-tools__sp" />
              <Button icon="replay" disabled={!hist.length} onClick={undo}>Desfazer</Button>
            </>
          ) : (
            <span className="ac-foot__note"><Icon name="infoFill" size={14} /><span>Um analítico novo vale para a imagem inteira até você desenhar zona ou linha em Regras e zonas. Facial e placa puxam o vídeo em resolução cheia o tempo todo.</span></span>
          )}
        </footer>

        {sel.size > 0 && (
          <div className="dv-bulk" role="toolbar" aria-label="Ações para as câmeras selecionadas">
            <span className="dv-bulk__n"><b>{sel.size}</b> {sel.size === 1 ? 'selecionada' : 'selecionadas'}</span>
            <span className="dv-bulk__sep" />
            <Button icon="plus" onClick={(e) => setBulk({ kind: 'on', el: e.currentTarget })}>Ligar</Button>
            <Button icon="close" onClick={(e) => setBulk({ kind: 'off', el: e.currentTarget })}>Desligar</Button>
            <Button icon="stack" onClick={(e) => setBulk({ kind: 'modelo', el: e.currentTarget })}>Aplicar modelo</Button>
            {clip && <Button icon="copy" onClick={() => { replaceMany(selIds, clip.ks); toast(`Analíticos de ${ACAMS.find((c) => c.id === clip.id)!.name} colados em ${plural(sel.size, 'câmera', 'câmeras')}`); }}>Colar de {ACAMS.find((c) => c.id === clip.id)!.name.replace(/^.* · /, '')}</Button>}
            <Button icon="tv" onClick={() => { replaceMany(selIds, []); toast(`${plural(sel.size, 'câmera fica', 'câmeras ficam')} só no mural`); }}>Só no mural</Button>
            <span className="dv-bulk__sep" />
            <IconButton icon="close" label="Limpar seleção" shortcut="Esc" onClick={() => setSel(new Set())} tipPlace="top" />
          </div>
        )}
      </div>

      {/* menu da coluna */}
      {colMenu && (() => {
        const a = BY_K[colMenu.k];
        const n = ids.filter((id) => cfg[id].includes(a.k)).length;
        const close = (fn: () => void) => () => { setColMenu(null); fn(); };
        const scope = rows.length === ACAMS.length ? 'todas as câmeras' : `as ${rows.length} exibidas`;
        return (
          <Menu anchor={colMenu.el} align="left" onClose={() => setColMenu(null)} className="ac-cmenu">
            <div className="ac-cmenu__head">
              <span className="ac-cmenu__ic"><Icon name={a.icon} size={16} /></span>
              <div><b>{a.label}</b><p>{a.desc}</p></div>
            </div>
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="check" label={`Ligar em ${scope}`} onClick={close(() => { setMany(ids, a.k, true); toast(`${a.short} ligado em ${plural(ids.length, 'câmera', 'câmeras')}`); })} />
            <NavItem role="menuitem" icon="close" label={`Desligar em ${scope}`} onClick={close(() => { setMany(ids, a.k, false); toast(`${a.short} desligado em ${plural(ids.length, 'câmera', 'câmeras')}`); })} />
            {sel.size > 0 && <NavItem role="menuitem" icon="check" label={`Ligar nas ${plural(sel.size, 'selecionada', 'selecionadas')}`} onClick={close(() => setMany(selIds, a.k, true))} />}
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="filter" label={onlyK === a.k ? 'Mostrar todas as câmeras' : `Ver só câmeras com ${a.short.toLowerCase()} (${n})`} onClick={close(() => setOnlyK(onlyK === a.k ? null : a.k))} />
          </Menu>
        );
      })()}

      {/* menus da barra de selecionadas */}
      {bulk && (
        <Menu anchor={bulk.el} align="left" onClose={() => setBulk(null)} className="ac-bmenu">
          {bulk.kind === 'modelo' ? (
            <>
              <div className="nx-menu__title">Modelo para {plural(sel.size, 'câmera', 'câmeras')}</div>
              <div className="ac-bmenu__hint">Substitui o que elas analisam hoje.</div>
              {PROFILES.map((p) => (
                <button key={p.id} type="button" role="menuitem" className="ac-prof" onClick={() => { replaceMany(selIds, p.ks); setBulk(null); toast(`Modelo “${p.label}” aplicado em ${plural(sel.size, 'câmera', 'câmeras')}`); }}>
                  <b>{p.label}</b><span>{p.hint}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="nx-menu__title">{bulk.kind === 'on' ? 'Ligar' : 'Desligar'} em {plural(sel.size, 'câmera', 'câmeras')}</div>
              {GROUPS.map((g) => (
                <Fragment key={g.id}>
                  <div className="ac-bmenu__g">{g.label}</div>
                  {ANALYTICS.filter((a) => a.group === g.id).map((a) => {
                    const n = selIds.filter((id) => cfg[id].includes(a.k)).length;
                    return (
                      <button key={a.k} type="button" role="menuitem" className="nx-item ac-bmenu__i" onClick={() => { setMany(selIds, a.k, bulk.kind === 'on'); toast(`${a.short} ${bulk.kind === 'on' ? 'ligado' : 'desligado'} em ${plural(sel.size, 'câmera', 'câmeras')}`); }}>
                        <Icon name={a.icon} size={16} className="nx-item__ic" />
                        <span className="nx-item__lbl">{a.label}</span>
                        <span className="ac-bmenu__n">{n}/{sel.size}</span>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </>
          )}
        </Menu>
      )}

      {/* filtros */}
      {fMenu && (
        <Menu anchor={fMenu.el} align="left" onClose={() => setFMenu(null)} className="dv-fmenu">
          <div className="dv-fmenu__body">
            {fMenu.key === 'sit' ? (
              <>
                <div className="nx-menu__title">Situação</div>
                {cards.map((c) => (
                  <Checkbox key={c.k} label={c.label} checked={quick === c.k} onChange={() => { setQuick(quick === c.k ? 'all' : c.k); }}>
                    <span className="dv-fmenu__l">{c.k === 'all' ? 'Todas as câmeras' : c.label}</span><span className="dv-fmenu__n">{c.n}</span>
                  </Checkbox>
                ))}
              </>
            ) : fMenu.key === 'local' ? (
              <>
                <div className="nx-menu__title">Local</div>
                {A_LOCAIS.map((l) => (
                  <Checkbox key={l} label={l} checked={locs.includes(l)} onChange={() => setLocs(locs.includes(l) ? locs.filter((x) => x !== l) : [...locs, l])}>
                    <span className="dv-fmenu__l">{l}</span><span className="dv-fmenu__n">{ACAMS.filter((c) => c.local === l).length}</span>
                  </Checkbox>
                ))}
              </>
            ) : (
              <>
                <div className="nx-menu__title">Câmeras com o analítico</div>
                {ANALYTICS.map((a) => (
                  <Checkbox key={a.k} label={a.label} checked={onlyK === a.k} onChange={() => setOnlyK(onlyK === a.k ? null : a.k)}>
                    <span className="dv-fmenu__l">{a.label}</span><span className="dv-fmenu__n">{ACAMS.filter((c) => cfg[c.id].includes(a.k)).length}</span>
                  </Checkbox>
                ))}
              </>
            )}
          </div>
          <div className="dv-fmenu__foot">
            <Button disabled={fMenu.key === 'sit' ? quick === 'all' : fMenu.key === 'local' ? !locs.length : !onlyK} onClick={() => (fMenu.key === 'sit' ? setQuick('all') : fMenu.key === 'local' ? setLocs([]) : setOnlyK(null))}>Limpar</Button>
            <Button variant="primary" onClick={() => setFMenu(null)}>Ver {rows.length}</Button>
          </div>
        </Menu>
      )}

      {/* menu da linha */}
      {rowMenu && (() => {
        const c = ACAMS.find((x) => x.id === rowMenu.id)!;
        const same = ACAMS.filter((x) => x.local === c.local).map((x) => x.id);
        const close = (fn: () => void) => () => { setRowMenu(null); fn(); };
        return (
          <Menu anchor={rowMenu.el} onClose={() => setRowMenu(null)}>
            <NavItem role="menuitem" icon="sliders" label="Regras e zonas" onClick={close(() => setCs(c))} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="copy" label="Copiar analíticos" onClick={close(() => { setClip({ id: c.id, ks: cfg[c.id] }); toast('Analíticos copiados. Selecione câmeras e use Colar.'); })} />
            {clip && clip.id !== c.id && <NavItem role="menuitem" icon="copy" label="Colar analíticos" onClick={close(() => replaceMany([c.id], clip.ks))} />}
            <NavItem role="menuitem" icon="stack" label={`Usar em todo o ${c.local}`} onClick={close(() => { replaceMany(same, cfg[c.id]); toast(`Mesmos analíticos em ${plural(same.length, 'câmera', 'câmeras')} de ${c.local}`); })} />
            <div className="nx-menu__sep" />
            <NavItem role="menuitem" icon="tv" label="Deixar só no mural" onClick={close(() => replaceMany([c.id], []))} />
          </Menu>
        );
      })()}

      {cs && <CameraSettings d={cs} onClose={() => setCs(null)} />}
    </div>
  );
}

/** Caixa da matriz: verde quando ligado; traço quando só parte do grupo tem; ponto quando mudou e não foi salvo. */
function Cell({ tri, dirty, big, tip, label, disabled, onClick }: { tri: Tri; dirty?: boolean; big?: boolean; tip?: string; label?: string; disabled?: boolean; onClick: () => void }) {
  const t = useTooltip(tip ?? '', undefined, true, 'top');
  return (
    <button type="button" role="checkbox" aria-checked={tri === 'mixed' ? 'mixed' : tri === 'on'} aria-label={label ?? tip} disabled={disabled}
      className={`ac-cell is-${tri}${dirty ? ' is-dirty' : ''}${big ? ' is-big' : ''}`} onClick={onClick} {...(tip ? t : {})}>
      <span className="ac-cell__box">{tri === 'on' ? <Icon name="check" size={12} /> : tri === 'mixed' ? <i /> : null}</span>
    </button>
  );
}

function ColHead({ a, n, total, open, onOpen }: { a: string; n: number; total: number; open: boolean; onOpen: (el: HTMLElement) => void }) {
  const an = BY_K[a];
  const t = useTooltip(an.label, undefined, true, 'top');
  return (
    <button type="button" className={`ac-ch${open ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={open} onClick={(e) => onOpen(e.currentTarget)} {...t}>
      <Icon name={an.icon} size={16} />
      <span className="ac-ch__l">{an.short}</span>
      <span className={`ac-ch__n${n ? ' is-on' : ''}`}>{n}<small>/{total}</small></span>
    </button>
  );
}

/** Licença em uso, compacta, ao lado do total da lista. Vermelha quando passa do contratado. */
function Lic({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const tone = value > total ? 'bad' : pct >= 90 ? 'warn' : 'ok';
  const tip = useTooltip(value > total ? `${value - total} câmeras acima da licença de ${label.toLowerCase()}` : `${total - value} licenças de ${label.toLowerCase()} livres`, undefined, true, 'bottom');
  return (
    <span className={`ac-lic is-${tone}`} {...tip}>
      <span>Licenças de {label.toLowerCase()}</span>
      <b>{value}<small>/{total}</small></b>
      <span className="ac-lic__bar" role="progressbar" aria-label={`Licenças de ${label.toLowerCase()}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}><i style={{ width: `${Math.min(100, pct)}%` }} /></span>
    </span>
  );
}
function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}
