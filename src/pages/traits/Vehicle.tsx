import { VCOLOR, type VColor, type VType } from './vehicles';

type Props = { type?: VType; colors?: VColor[]; size?: 'lg' | 'sm' };

const GLASS = '#0f141c';
const TIRE = '#14161b';

/** Ilustração do veículo de lado, no mesmo estilo flat do boneco. Sem cor escolhida, fica em aberto (tracejado). */
export function Vehicle({ type = 'carro', colors = [], size = 'lg' }: Props) {
  const any = colors.length === 0;
  const fill = any ? 'var(--tr-any)' : VCOLOR[colors[0]].hex;
  // Contorno claro para o veículo escuro não sumir no fundo escuro.
  const line = any ? { stroke: 'var(--tr-any-stroke)', strokeWidth: 1, strokeDasharray: '3 3' } : { stroke: '#fff', strokeOpacity: .22, strokeWidth: 1 };
  const wheel = (cx: number, cy: number, r: number) => (
    <g key={cx}><circle cx={cx} cy={cy} r={r} fill={TIRE} /><circle cx={cx} cy={cy} r={r * .48} fill="#9aa1ac" /><circle cx={cx} cy={cy} r={r * .16} fill={TIRE} /></g>
  );
  let body: JSX.Element;
  switch (type) {
    case 'carro': body = (<>
      <path d="M16 58 V38 Q16 27 27 26 L92 25 Q100 25 106 30 L120 41 Q140 43 145 49 V58 Q145 63 140 63 H21 Q16 63 16 58 Z" fill={fill} {...line} />
      <path d="M24 39 V33 Q24 30 28 30 H60 V41 H27 Q24 41 24 39 Z M64 30 H90 Q96 30 100 33 L109 41 H64 Z" fill={GLASS} />
      <path d="M16 46 H145" stroke="#000" strokeOpacity=".18" />
      {[wheel(42, 63, 11), wheel(120, 63, 11)]}
    </>); break;
    case 'sedan': body = (<>
      <path d="M8 57 V47 Q8 43 14 42 L38 41 L54 28 Q58 25 64 25 H98 Q105 25 110 30 L124 41 Q145 43 151 49 V57 Q151 63 146 63 H13 Q8 63 8 57 Z" fill={fill} {...line} />
      <path d="M44 41 L56 31 Q59 29 63 29 H78 V41 Z M82 29 H97 Q102 29 106 32 L114 41 H82 Z" fill={GLASS} />
      <path d="M8 49 H151" stroke="#000" strokeOpacity=".18" />
      {[wheel(38, 63, 11), wheel(124, 63, 11)]}
    </>); break;
    case 'suv': body = (<>
      <path d="M12 58 V30 Q12 19 24 19 H104 Q111 19 116 25 L128 39 Q147 41 149 48 V58 Q149 63 144 63 H17 Q12 63 12 58 Z" fill={fill} {...line} />
      <path d="M20 37 V27 Q20 24 24 24 H58 V37 Z M62 24 H102 Q107 24 110 28 L119 37 H62 Z" fill={GLASS} />
      <path d="M12 47 H149" stroke="#000" strokeOpacity=".18" />
      <path d="M22 16 H96" stroke="#3a3f48" strokeWidth="2.4" strokeLinecap="round" />
      {[wheel(40, 63, 12.5), wheel(124, 63, 12.5)]}
    </>); break;
    case 'onibus': body = (<>
      <rect x="4" y="8" width="152" height="54" rx="8" fill={fill} {...line} />
      <path d="M10 14 H124 V34 H10 Z" fill={GLASS} />
      <path d="M34 14 V34 M58 14 V34 M82 14 V34 M106 14 V34" stroke={fill} strokeWidth="3" />
      <path d="M130 14 H150 V56 H130 Z" fill={GLASS} />
      <path d="M140 14 V56" stroke={fill} strokeWidth="2" />
      <path d="M4 42 H130" stroke="#000" strokeOpacity=".2" strokeWidth="3" />
      {[wheel(32, 63, 11), wheel(112, 63, 11)]}
    </>); break;
    case 'moto': body = (<>
      <path d="M36 60 L58 42 M122 60 L108 30" stroke="#5b616d" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M54 46 L66 38 H86 L92 30 H106 L112 40 L100 52 H64 Z" fill={fill} {...line} />
      <path d="M58 37 H84" stroke="#23262d" strokeWidth="5" strokeLinecap="round" />
      <path d="M104 26 L114 22" stroke="#23262d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="54" r="7" fill="#3a3f48" />
      {[wheel(36, 60, 13), wheel(122, 60, 13)]}
    </>); break;
    case 'bicicleta': body = (<>
      {[38, 122].map((x) => <g key={x}><circle cx={x} cy="56" r="17" fill="none" stroke={TIRE} strokeWidth="4" /><circle cx={x} cy="56" r="13" fill="none" stroke="#9aa1ac" strokeWidth=".8" opacity=".5" /><circle cx={x} cy="56" r="2.5" fill="#9aa1ac" /></g>)}
      <path d="M38 56 L70 56 L60 30 Z M70 56 L108 30 H60 M108 30 L122 56 M108 30 L104 20 H114" fill="none" stroke={any ? 'var(--tr-any-stroke)' : fill} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={any ? '4 3' : undefined} />
      <path d="M53 24 H67" stroke="#23262d" strokeWidth="4.5" strokeLinecap="round" />
    </>); break;
  }
  return (
    <svg className={`tr-veh is-${size}`} viewBox="0 0 160 80" aria-hidden="true">
      <ellipse cx="80" cy="76" rx="70" ry="3" fill="#000" opacity=".25" />
      {body}
    </svg>
  );
}
