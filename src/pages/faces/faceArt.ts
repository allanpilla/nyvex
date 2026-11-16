// Retrato sintético (SVG) para o protótipo: silhueta com cabelo, pele e fundo variados. Não representa pessoas reais.
const cache = new Map<string, string>();
function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
export function faceUrl(seed: number, gray: boolean): string {
  const key = `${seed}-${gray}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(seed * 97 + 13);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const skin = pick(['#f1c7a5', '#e0a982', '#c98d63', '#a8704a', '#7d4f33', '#5c3a26']);
  const hair = pick(['#1d1611', '#3a2a1e', '#5a3d26', '#8a6a44', '#2b2b2b', '#b7a48a']);
  const bg = pick(['#3b4556', '#4a3f3a', '#33463f', '#45404f', '#2f3a4a', '#50483c']);
  const shirt = pick(['#2c3e66', '#6b2f36', '#2f5a48', '#454545', '#7a6a3a', '#20242c', '#8a8f99']);
  const long = r() > 0.55, beard = !long && r() > 0.7, glasses = r() > 0.75;
  const tilt = (r() - 0.5) * 8, cx = 50 + (r() - 0.5) * 6;
  const f = gray ? ' filter="url(#g)"' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="b" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#11141a"/></radialGradient>
<filter id="g"><feColorMatrix type="saturate" values="0"/></filter><filter id="s"><feGaussianBlur stdDeviation=".5"/></filter></defs>
<g${f}><rect width="100" height="100" fill="url(#b)"/>
<g filter="url(#s)" transform="rotate(${tilt} 50 60)">
${long ? `<path d="M${cx - 22} 46 Q${cx - 24} 86 ${cx - 14} 92 L${cx + 14} 92 Q${cx + 24} 86 ${cx + 22} 46 Z" fill="${hair}"/>` : ''}
<path d="M14 100 Q16 78 ${cx} 76 Q84 78 86 100 Z" fill="${shirt}"/>
<rect x="${cx - 7}" y="62" width="14" height="16" rx="5" fill="${skin}" opacity=".92"/>
<ellipse cx="${cx}" cy="48" rx="17" ry="21" fill="${skin}"/>
<path d="M${cx - 18} 46 Q${cx - 19} 24 ${cx} 24 Q${cx + 19} 24 ${cx + 18} 46 Q${cx + 12} 32 ${cx} 33 Q${cx - 12} 32 ${cx - 18} 46 Z" fill="${hair}"/>
<ellipse cx="${cx - 6.5}" cy="47" rx="2.2" ry="1.4" fill="#1a1410" opacity=".8"/><ellipse cx="${cx + 6.5}" cy="47" rx="2.2" ry="1.4" fill="#1a1410" opacity=".8"/>
<path d="M${cx - 1} 50 Q${cx - 2} 56 ${cx + 1.5} 56" stroke="#00000033" stroke-width="1.2" fill="none"/>
<path d="M${cx - 5} 61 Q${cx} 63 ${cx + 5} 61" stroke="#5a2e26" stroke-width="1.2" fill="none" opacity=".7"/>
${beard ? `<path d="M${cx - 15} 52 Q${cx - 13} 70 ${cx} 70 Q${cx + 13} 70 ${cx + 15} 52 Q${cx + 9} 64 ${cx} 64 Q${cx - 9} 64 ${cx - 15} 52 Z" fill="${hair}" opacity=".85"/>` : ''}
${glasses ? `<g fill="none" stroke="#111" stroke-width="1.1" opacity=".85"><circle cx="${cx - 6.5}" cy="47" r="4.4"/><circle cx="${cx + 6.5}" cy="47" r="4.4"/><path d="M${cx - 2} 47 h4"/></g>` : ''}
</g>
<rect width="100" height="100" fill="#000" opacity="${(0.05 + r() * 0.15).toFixed(2)}"/></g></svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(key, url);
  return url;
}

/**
 * Foto de rosto gerado por IA (StyleGAN, conjunto “100k-faces” de ozgrozer): pessoas que não existem.
 * As 200 fotos são baixadas no build (scripts/fetch-faces.sh) e servidas junto com o protótipo.
 */
export const PHOTOS = 200;
export const photoUrl = (seed: number) => `./faces/${String(seed % PHOTOS).padStart(3, '0')}.jpg`;
