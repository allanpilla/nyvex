import { useId } from 'react';
import { COLOR, type Color, type Extra, type Gender } from './data';

type Props = {
  upper: Color[];
  lower: Color[];
  gender?: Gender | '';
  hat?: boolean;
  glasses?: boolean;
  backpack?: boolean;
  extras?: Extra[];
  /** Retrato grande e clicável (painel de filtros) ou miniatura (card). */
  size?: 'lg' | 'sm';
  onPart?: (p: 'upper' | 'lower' | 'head') => void;
};

/** Paint de várias cores: listras verticais. Sem cor escolhida: “qualquer” (tracejado). */
function Fill({ id, colors }: { id: string; colors: Color[] }) {
  if (colors.length < 2) return null;
  const w = 100 / colors.length;
  return (
    <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
      {colors.flatMap((c, i) => [<stop key={`${c}a`} offset={`${i * w}%`} stopColor={COLOR[c].hex} />, <stop key={`${c}b`} offset={`${(i + 1) * w}%`} stopColor={COLOR[c].hex} />])}
    </linearGradient>
  );
}

/** “Retrato falado” da busca: silhueta com as cores e acessórios pedidos. */
export function Figure({ upper, lower, gender = '', hat, glasses, backpack, extras = [], size = 'lg', onPart }: Props) {
  const uid = useId().replace(/:/g, '');
  const paint = (cs: Color[], k: string) => (cs.length === 0 ? 'var(--tr-any)' : cs.length === 1 ? COLOR[cs[0]].hex : `url(#${uid}${k})`);
  const anyU = upper.length === 0, anyL = lower.length === 0;
  const click = (p: 'upper' | 'lower' | 'head') => (onPart ? { onClick: () => onPart(p), className: 'tr-fig__hit' } : {});
  return (
    <svg className={`tr-fig is-${size}`} viewBox="0 0 80 150" aria-hidden="true">
      <defs>
        <Fill id={`${uid}u`} colors={upper} />
        <Fill id={`${uid}l`} colors={lower} />
      </defs>
      {/* mochila atrás do corpo */}
      {backpack && <rect x="22" y="40" width="36" height="40" rx="8" fill="#3a3f4b" stroke="#00000055" />}
      {/* pernas */}
      <g {...click('lower')}>
        <path d="M27 86 H53 L52 140 a3 3 0 0 1 -3 3 H44 a2 2 0 0 1 -2 -2 L40.5 100 L38 141 a2 2 0 0 1 -2 2 H31 a3 3 0 0 1 -3 -3 Z"
          fill={paint(lower, 'l')} stroke={anyL ? 'var(--tr-any-stroke)' : '#00000040'} strokeDasharray={anyL ? '3 2.5' : undefined} strokeWidth="1" />
        <path d="M30 143 h9 v4 h-11 a2 2 0 0 1 2 -4Z M42 143 h9 a2 2 0 0 1 2 4 h-11Z" fill="var(--tr-shoe)" />
      </g>
      {/* tronco e braços */}
      <g {...click('upper')}>
        <path d="M24 40 Q26 33 34 32 H46 Q54 33 56 40 L60 70 Q61 76 58 77 L55 77 L53 60 L53 90 H27 L27 60 L25 77 L22 77 Q19 76 20 70 Z"
          fill={paint(upper, 'u')} stroke={anyU ? 'var(--tr-any-stroke)' : '#00000040'} strokeDasharray={anyU ? '3 2.5' : undefined} strokeWidth="1" />
      </g>
      {/* alças da mochila */}
      {backpack && <path d="M31 33 L30 60 M49 33 L50 60" stroke="#2a2e37" strokeWidth="3" strokeLinecap="round" />}
      {/* bolsa a tiracolo */}
      {extras.includes('bolsa') && <><path d="M33 33 L55 72" stroke="#6b4a2e" strokeWidth="1.6" /><rect x="51" y="70" width="12" height="10" rx="2" fill="#7a5134" /></>}
      {extras.includes('mala') && <><rect x="61" y="104" width="14" height="22" rx="3" fill="#4a5060" /><path d="M66 104 V92 h5 v12" stroke="#4a5060" strokeWidth="1.6" fill="none" /><circle cx="64" cy="128" r="1.6" fill="#22252c" /><circle cx="72" cy="128" r="1.6" fill="#22252c" /></>}
      {extras.includes('guarda-chuva') && <path d="M14 76 V112 a3 3 0 0 0 6 0" stroke="#5c6070" strokeWidth="2" fill="none" />}
      {/* cabeça */}
      <g {...click('head')}>
        {gender === 'F' && <path d="M27 20 Q27 4 40 4 Q53 4 53 20 L54 36 Q47 38 40 36 Q33 38 26 36 Z" fill="var(--tr-hair)" />}
        <rect x="36" y="26" width="8" height="8" rx="3" fill="var(--tr-skin)" />
        <ellipse cx="40" cy="17" rx="10" ry="12" fill="var(--tr-skin)" />
        {gender !== 'F' && <path d="M30 15 Q30 5 40 5 Q50 5 50 15 Q46 9 40 10 Q34 9 30 15Z" fill="var(--tr-hair)" />}
        {gender === 'F' && <path d="M30 15 Q31 6 40 6 Q49 6 50 15 Q44 10 40 10.5 Q35 10 30 15Z" fill="var(--tr-hair)" />}
        {glasses && <g fill="none" stroke="#0d0f14" strokeWidth="1.3"><circle cx="36" cy="17" r="3.2" /><circle cx="44" cy="17" r="3.2" /><path d="M39.2 17 h1.6" /></g>}
        {extras.includes('mascara') && <path d="M32 20 Q40 18 48 20 L47 25 Q40 29 33 25 Z" fill="#dfe6ef" stroke="#00000030" />}
        {hat && <path d="M29 12 Q30 3 40 3 Q50 3 51 12 L58 13 Q58 15 51 15 H29 Z" fill="var(--tr-hat)" />}
        {extras.includes('capacete') && !hat && <path d="M28 15 Q28 1 40 1 Q52 1 52 15 Z" fill="#e8b93a" stroke="#00000040" />}
      </g>
    </svg>
  );
}
