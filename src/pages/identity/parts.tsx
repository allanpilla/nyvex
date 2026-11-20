import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, useTooltip } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import { photoUrl } from '../faces/faceArt';
import { initials, P_STATUS, RISK_LABEL, V_STATUS, type Person, type PStatus, type Risk, type VStatus } from './data';

/** Foto do cadastro ou iniciais. */
export function PersonPic({ p, size = 32, square }: { p: Pick<Person, 'name' | 'photo'>; size?: number; square?: boolean }) {
  return (
    <span className={`id-pic${square ? ' is-sq' : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {p.photo != null ? <img src={photoUrl(p.photo)} alt="" loading="lazy" draggable={false} /> : initials(p.name)}
    </span>
  );
}

const P_TONE: Record<PStatus, string> = { pendente: 'warn', ativa: 'ok', suspensa: 'warn', inativa: 'off', bloqueada: 'bad', falecida: 'off' };
export function PStatusDot({ s }: { s: PStatus }) {
  return <span className={`id-st is-${P_TONE[s]}`}><i />{P_STATUS[s]}</span>;
}
const V_TONE: Record<VStatus, string> = { ativo: 'ok', inativo: 'off', bloqueado: 'bad' };
export function VStatusDot({ s }: { s: VStatus }) {
  return <span className={`id-st is-${V_TONE[s]}`}><i />{V_STATUS[s]}</span>;
}

/** Risco: só “Alto” ganha cor forte; “Médio” é âmbar discreto; “Baixo” fica neutro. */
export function RiskTag({ r }: { r: Risk }) {
  return <span className={`id-risk is-${r}`}>{r === 'alto' && <Icon name="warnFill" size={12} />}{RISK_LABEL[r]}</span>;
}

export function Plate({ children, lg }: { children: ReactNode; lg?: boolean }) {
  return <span className={`id-plate${lg ? ' is-lg' : ''}`}>{children}</span>;
}

export function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return <span className="dv-chip">{children}<button type="button" aria-label="Remover filtro" onClick={onRemove}><Icon name="close" size={12} /></button></span>;
}

export function Th<K extends string>({ k, sort, onSort, cls, children }: { k: K; sort: { k: K; dir: 1 | -1 }; onSort: (k: K) => void; cls: string; children: ReactNode }) {
  const on = sort.k === k;
  return (
    <span className={`dv-c ${cls}`} role="columnheader" aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`dv-sort${on ? ' is-on' : ''}`} onClick={() => onSort(k)}>
        {children}<Icon name={on ? 'chevron' : 'sort'} size={14} className={on ? (sort.dir === 1 ? 'is-asc' : 'is-desc') : undefined} />
      </button>
    </span>
  );
}
export function ThPlain({ cls, children }: { cls: string; children?: ReactNode }) {
  return <span className={`dv-c ${cls}`} role="columnheader"><span className="dv-sort id-thp">{children}</span></span>;
}

export function CardBtn({ hint, ...rest }: { hint: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = useTooltip(hint, undefined, true, 'bottom');
  return <button type="button" {...tip} {...rest} />;
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="lc-empty id-empty">
      <span className="dv-empty__ic"><Icon name={icon} /></span>
      <b>{title}</b>
      {text && <span>{text}</span>}
      {children}
    </div>
  );
}

/** Caixa de seção usada na ficha: título, subtítulo, contador e ação. */
export function Box({ title, sub, icon, n, action, children, className }: { title: string; sub?: string; icon?: IconName; n?: number; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`id-box${className ? ` ${className}` : ''}`}>
      <header className="id-box__head">
        {icon && <span className="id-box__ic"><Icon name={icon} size={16} /></span>}
        <div className="id-box__t"><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
        {n != null && <span className="id-box__n">{n}</span>}
        {action}
      </header>
      {children}
    </section>
  );
}

/** Mini histograma de passagens por dia (últimos 14 dias). */
export function Spark({ times, now, days = 14 }: { times: number[]; now: number; days?: number }) {
  const D = 864e5;
  const bins = Array.from({ length: days }, (_, i) => times.filter((t) => Math.floor((now - t) / D) === days - 1 - i).length);
  const max = Math.max(1, ...bins);
  return (
    <span className="id-spark" aria-hidden="true">
      {bins.map((b, i) => <i key={i} style={{ height: b ? `${Math.max(18, (b / max) * 100)}%` : undefined }} className={b ? 'is-on' : undefined} />)}
    </span>
  );
}
