import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, DateTimePicker, Icon, IconButton, Kbd, Segmented } from '../../ds/components';
import { storage } from '../../lib/storage';
import { Figure } from './Figure';
import { Chip, describe, Field, isoLocal, PERIOD_LABEL, Swatches, toggle, TriRow } from './parts';
import {
  AGES, EMPTY, EXAMPLES, EXTRAS, GENDER_LABEL, isSet, LOCAIS, MOODS, nTraits, parseDescription, runSearch, traitLabel,
  type Filters, type Obs, type TraitKey,
} from './data';

const STEPS = ['Pessoa', 'Roupas', 'Acessórios', 'Onde e quando', 'Finalidade'];
const readPurposes = (): string[] => { try { return JSON.parse(storage.get('nx-traits-purposes') ?? '[]'); } catch { return []; } };

type Props = { initial?: Filters; all: Obs[]; onClose: () => void; onSearch: (f: Filters, purpose: string) => void };

/** Nova busca em etapas, com o retrato da pessoa ao lado e uma prévia de quantos registros batem. */
export function NewSearch({ initial, all, onClose, onSearch }: Props) {
  const [f, setF] = useState<Filters>(initial ?? EMPTY);
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(initial ? STEPS.length - 1 : 0);
  const [text, setText] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tried, setTried] = useState(false);
  const now = useMemo(() => Date.now(), []);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const parsed = useMemo(() => (text.trim().length > 2 ? parseDescription(text) : {}), [text]);
  const parsedKeys = Object.keys(parsed) as (keyof Filters)[];
  const preview = useMemo(() => runSearch(all, f, now), [all, f, now]);
  const recent = useMemo(readPurposes, []);

  const badPeriod = f.period === 'custom' && !!f.from && !!f.to && new Date(f.from) > new Date(f.to);
  const pErr = purpose.trim().length < 3 ? 'Informe uma finalidade com pelo menos 3 caracteres.' : purpose.trim().length > 500 ? 'A finalidade deve ter no máximo 500 caracteres.' : '';
  const stepOk = (i: number) => (i === 3 ? !badPeriod : i === 4 ? !pErr : true);
  const last = step === STEPS.length - 1;
  const go = (i: number) => {
    if (i > step && !stepOk(step)) { setTried(true); return; }
    setTried(false); setStep(i); setSeen((s) => Math.max(s, i));
  };
  const submit = () => {
    if (badPeriod) { setStep(3); setTried(true); return; }
    if (pErr) { setTried(true); return; }
    const p = purpose.trim();
    storage.set('nx-traits-purposes', JSON.stringify([p, ...recent.filter((x) => x !== p)].slice(0, 4)));
    onSearch(f, p);
  };
  const applyText = () => { if (parsedKeys.length) { setF((x) => ({ ...x, ...parsed })); setText(''); } };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.nx-menu, .nx-dtp__pop')) { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (last) submit(); else go(step + 1); }
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  });

  const group = (ks: TraitKey[]) => ks.filter((k) => isSet(f, k)).map((k) => traitLabel(f, k)).join(' · ');
  const review: [string, string, number][] = [
    ['Pessoa', group(['gender', 'ages']) || 'Qualquer', 0],
    ['Roupas', group(['upper', 'lower']) || 'Qualquer cor', 1],
    ['Acessórios', group(['hat', 'glasses', 'backpack', 'extras', 'moods']) || 'Tanto faz', 2],
    ['Onde e quando', `${f.locais.length ? f.locais.join(', ') : 'Todos os locais'} · ${PERIOD_LABEL[f.period]}`, 3],
  ];

  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tr-wiz" role="dialog" aria-modal="true" aria-labelledby="tr-wiz-t">
        <header className="tr-wiz__head">
          <div>
            <span className="nx-sheet__eyebrow">{initial ? 'Editar busca' : 'Nova busca'}</span>
            <h2 id="tr-wiz-t">Busca por característica</h2>
          </div>
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
              <Figure upper={f.upper} lower={f.lower} gender={f.gender} hat={f.hat === 'sim'} glasses={f.glasses === 'sim'} backpack={f.backpack === 'sim'} extras={f.extras}
                onPart={(p) => go(p === 'head' ? 0 : 1)} />
            </div>
            <span className="tr-eyebrow">Retrato da busca</span>
            <p className="tr-wiz__desc">{nTraits(f) ? describe(f) : 'Qualquer pessoa. Escolha características para estreitar.'}</p>
            <div className="tr-wiz__est" aria-live="polite">
              <b>{preview.exact.length.toLocaleString('pt-BR')}</b>
              <span>{preview.exact.length === 1 ? 'registro bate' : 'registros batem'} agora<br />{PERIOD_LABEL[f.period].toLowerCase()}</span>
            </div>
            {nTraits(f) > 0 && <Button icon="eraser" className="tr-clear" onClick={() => setF({ ...EMPTY, period: f.period, from: f.from, to: f.to, locais: f.locais })}>Limpar características<span className="tr-clear__n">{nTraits(f)}</span></Button>}
          </aside>

          <div className="tr-wiz__body" key={step}>
            {step === 0 && (
              <>
                <div className="tr-desc">
                  <span className="tr-field__l">Descreva em uma frase <span className="tr-field__h">opcional</span></span>
                  <label className="nx-input tr-desc__in">
                    <Icon name="sparkle" size={16} />
                    <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: homem de camiseta vermelha com mochila"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); applyText(); } }} aria-label="Descrever a pessoa" />
                    {text && <Kbd>Enter</Kbd>}
                  </label>
                  {text.trim().length > 2 ? (
                    <div className="tr-desc__pre" aria-live="polite">
                      {parsedKeys.length ? <><span>Entendi:</span>{parsedKeys.map((k) => <b key={k}>{k === 'locais' ? parsed.locais!.join(', ') : k === 'period' ? PERIOD_LABEL[parsed.period!] : traitLabel({ ...EMPTY, ...parsed }, k as TraitKey)}</b>)}<span>· Enter preenche</span></> : <span>Nada reconhecido ainda…</span>}
                    </div>
                  ) : (
                    <div className="tr-desc__pre">
                      {EXAMPLES.map((e) => <button key={e.text} type="button" className="tr-ex" onClick={() => setF((x) => ({ ...x, ...parseDescription(e.text) }))}>{e.label}</button>)}
                    </div>
                  )}
                </div>
                <Field label="Gênero" hint="como reportado pelo motor">
                  <Segmented<'' | 'M' | 'F'> label="Gênero" value={f.gender} onChange={(v) => set('gender', v)}
                    options={[{ value: '', label: 'Tanto faz' }, { value: 'M', label: GENDER_LABEL.M }, { value: 'F', label: GENDER_LABEL.F }]} />
                </Field>
                <Field label="Faixa etária" hint="estimada pela câmera">
                  <div className="tr-chips">{AGES.map((a) => <Chip key={a} on={f.ages.includes(a)} onClick={() => set('ages', toggle(f.ages, a))}>{a}</Chip>)}</div>
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Roupa superior" hint="camisa, blusa, jaqueta" count={f.upper.length} onClear={() => set('upper', [])}>
                  <Swatches value={f.upper} onChange={(v) => set('upper', v)} kind="upper" />
                </Field>
                <Field label="Roupa inferior" hint="calça, bermuda, saia" count={f.lower.length} onClear={() => set('lower', [])}>
                  <Swatches value={f.lower} onChange={(v) => set('lower', v)} kind="lower" />
                </Field>
                <p className="tr-tip"><Icon name="infoFill" size={14} />Marque mais de uma cor quando estiver em dúvida. Com pouca luz, preto, azul-marinho e cinza se confundem.</p>
              </>
            )}
            {step === 2 && (
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
            {step === 3 && (
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
            {step === 4 && (
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
