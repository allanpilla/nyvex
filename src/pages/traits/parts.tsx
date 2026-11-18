import type { ReactNode } from 'react';
import { Icon, Segmented, useTooltip } from '../../ds/components';
import { FaceImg } from '../faces/FaceImg';
import { Figure } from './Figure';
import { BOTTOM_SHORT, TOP_SHORT, camName, camOf, colorBg, COLORS, GENDER_LABEL, isSet, obsTrait, score, TRAIT_KEYS, traitLabel, when, type Color, type Filters, type Obs, type TraitKey, type Tri } from './data';

/* Peças compartilhadas pela tela de buscas, pelo modal de nova busca e pelos resultados. */

export const toggle = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
export const describe = (f: Filters) => TRAIT_KEYS.filter((k) => isSet(f, k)).map((k) => traitLabel(f, k)).join(' · ') || 'Qualquer pessoa';
export const PERIOD_LABEL = { '1h': 'Última hora', '24h': 'Últimas 24 h', '7d': 'Últimos 7 dias', custom: 'Período personalizado' } as const;

export const isoLocal = (t: number) => { const d = new Date(t); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export function Field({ label, hint, badge, count, onClear, refEl, children }: { label: string; hint?: string; badge?: string; count?: number; onClear?: () => void; refEl?: React.Ref<HTMLDivElement>; children: ReactNode }) {
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

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`tr-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>{on && <Icon name="check" size={12} />}{children}</button>;
}

export function Swatches({ value, onChange, kind }: { value: Color[]; onChange: (v: Color[]) => void; kind: 'upper' | 'lower' }) {
  return (
    <div className="tr-sws" role="group" aria-label={kind === 'upper' ? 'Cores da roupa superior' : 'Cores da roupa inferior'}>
      {COLORS.filter((c) => kind === 'lower' || !c.lowerOnly).map((c) => <Swatch key={c.id} c={c} on={value.includes(c.id)} onClick={() => onChange(toggle(value, c.id))} />)}
    </div>
  );
}
export function Swatch({ c, on, onClick }: { c: { id: string; label: string; hex: string; css?: string }; on: boolean; onClick: () => void }) {
  const tip = useTooltip(c.label, undefined, true, 'top');
  return (
    <button type="button" className={`tr-sw${on ? ' is-on' : ''}${c.id === 'jeans' ? ' is-jeans' : ''}`} style={{ '--c': c.css ?? c.hex } as React.CSSProperties} aria-pressed={on} aria-label={c.label} {...tip} onClick={onClick}>
      <i />{on && <Icon name="check" size={12} />}
    </button>
  );
}

export const TRI_ICON = {
  hat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M4 15a8 7 0 0 1 16 0z" /><path d="M20 15h2.5" strokeLinecap="round" /></svg>,
  glasses: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14h4M3 13 4.5 7M21 13l-1.5-6" strokeLinecap="round" /></svg>,
  backpack: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M6 10a6 6 0 0 1 12 0v10H6z" /><path d="M9 4.5V3h6v1.5M9 15h6" strokeLinecap="round" /></svg>,
};
export function TriRow({ icon, label, value, onChange }: { icon: keyof typeof TRI_ICON; label: string; value: Tri; onChange: (v: Tri) => void }) {
  return (
    <div className="tr-tri">
      <span className="tr-tri__ic" aria-hidden="true">{TRI_ICON[icon]}</span>
      <span className="tr-tri__l">{label}</span>
      <Segmented<Tri> label={label} size="sm" value={value} onChange={onChange} options={[{ value: '', label: 'Tanto faz' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]} />
    </div>
  );
}

export function fmtBucket(b: { from: number; to: number }, period: Filters['period']) {
  const d = new Date(b.from);
  const hm = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (period === '1h' || period === '24h') return `${hm(b.from)}–${hm(b.to)}`;
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} ${hm(b.from)}–${hm(b.to)}`;
}

export function Timeline({ buckets, sel, onSel, period }: { buckets: { from: number; to: number; n: number }[]; sel: number | null; onSel: (i: number) => void; period: Filters['period'] }) {
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
export function Bar({ b, h, on, dim, label, onClick }: { b: { n: number }; h: number; on: boolean; dim: boolean; label: string; onClick: () => void }) {
  const tip = useTooltip(`${label} · ${b.n} ${b.n === 1 ? 'observação' : 'observações'}`, undefined, true, 'top');
  return (
    <button type="button" className={`tr-bar${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}${b.n ? '' : ' is-zero'}`} onClick={onClick} aria-label={`${label}: ${b.n}`} {...tip}>
      <i style={{ height: `${Math.max(b.n ? 8 : 2, h * 100)}%` }} />
    </button>
  );
}

export function Card({ o, n = 1, f, now, on, miss, onOpen }: { o: Obs; n?: number; f: Filters; now: number; on: boolean; miss?: TraitKey; onOpen: () => void }) {
  const tip = useTooltip(`Vista ${n} vezes com esta descrição no recorte`, undefined, n > 1, 'top');
  const cam = camOf(o.src);
  const sc = score(o, f);
  return (
    <button type="button" className={`tr-card${on ? ' is-on' : ''}${miss ? ' is-near' : ''}${n > 1 ? ' is-stack' : ''}`} onClick={onOpen} aria-label={`${GENDER_LABEL[o.gender]}, ${o.age} anos, ${camName(o.src)}, ${when(o.at, now)}`}>
      <span className="tr-card__img">
        <FaceImg seed={o.seed} night={cam.night} />
        <span className="fc-det">{sc}%</span>
        {n > 1 && <span className="tr-stack" {...tip}><Icon name="stack" size={12} />{n}×</span>}
        <span className="tr-card__fig"><Figure size="sm" upper={[o.upper]} lower={[o.lower]} gender={o.gender} hat={o.hat} glasses={o.glasses} backpack={o.backpack} extras={o.extras} top={o.top} bottom={o.bottom} /></span>
        {miss && <span className="tr-miss"><Icon name="warn" size={12} />{obsTrait(o, miss)}</span>}
      </span>
      <span className="tr-card__body">
        <b>{GENDER_LABEL[o.gender]} · {o.age}</b>
        <span className="tr-card__wear">
          <i style={{ background: colorBg(o.upper) }} />{TOP_SHORT[o.top]}
          {o.top !== 'vestido' && <><span>/</span><i style={{ background: colorBg(o.lower) }} />{BOTTOM_SHORT[o.bottom]}</>}
          {(o.backpack || o.hat || o.glasses) && <span className="tr-card__acc">{o.hat && TRI_ICON.hat}{o.glasses && TRI_ICON.glasses}{o.backpack && TRI_ICON.backpack}</span>}
        </span>
        <span className="tr-card__meta"><span className={cam.name ? undefined : 'is-id'}>{camName(o.src)}</span><time>{when(o.at, now)}</time></span>
      </span>
    </button>
  );
}

export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export const dayLabel = (t: number, now: number) => {
  const k = dayKey(t);
  if (k === dayKey(now)) return 'Hoje';
  if (k === dayKey(now - 86400e3)) return 'Ontem';
  return new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

