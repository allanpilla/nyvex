import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, DateTimePicker, Icon, IconButton, Segmented } from '../../ds/components';
import { storage } from '../../lib/storage';
import { Figure } from './Figure';
import { Vehicle } from './Vehicle';
import { PHOTO_TYPES, readPhoto, type PhotoRead } from './photo';
import { brandsOf, hasPlate, modelsOf, runVehicleSearch, VCOLOR, VCOLORS, vDescribe, VEMPTY, vIsSet, vLabel, vTraits, VTYPES, type VFilters, type VKey, type VObs } from './vehicles';
import { Chip, describe, Field, isoLocal, PERIOD_LABEL, Swatch, Swatches, toggle, TriRow } from './parts';
import {
  AGES, BOTTOMS, COLOR, colorBg, EMPTY, TOPS, EXTRAS, GENDER_LABEL, isSet, LOCAIS, MOODS, nTraits, runSearch, traitLabel,
  type Filters, type Obs, type TraitKey,
} from './data';

const STEPS_P = ['Pessoa', 'Roupas', 'Acessórios', 'Onde e quando', 'Finalidade'];
const STEPS_V = ['Veículo', 'Cor e placa', 'Onde e quando', 'Finalidade'];
export type Kind = 'pessoa' | 'veiculo';
const readPurposes = (): string[] => { try { return JSON.parse(storage.get('nx-traits-purposes') ?? '[]'); } catch { return []; } };

type Props = { initial?: Filters; initialV?: VFilters; initialPhoto?: string; startKind?: Kind; startPhoto?: boolean; all: Obs[]; allV: VObs[]; onClose: () => void; onSearch: (f: Filters, purpose: string, vf?: VFilters, photo?: string) => void };

/**
 * Nova busca em etapas, de pessoa ou de veículo, com o retrato ao lado e uma prévia de quantos registros batem.
 * Onde e quando ficam em `f` nos dois modos; no veículo, são copiados para `vf` ao pesquisar.
 */
export function NewSearch({ initial, initialV, initialPhoto, startKind, startPhoto, all, allV, onClose, onSearch }: Props) {
  const editing = !!(initial || initialV);
  const [kind, setKind] = useState<Kind>(initialV ? 'veiculo' : startKind ?? 'pessoa');
  const STEPS = kind === 'veiculo' ? STEPS_V : STEPS_P;
  const [f, setF] = useState<Filters>(initial ?? (initialV ? { ...EMPTY, locais: initialV.locais, period: initialV.period, from: initialV.from, to: initialV.to } : EMPTY));
  const [vf, setVf] = useState<VFilters>(initialV ?? VEMPTY);
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(editing ? STEPS.length - 1 : 0);
  const [purpose, setPurpose] = useState('');
  const [tried, setTried] = useState(false);
  // Foto anexada: o motor lê e preenche as características; a pessoa só confere.
  const [photo, setPhoto] = useState<{ url: string; name: string; read?: PhotoRead; busy: boolean; err?: string } | null>(initialPhoto ? { url: initialPhoto, name: 'Foto da busca', busy: false } : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const now = useMemo(() => Date.now(), []);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const vq = useMemo<VFilters>(() => ({ ...vf, locais: f.locais, period: f.period, from: f.from, to: f.to }), [vf, f.locais, f.period, f.from, f.to]);
  const nMatch = useMemo(() => (kind === 'veiculo' ? runVehicleSearch(allV, vq, now).exact.length : runSearch(all, f, now).exact.length), [kind, all, allV, f, vq, now]);
  const setV = <K extends keyof VFilters>(k: K, v: VFilters[K]) => setVf((x) => ({ ...x, [k]: v }));
  // Trocar tipo ou marca descarta marcas e modelos que deixaram de existir.
  const setTypes = (types: VFilters['types']) => setVf((x) => { const bs = brandsOf(types); const brands = x.brands.filter((b) => bs.includes(b)); const ms = modelsOf(types, brands); return { ...x, types, brands, models: x.models.filter((m) => ms.includes(m)), plate: types.length && types.every((t) => !hasPlate(t)) ? '' : x.plate }; });
  const setBrands = (brands: string[]) => setVf((x) => { const ms = modelsOf(x.types, brands); return { ...x, brands, models: x.models.filter((m) => ms.includes(m)) }; });
  const applyPhoto = (r: PhotoRead, k: Kind) => {
    if (k === 'veiculo') setVf((x) => ({ ...x, colors: [r.vcolor] }));
    else setF((x) => ({ ...x, upper: [r.upper], lower: x.tops.includes('vestido') ? [] : [r.lower] }));
  };
  const attach = async (file: File | undefined) => {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setPhoto({ url: local, name: file.name, busy: true });
    try {
      const [r] = await Promise.all([readPhoto(file), new Promise((ok) => setTimeout(ok, 1600))]);
      URL.revokeObjectURL(local);
      setPhoto({ url: r.url, name: r.name, read: r, busy: false });
      applyPhoto(r, kind);
    } catch (e) {
      URL.revokeObjectURL(local);
      setPhoto({ url: '', name: file.name, busy: false, err: (e as Error).message });
    }
  };
  const switchKind = (k: Kind) => { setKind(k); setStep(0); setSeen(0); setTried(false); if (photo?.read) applyPhoto(photo.read, k); };
  useEffect(() => { if (startPhoto) fileRef.current?.click(); }, [startPhoto]);
  useEffect(() => {
    const paste = (e: ClipboardEvent) => { const it = [...(e.clipboardData?.files ?? [])].find((x) => PHOTO_TYPES.includes(x.type)); if (it) { e.preventDefault(); attach(it); } };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  });
  const recent = useMemo(readPurposes, []);

  const badPeriod = f.period === 'custom' && !!f.from && !!f.to && new Date(f.from) > new Date(f.to);
  const pErr = purpose.trim().length < 3 ? 'Informe uma finalidade com pelo menos 3 caracteres.' : purpose.trim().length > 500 ? 'A finalidade deve ter no máximo 500 caracteres.' : '';
  const WHERE = STEPS.indexOf('Onde e quando');
  const stepOk = (i: number) => (i === WHERE ? !badPeriod : i === STEPS.length - 1 ? !pErr : true);
  const last = step === STEPS.length - 1;
  const go = (i: number) => {
    if (i > step && !stepOk(step)) { setTried(true); return; }
    setTried(false); setStep(i); setSeen((s) => Math.max(s, i));
  };
  const submit = () => {
    if (badPeriod) { setStep(WHERE); setTried(true); return; }
    if (pErr) { setTried(true); return; }
    const p = purpose.trim();
    storage.set('nx-traits-purposes', JSON.stringify([p, ...recent.filter((x) => x !== p)].slice(0, 4)));
    onSearch(f, p, kind === 'veiculo' ? vq : undefined, photo?.url && !photo.err ? photo.url : undefined);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.nx-menu, .nx-dtp__pop')) { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (last) submit(); else go(step + 1); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  });

  const dressOnly = f.tops.length === 1 && f.tops[0] === 'vestido';
  // Só vestido: parte de baixo não se aplica, então limpa o que estava marcado.
  const setTops = (v: Filters['tops']) => setF((x) => ({ ...x, tops: v, ...(v.length === 1 && v[0] === 'vestido' ? { bottoms: [], lower: [] } : {}) }));
  const group = (ks: TraitKey[]) => ks.filter((k) => isSet(f, k)).map((k) => traitLabel(f, k)).join(' · ');
  const vgroup = (ks: VKey[]) => ks.filter((k) => vIsSet(vf, k)).map((k) => vLabel(vf, k)).join(' · ');
  const plateOff = vf.types.length > 0 && vf.types.every((t) => !hasPlate(t));
  const models = modelsOf(vf.types, vf.brands);
  const where: [string, string, number] = ['Onde e quando', `${f.locais.length ? f.locais.join(', ') : 'Todos os locais'} · ${PERIOD_LABEL[f.period]}`, WHERE];
  const review: [string, string, number][] = kind === 'veiculo' ? [
    ['Veículo', vgroup(['types', 'brands', 'models']) || 'Qualquer', 0],
    ['Cor e placa', vgroup(['colors', 'plate']) || 'Qualquer', 1],
    where,
  ] : [
    ['Pessoa', group(['gender', 'ages']) || 'Qualquer', 0],
    ['Roupas', group(['tops', 'upper', 'bottoms', 'lower']) || 'Qualquer cor', 1],
    ['Acessórios', group(['hat', 'glasses', 'backpack', 'extras', 'moods']) || 'Tanto faz', 2],
    where,
  ];
  if (photo?.url && !photo.err) review.unshift(['Foto', photo.name, 0]);
  const nT = kind === 'veiculo' ? vTraits(vf) : nTraits(f);

  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tr-wiz" role="dialog" aria-modal="true" aria-labelledby="tr-wiz-t">
        <header className="tr-wiz__head">
          <div>
            <span className="nx-sheet__eyebrow">{initial ? 'Editar busca' : 'Nova busca'}</span>
            <h2 id="tr-wiz-t">Busca por característica</h2>
          </div>
          {!editing && <span className="tr-wiz__kind"><Segmented<Kind> label="O que procurar" value={kind} onChange={switchKind}
            options={[{ value: 'pessoa', label: <><Icon name="faces" size={16} />Pessoa</> }, { value: 'veiculo', label: <><Icon name="car" size={16} />Veículo</> }]} /></span>}
          <span className="dv-tools__sp" />
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>

        <ol className="oc-steps oc-wsteps tr-wiz__steps" aria-label="Etapas" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
          {STEPS.map((w, i) => (
            <li key={w} className={i < step ? 'is-done' : i === step ? 'is-on' : undefined}>
              <button type="button" disabled={i > seen && i > step + 1} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
                <i>{i < step ? <Icon name="check" size={10} /> : i + 1}</i><span>{w}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="tr-wiz__main">
          <aside className="tr-wiz__side" aria-label="Retrato da busca">
            <div className="tr-wiz__stage">
              {photo?.url && !photo.busy && <span className="tr-wiz__ph" title="Foto anexada"><img src={photo.url} alt="Foto anexada" /></span>}
              {kind === 'veiculo' ? <Vehicle type={vf.types[0]} colors={vf.colors} /> : <Figure upper={f.upper} lower={f.lower} gender={f.gender} hat={f.hat === 'sim'} glasses={f.glasses === 'sim'} backpack={f.backpack === 'sim'} extras={f.extras} top={f.tops[0]} bottom={f.bottoms[0]}
                onPart={(p) => go(p === 'head' ? 0 : 1)} />}
            </div>
            <span className="tr-eyebrow">Retrato da busca</span>
            <p className="tr-wiz__desc">{kind === 'veiculo' ? (nT ? vDescribe(vf) : 'Qualquer veículo. Escolha características para estreitar.') : nT ? describe(f) : 'Qualquer pessoa. Escolha características para estreitar.'}</p>
            <div className="tr-wiz__est" aria-live="polite">
              <b>{nMatch.toLocaleString('pt-BR')}</b>
              <span>{nMatch === 1 ? (kind === 'veiculo' ? 'passagem bate' : 'registro bate') : kind === 'veiculo' ? 'passagens batem' : 'registros batem'} agora<br />{PERIOD_LABEL[f.period].toLowerCase()}</span>
            </div>
            {nT > 0 && <Button icon="eraser" className="tr-clear" onClick={() => (kind === 'veiculo' ? setVf(VEMPTY) : setF({ ...EMPTY, period: f.period, from: f.from, to: f.to, locais: f.locais }))}>Limpar características<span className="tr-clear__n">{nT}</span></Button>}
          </aside>

          <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} hidden onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="tr-wiz__body" key={kind + step}>
            {kind === 'veiculo' && step === 0 && (
              <>
                <PhotoBox photo={photo} kind={kind} onPick={() => fileRef.current?.click()} onDrop={attach} onRemove={() => setPhoto(null)} onNext={() => go(WHERE)} />
                <Field label="Tipo" count={vf.types.length} onClear={() => setTypes([])}>
                  <div className="tr-chips">{VTYPES.map((t) => <Chip key={t.id} on={vf.types.includes(t.id)} onClick={() => setTypes(toggle(vf.types, t.id))}>{t.label}</Chip>)}</div>
                </Field>
                <Field label="Marca" hint={vf.types.length ? 'dos tipos escolhidos' : undefined} count={vf.brands.length} onClear={() => setBrands([])}>
                  <div className="tr-chips">{brandsOf(vf.types).map((b) => <Chip key={b} on={vf.brands.includes(b)} onClick={() => setBrands(toggle(vf.brands, b))}>{b}</Chip>)}</div>
                </Field>
                <Field label="Modelo" count={vf.models.length} onClear={() => setV('models', [])}>
                  {vf.types.length || vf.brands.length
                    ? <div className="tr-chips">{models.map((m) => <Chip key={m} on={vf.models.includes(m)} onClick={() => setV('models', toggle(vf.models, m))}>{m}</Chip>)}</div>
                    : <p className="tr-tip is-plain">Escolha o tipo ou a marca para ver os modelos.</p>}
                </Field>
              </>
            )}
            {kind === 'veiculo' && step === 1 && (
              <>
                <Field label="Cor" count={vf.colors.length} onClear={() => setV('colors', [])}>
                  <div className="tr-sws" role="group" aria-label="Cores do veículo">
                    {VCOLORS.map((c) => <Swatch key={c.id} c={c} on={vf.colors.includes(c.id)} onClick={() => setV('colors', toggle(vf.colors, c.id))} />)}
                  </div>
                </Field>
                <Field label="Placa" hint={plateOff ? 'bicicleta não tem placa' : 'completa ou só um trecho'}>
                  <div className={`tr-plate${plateOff ? ' is-off' : ''}`}>
                    <label className="tr-plate__box">
                      <span className="tr-plate__band">BRASIL</span>
                      <input value={vf.plate} disabled={plateOff} maxLength={8} placeholder="ABC1D23" aria-label="Placa" spellCheck={false} autoComplete="off"
                        onChange={(e) => setV('plate', e.target.value.toUpperCase().replace(/[^A-Z0-9?\- ]/g, ''))} />
                    </label>
                    <p className="tr-tip is-plain">Use <b>?</b> no caractere que não deu para ler, como <b>AB?1D2?</b>. Vale placa antiga e Mercosul.</p>
                  </div>
                </Field>
                <p className="tr-tip"><Icon name="infoFill" size={14} />Marque mais de uma cor quando estiver em dúvida. À noite, prata, branco e cinza se confundem.</p>
              </>
            )}
            {kind === 'pessoa' && step === 0 && (
              <>
                <PhotoBox photo={photo} kind={kind} onPick={() => fileRef.current?.click()} onDrop={attach} onRemove={() => setPhoto(null)} onNext={() => go(WHERE)} />
                <Field label="Gênero" hint="como reportado pelo motor">
                  <Segmented<'' | 'M' | 'F'> label="Gênero" value={f.gender} onChange={(v) => set('gender', v)}
                    options={[{ value: '', label: 'Tanto faz' }, { value: 'M', label: GENDER_LABEL.M }, { value: 'F', label: GENDER_LABEL.F }]} />
                </Field>
                <Field label="Faixa etária" hint="estimada pela câmera">
                  <div className="tr-chips">{AGES.map((a) => <Chip key={a} on={f.ages.includes(a)} onClick={() => set('ages', toggle(f.ages, a))}>{a}</Chip>)}</div>
                </Field>
              </>
            )}
            {kind === 'pessoa' && step === 1 && (
              <>
                <Field label="Parte de cima" hint="peça e cor" count={f.upper.length + f.tops.length} onClear={() => setF((x) => ({ ...x, upper: [], tops: [] }))}>
                  <div className="tr-chips">{TOPS.map((t) => <Chip key={t.id} on={f.tops.includes(t.id)} onClick={() => setTops(toggle(f.tops, t.id))}>{t.label}</Chip>)}</div>
                  <Swatches value={f.upper} onChange={(v) => set('upper', v)} kind="upper" />
                </Field>
                <Field label="Parte de baixo" hint={dressOnly ? 'o vestido já cobre a parte de baixo' : 'peça e cor'} count={f.lower.length + f.bottoms.length} onClear={() => setF((x) => ({ ...x, lower: [], bottoms: [] }))}>
                  <div className={`tr-lowerbox${dressOnly ? ' is-off' : ''}`} aria-disabled={dressOnly || undefined}>
                    <div className="tr-chips">{BOTTOMS.map((t) => <Chip key={t.id} on={f.bottoms.includes(t.id)} onClick={() => set('bottoms', toggle(f.bottoms, t.id))}>{t.label}</Chip>)}</div>
                    <Swatches value={f.lower} onChange={(v) => set('lower', v)} kind="lower" />
                  </div>
                </Field>
                <p className="tr-tip"><Icon name="infoFill" size={14} />Marque mais de uma cor quando estiver em dúvida. Com pouca luz, preto, azul-marinho e cinza se confundem.</p>
              </>
            )}
            {kind === 'pessoa' && step === 2 && (
              <>
                <Field label="Na pessoa">
                  <div className="tr-tris">
                    <TriRow icon="hat" label="Boné ou chapéu" value={f.hat} onChange={(v) => set('hat', v)} />
                    <TriRow icon="glasses" label="Óculos" value={f.glasses} onChange={(v) => set('glasses', v)} />
                    <TriRow icon="backpack" label="Mochila" value={f.backpack} onChange={(v) => set('backpack', v)} />
                  </div>
                </Field>
                <Field label="Carregando ou usando">
                  <div className="tr-chips">{EXTRAS.map((x) => <Chip key={x.id} on={f.extras.includes(x.id)} onClick={() => set('extras', toggle(f.extras, x.id))}>{x.label}</Chip>)}</div>
                </Field>
                <Field label="Humor aparente" badge="palpite" hint="Atributo de maior incerteza do motor">
                  <div className="tr-chips">{MOODS.map((m) => <Chip key={m.id} on={f.moods.includes(m.id)} onClick={() => set('moods', toggle(f.moods, m.id))}>{m.label}</Chip>)}</div>
                </Field>
              </>
            )}
            {step === WHERE && (
              <>
                <Field label="Onde" hint={f.locais.length ? undefined : 'todos os locais'} count={f.locais.length} onClear={() => set('locais', [])}>
                  <div className="tr-chips">{LOCAIS.map((l) => <Chip key={l} on={f.locais.includes(l)} onClick={() => set('locais', toggle(f.locais, l))}>{l}</Chip>)}</div>
                </Field>
                <Field label="Quando">
                  <Segmented<Filters['period']> label="Período" value={f.period} onChange={(v) => setF((x) => ({ ...x, period: v, ...(v === 'custom' && !x.from ? { from: isoLocal(now - 2 * 86400e3), to: isoLocal(now) } : {}) }))}
                    options={[{ value: '1h', label: 'Última hora' }, { value: '24h', label: '24 horas' }, { value: '7d', label: '7 dias' }, { value: 'custom', label: 'Personalizado' }]} />
                  {f.period === 'custom' && (
                    <div className="tr-dates">
                      <DateTimePicker label="De" value={f.from} onChange={(v) => set('from', v)} max={f.to || undefined} />
                      <DateTimePicker label="Até" value={f.to} onChange={(v) => set('to', v)} max={isoLocal(now)} />
                    </div>
                  )}
                  {badPeriod && <p className="tr-err" role="alert">A data inicial não pode ser posterior à data final.</p>}
                </Field>
              </>
            )}
            {step === STEPS.length - 1 && (
              <>
                <Field label="Finalidade da consulta" hint="obrigatória">
                  <p className="tr-tip is-plain">Descreva o caso ou a razão operacional. Esta informação será registrada na trilha de auditoria.</p>
                  <textarea className={`nx-textarea${tried && pErr ? ' is-err' : ''}`} autoFocus value={purpose} maxLength={500} rows={3} placeholder="Ex.: apuração do incidente 42 no acesso norte"
                    onChange={(e) => setPurpose(e.target.value)} />
                  <div className="tr-pm__meta">{tried && pErr ? <span className="tr-err" role="alert">{pErr}</span> : <span />}<em>{purpose.length}/500</em></div>
                  {recent.length > 0 && (
                    <div className="tr-pm__rec"><span>Recentes</span>{recent.map((r) => <button key={r} type="button" className="tr-chip" onClick={() => setPurpose(r)}>{r}</button>)}</div>
                  )}
                </Field>
                <Field label="Resumo">
                  <dl className="tr-review">
                    {review.map(([k, v, i]) => (
                      <div key={k}><dt>{k}</dt><dd>{v}</dd><button type="button" className="tr-link" onClick={() => go(i)}>Alterar</button></div>
                    ))}
                  </dl>
                </Field>
              </>
            )}
          </div>
        </div>

        <footer className="tr-wiz__foot">
          {step > 0 ? <Button icon="arrowLeft" onClick={() => go(step - 1)}>Voltar</Button> : <Button onClick={onClose}>Cancelar</Button>}
          <span className="tr-wiz__count">{step + 1} de {STEPS.length}</span>
          {!last && <Button onClick={() => go(STEPS.length - 1)}>Pular para finalidade</Button>}
          {last ? <Button variant="primary" icon="search" onClick={submit}>Pesquisar</Button> : <Button variant="primary" onClick={() => go(step + 1)}>Próximo</Button>}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Anexar foto: arrastar, colar ou escolher. Depois de ler, mostra o que foi preenchido. */
function PhotoBox({ photo, kind, onPick, onDrop, onRemove, onNext }: {
  photo: { url: string; name: string; read?: PhotoRead; busy: boolean; err?: string } | null; kind: Kind;
  onPick: () => void; onDrop: (f: File | undefined) => void; onRemove: () => void; onNext: () => void;
}) {
  const [over, setOver] = useState(false);
  const dnd = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); onDrop(e.dataTransfer.files[0]); },
  };
  if (!photo || photo.err) {
    return (
      <div className={`tr-photo is-empty${over ? ' is-over' : ''}`} {...dnd}>
        <span className="tr-photo__ic"><Icon name="camera" size={20} /></span>
        <div className="tr-photo__t">
          <b>Buscar por foto</b>
          <span>{photo?.err ?? `Anexe uma foto ${kind === 'veiculo' ? 'do veículo' : 'da pessoa'} e o motor preenche as características. Arraste, cole (Ctrl+V) ou escolha.`}</span>
        </div>
        <Button icon="upload" onClick={onPick}>Escolher foto</Button>
      </div>
    );
  }
  const r = photo.read;
  const found = !r ? [] : kind === 'veiculo'
    ? [<><i style={{ background: VCOLOR[r.vcolor].hex }} />Cor {VCOLOR[r.vcolor].label.toLowerCase()}</>]
    : [<><i style={{ background: colorBg(r.upper) }} />Em cima {COLOR[r.upper].label.toLowerCase()}</>, <><i style={{ background: colorBg(r.lower) }} />Embaixo {COLOR[r.lower].label.toLowerCase()}</>];
  return (
    <div className={`tr-photo${photo.busy ? ' is-busy' : ''}${over ? ' is-over' : ''}`} {...dnd}>
      <span className="tr-photo__img"><img src={photo.url} alt="" />{photo.busy && <i className="tr-photo__scan" />}</span>
      <div className="tr-photo__t">
        {photo.busy ? <><b>Lendo a foto…</b><span>{photo.name}</span></> : r ? (
          <>
            <b><Icon name="check" size={14} />Preenchido pela foto</b>
            <span className="tr-photo__found">{found.map((x, i) => <em key={i}>{x}</em>)}</span>
            <span>{kind === 'veiculo' ? 'Confira tipo, marca, modelo e placa, se souber.' : 'Confira gênero, idade e acessórios, se souber.'} O resto pode ficar como está.</span>
          </>
        ) : <><b>Foto da busca</b><span>Anexada quando a busca foi feita.</span></>}
      </div>
      {!photo.busy && (
        <div className="tr-photo__acts">
          {r && <Button variant="primary" icon="arrowRight" onClick={onNext}>Seguir com a foto</Button>}
          <IconButton icon="trash" label="Remover foto" onClick={onRemove} tipPlace="top" />
        </div>
      )}
    </div>
  );
}
