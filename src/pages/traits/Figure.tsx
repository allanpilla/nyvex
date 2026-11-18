import { useId } from 'react';
import { COLOR, type Bottom, type Color, type Extra, type Gender, type Top } from './data';

export type FigureLook = {
  upper: Color[];
  lower: Color[];
  gender?: Gender | '';
  hat?: boolean;
  glasses?: boolean;
  backpack?: boolean;
  extras?: Extra[];
  /** Tipo de peça; sem tipo, desenha camisa de manga longa e calça. */
  top?: Top;
  bottom?: Bottom;
};
type Props = FigureLook & {
  /** Retrato grande e clicável (painel de filtros) ou miniatura (card). */
  size?: 'lg' | 'sm';
  onPart?: (p: 'upper' | 'lower' | 'head') => void;
};

const RAINBOW = ['#f2556f', '#f2c230', '#2f9e64', '#3b82f6'];

/** Várias cores: faixas verticais (a colorida vira faixas finas de várias cores). */
function Stripes({ id, colors }: { id: string; colors: Color[] }) {
  if (colors.length < 2) return null;
  const w = 100 / colors.length;
  return (
    <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
      {colors.flatMap((c, i) => (c === 'colorida'
        ? RAINBOW.flatMap((h, j) => [<stop key={`${c}${j}a`} offset={`${i * w + (j * w) / RAINBOW.length}%`} stopColor={h} />, <stop key={`${c}${j}b`} offset={`${i * w + ((j + 1) * w) / RAINBOW.length}%`} stopColor={h} />])
        : [<stop key={`${c}a`} offset={`${i * w}%`} stopColor={COLOR[c].hex} />, <stop key={`${c}b`} offset={`${(i + 1) * w}%`} stopColor={COLOR[c].hex} />]))}
    </linearGradient>
  );
}

/**
 * Silhueta em estilo flat (viewBox 0 0 80 160). Sem cor escolhida, a peça fica “em aberto”: tom neutro com contorno tracejado.
 * Exportada como <g> para ser usada dentro de outras ilustrações (animação da lupa).
 */
export function FigureShape({ upper, lower, gender = '', hat, glasses, backpack, extras = [], top, bottom, onPart, mono }: FigureLook & { onPart?: Props['onPart']; mono?: string }) {
  const uid = useId().replace(/:/g, '');
  const anyU = upper.length === 0, anyL = lower.length === 0;
  const paint = (cs: Color[], k: string) => (mono ? mono : cs.length === 0 ? 'var(--tr-any)' : cs.length === 1 ? (cs[0] === 'colorida' ? `url(#${uid}mc)` : COLOR[cs[0]].hex) : `url(#${uid}${k})`);
  const line = (any: boolean) => (any && !mono ? { stroke: 'var(--tr-any-stroke)', strokeWidth: 1, strokeDasharray: '2.5 2.5' } : {});
  const skin = mono ?? 'var(--tr-skin)', hair = mono ?? 'var(--tr-hair)', shoe = mono ?? 'var(--tr-shoe)', gear = mono ?? 'var(--tr-gear)';
  const hit = (p: 'upper' | 'lower' | 'head') => (onPart ? { onClick: () => onPart(p), className: `tr-fig__hit is-${p}` } : {});
  const F = gender === 'F';
  const dress = top === 'vestido' || bottom === 'vestido';
  const bot = dress ? 'vestido' : bottom ?? 'calca';
  const sleeve = top === 'regata' ? 0 : top === 'camiseta' || top === 'vestido' ? 18 : 40;
  // No vestido, a saia tem a cor da parte de cima.
  const skirtPaint = dress ? paint(upper, 'u') : paint(lower, 'l');
  const skirtLine = line(dress ? anyU : anyL);
  return (
    <g>
      <defs>
        <pattern id={`${uid}mc`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="12" height="12" fill="#3b82f6" />
          <rect width="4" height="12" fill="#f2556f" />
          <rect x="4" width="4" height="12" fill="#f2c230" />
          <circle cx="10" cy="3" r="1.6" fill="#fff" opacity=".7" />
          <circle cx="10" cy="9" r="1.6" fill="#2f9e64" />
        </pattern>
        <Stripes id={`${uid}u`} colors={upper} />
        <Stripes id={`${uid}l`} colors={lower} />
        <linearGradient id={`${uid}sh`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
      </defs>

      {/* cabelo longo atrás */}
      {F && <path d="M27 24 C27 8 53 8 53 24 V44 C53 47 49 48 46 46 H34 C31 48 27 47 27 44 Z" fill={hair} />}
      {/* mochila (atrás) */}
      {backpack && <rect x="21" y="41" width="38" height="40" rx="9" fill={gear} />}

      {/* pernas */}
      <g {...hit(dress ? 'upper' : 'lower')}>
        {bot === 'calca' ? (
          <>
            <rect x="28" y="84" width="11.5" height="62" rx="5.75" fill={paint(lower, 'l')} {...line(anyL)} />
            <rect x="40.5" y="84" width="11.5" height="62" rx="5.75" fill={paint(lower, 'l')} {...line(anyL)} />
            <rect x="28" y="84" width="24" height="14" rx="5" fill={paint(lower, 'l')} />
            {!mono && !anyL && <rect x="28" y="84" width="24" height="62" fill={`url(#${uid}sh)`} style={{ pointerEvents: 'none' }} />}
          </>
        ) : (
          <>
            <rect x="29.5" y="90" width="9" height="56" rx="4.5" fill={skin} />
            <rect x="41.5" y="90" width="9" height="56" rx="4.5" fill={skin} />
            {bot === 'bermuda' && <>
              <path d="M28 88 C28 85.5 29.5 84 32 84 H48 C50.5 84 52 85.5 52 88 V114 H40.8 L40 104 L39.2 114 H28 Z" fill={paint(lower, 'l')} {...line(anyL)} />
              {!mono && !anyL && <path d="M28 88 C28 85.5 29.5 84 32 84 H48 C50.5 84 52 85.5 52 88 V114 H28 Z" fill={`url(#${uid}sh)`} style={{ pointerEvents: 'none' }} />}
            </>}
            {bot === 'saia' && <path d="M28 84 H52 L57.5 117 Q40 120.5 22.5 117 Z" fill={skirtPaint} {...skirtLine} />}
            {bot === 'vestido' && <path d="M25 84 H55 L60 124 Q40 128 20 124 Z" fill={skirtPaint} {...skirtLine} />}
          </>
        )}
        <path d="M26 146 c0-3 2-4 5-4 h7 c1.5 0 2 1 2 2.5 V149 H27.5 c-1 0-1.5-.7-1.5-1.5Z M54 146 c0-3-2-4-5-4 h-7 c-1.5 0-2 1-2 2.5 V149 H52.5 c1 0 1.5-.7 1.5-1.5Z" fill={shoe} />
      </g>

      {/* braços + tronco */}
      <g {...hit('upper')}>
        {sleeve < 40 && <>
          <rect x="16" y="42" width="8" height="40" rx="4" fill={skin} transform="rotate(8 20 44)" />
          <rect x="56" y="42" width="8" height="40" rx="4" fill={skin} transform="rotate(-8 60 44)" />
        </>}
        {sleeve > 0 && <>
          <rect x="15.5" y="42" width="9" height={sleeve} rx="4.5" fill={paint(upper, 'u')} transform="rotate(8 20 44)" {...line(anyU)} />
          <rect x="55.5" y="42" width="9" height={sleeve} rx="4.5" fill={paint(upper, 'u')} transform="rotate(-8 60 44)" {...line(anyU)} />
        </>}
        <circle cx="14.6" cy="82.5" r="3.6" fill={skin} />
        <circle cx="65.4" cy="82.5" r="3.6" fill={skin} />
        <path d="M24 46 C24 39 29 36 34 36 H46 C51 36 56 39 56 46 V86 C56 89 54 90 51 90 H29 C26 90 24 89 24 86 Z" fill={paint(upper, 'u')} {...line(anyU)} />
        {!mono && !anyU && <path d="M24 46 C24 39 29 36 34 36 H46 C51 36 56 39 56 46 V86 C56 89 54 90 51 90 H29 C26 90 24 89 24 86 Z" fill={`url(#${uid}sh)`} style={{ pointerEvents: 'none' }} />}
        {/* gola */}
        {!mono && top !== 'jaqueta' && <path d={top === 'regata' ? 'M34 36 Q40 45 46 36' : 'M35 36 Q40 42 45 36'} fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="1.4" strokeLinecap="round" />}
        {top === 'regata' && <path d="M24 46 C24 39 27 37 30 36.5 V48 C27 48 25 47 24 46 Z M56 46 C56 39 53 37 50 36.5 V48 C53 48 55 47 56 46 Z" fill={skin} />}
        {top === 'jaqueta' && !mono && <g fill="none" stroke="#000" strokeOpacity=".3" strokeLinecap="round"><path d="M40 40 V89" strokeWidth="1.3" /><path d="M34 36 L40 44 L46 36" strokeWidth="1.6" /><path d="M29 66 h6 M45 66 h6" strokeWidth="1.2" /></g>}
      </g>

      {backpack && <path d="M30.5 37 V64 M49.5 37 V64" stroke={gear} strokeWidth="3.4" strokeLinecap="round" />}
      {extras.includes('bolsa') && <><path d="M32 37 L57 74" stroke={mono ?? '#5b3d24'} strokeWidth="1.8" strokeLinecap="round" /><rect x="52" y="71" width="13" height="11" rx="3" fill={mono ?? '#7a5134'} /></>}
      {extras.includes('mala') && <><rect x="64" y="112" width="14" height="24" rx="3.5" fill={gear} /><path d="M68 112 V100 h6 v12" stroke={gear} strokeWidth="1.8" fill="none" /><circle cx="67" cy="138" r="1.8" fill={shoe} /><circle cx="75" cy="138" r="1.8" fill={shoe} /></>}
      {extras.includes('guarda-chuva') && <path d="M8 84 V122 a3.5 3.5 0 0 0 7 0" stroke={gear} strokeWidth="2.2" fill="none" strokeLinecap="round" />}

      {/* cabeça */}
      <g {...hit('head')}>
        <rect x="35.5" y="28" width="9" height="10" rx="3.5" fill={skin} />
        {!mono && <rect x="35.5" y="31" width="9" height="4" fill="#000" opacity=".12" />}
        <circle cx="40" cy="20" r="11.5" fill={skin} />
        {F
          ? <path d="M28.6 20 C28 9 34 7.5 40 7.5 C47 7.5 52.5 10 51.4 20 C48 14 44 13 40 12.8 C35 13 31 15 28.6 20 Z" fill={hair} />
          : <path d="M28.6 18.5 C28.6 10 33.5 7.6 40 7.6 C46.5 7.6 51.4 10 51.4 18.5 C49 14.5 45 13.4 40 13.4 C35 13.4 31 14.5 28.6 18.5 Z" fill={hair} />}
        {glasses && <g fill="none" stroke={mono ? '#0000' : '#0d0f14'} strokeWidth="1.4"><rect x="31.5" y="18" width="7" height="5" rx="2.2" /><rect x="41.5" y="18" width="7" height="5" rx="2.2" /><path d="M38.5 20 h3" /></g>}
        {extras.includes('mascara') && <path d="M31 23.5 Q40 21.5 49 23.5 L48 28 Q40 32 32 28 Z" fill={mono ?? '#e3e9f1'} />}
        {hat && <><path d="M28.3 16.5 C28.3 7 33 5 40 5 C47 5 51.7 7 51.7 16.5 Z" fill={mono ?? 'var(--tr-hat)'} /><path d="M40 16.5 H60 C60 18.6 58.6 19.6 56 19.6 H40 Z" fill={mono ?? 'var(--tr-hat)'} />{!mono && <path d="M28.3 16.5 H51.7" stroke="#000" strokeOpacity=".25" />}</>}
        {extras.includes('capacete') && !hat && <path d="M27.5 19 C27.5 6 33 3.5 40 3.5 C47 3.5 52.5 6 52.5 19 Z" fill={mono ?? '#e8b93a'} />}
      </g>
    </g>
  );
}

/** “Retrato falado” da busca: silhueta com as cores e acessórios pedidos. */
export function Figure({ size = 'lg', onPart, ...look }: Props) {
  return (
    <svg className={`tr-fig is-${size}`} viewBox="0 0 80 152" aria-hidden="true">
      <ellipse cx="40" cy="149.5" rx="20" ry="2.5" fill="#000" opacity=".25" />
      <FigureShape {...look} onPart={onPart} />
    </svg>
  );
}
