import { useId, useMemo } from 'react';
import { FigureShape, type FigureLook } from './Figure';

const PEOPLE: FigureLook[] = [
  { upper: ['azul'], lower: ['jeans'], backpack: true },
  { upper: ['vermelho'], lower: ['preto'], hat: true, gender: 'M' },
  { upper: ['branco'], lower: ['bege'], glasses: true, gender: 'F', extras: ['bolsa'] },
];
const X = [62, 142, 222]; // posição de cada pessoa; o centro fica em x + 38
const CY = 92;
// A lupa passa pelas três, para na do meio (achou) e volta.
const PATH = [100, 100, 180, 180, 260, 260, 100, 100];
const KT = '0;.1;.26;.46;.6;.7;.92;1';
const SPL = Array(7).fill('.45 0 .2 1').join(';');

/**
 * Ilustração animada do estado inicial: uma lupa varre três silhuetas em tons apagados e,
 * por dentro da lente, mostra as cores reais. Na pessoa do meio, ela para e marca o encontro.
 */
export function SearchMotion({ fast }: { fast?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const still = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const dur = fast ? '3.6s' : '7.5s';
  const tr = PATH.map((x) => `${x} ${CY}`).join(';');
  const people = (mono?: string) => PEOPLE.map((p, i) => (
    <g key={i} transform={`translate(${X[i]} 28) scale(.95)`}><FigureShape {...p} mono={mono} /></g>
  ));
  return (
    <svg className="tr-motion" viewBox="0 0 360 196" role="img" aria-label="Lupa procurando uma pessoa pela aparência" key={dur}>
      <defs>
        <clipPath id={`${uid}lens`}>
          <circle cx={still ? 180 : 100} cy={CY} r="31">
            {!still && <animate attributeName="cx" values={PATH.join(';')} keyTimes={KT} calcMode="spline" keySplines={SPL} dur={dur} repeatCount="indefinite" />}
          </circle>
        </clipPath>
        <radialGradient id={`${uid}glow`}>
          <stop offset="0" stopColor="var(--nx-primary)" stopOpacity=".45" />
          <stop offset="1" stopColor="var(--nx-primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}scan`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--nx-primary)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--nx-primary)" stopOpacity=".55" />
        </linearGradient>
      </defs>

      {/* chão */}
      <ellipse cx="180" cy="176" rx="150" ry="8" fill={`url(#${uid}glow)`} opacity=".35" />
      <path d="M30 175.5 H330" stroke="var(--tr-ghost-line)" strokeDasharray="2 5" strokeLinecap="round" />

      {/* destaque de quem bateu */}
      <ellipse cx="180" cy="171" rx="26" ry="5" fill="var(--nx-primary)" opacity={still ? 0.5 : 0}>
        {!still && <animate attributeName="opacity" values="0;0;.55;.55;0;0" keyTimes="0;.27;.31;.45;.5;1" dur={dur} repeatCount="indefinite" />}
      </ellipse>

      {/* silhuetas apagadas */}
      <g>{people('var(--tr-ghost)')}</g>

      {/* o que a lente revela: cores reais + linha de varredura */}
      <g clipPath={`url(#${uid}lens)`}>
        <rect x="0" y="0" width="360" height="196" fill="var(--tr-lens-bg)" />
        {people()}
        <rect x="0" y="60" width="360" height="10" fill={`url(#${uid}scan)`}>
          {!still && <animate attributeName="y" values="54;118;54" dur="1.6s" repeatCount="indefinite" />}
        </rect>
      </g>

      {/* lupa */}
      <g transform={still ? `translate(180 ${CY})` : undefined}>
        {!still && <animateTransform attributeName="transform" type="translate" values={tr} keyTimes={KT} calcMode="spline" keySplines={SPL} dur={dur} repeatCount="indefinite" />}
        <circle r="31" fill="none" stroke="var(--nx-primary)" strokeWidth="5" />
        <circle r="35" fill="none" stroke="var(--nx-primary)" strokeOpacity=".18" strokeWidth="3" />
        <path d="M-17 -22 A24 24 0 0 1 4 -27" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M23 23 L44 44" stroke="var(--nx-primary)" strokeWidth="9" strokeLinecap="round" />
        <path d="M23 23 L29 29" stroke="var(--tr-lens-ring)" strokeWidth="9" strokeLinecap="butt" />
      </g>

      {/* selo de encontrado */}
      <g transform="translate(212 40)" opacity={still ? 1 : 0}>
        {!still && <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.28;.32;.45;.49;1" dur={dur} repeatCount="indefinite" />}
        <circle r="10" fill="var(--nx-success)" />
        <path d="M-4.5 0 L-1.2 3.4 L4.8 -3.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle r="10" fill="none" stroke="var(--nx-success)" strokeWidth="2">
          {!still && <animate attributeName="r" values="10;10;18;18" keyTimes="0;.3;.4;1" dur={dur} repeatCount="indefinite" />}
          {!still && <animate attributeName="stroke-opacity" values="0;0;.8;0;0" keyTimes="0;.3;.31;.4;1" dur={dur} repeatCount="indefinite" />}
        </circle>
      </g>
    </svg>
  );
}
