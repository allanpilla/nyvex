// Gera uma "imagem de câmera" em SVG para o protótipo (sem vídeo real).
import type { Cam } from './data';

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const cache = new Map<string, string>();

export function sceneUrl(cam: Cam): string {
  const hit = cache.get(cam.id);
  if (hit) return hit;
  const r = rng(hash(cam.id));
  const W = 640, H = 360;
  const gray = cam.night;
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const tone = (l: number, hue: number, sat = 14) => (gray ? `hsl(0 0% ${l}%)` : `hsl(${hue} ${sat}% ${l}%)`);
  const hue = pick([24, 200, 210, 32, 160, 0]);
  let body = '';

  if (cam.outdoor) {
    const hz = 120 + r() * 50;
    body += `<rect width="${W}" height="${hz}" fill="url(#sky)"/>`;
    body += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="${tone(30, 90, 8)}"/>`;
    // prédios ao fundo
    let x = -20;
    while (x < W) {
      const w = 60 + r() * 120, h = 30 + r() * 70;
      body += `<rect x="${x}" y="${hz - h}" width="${w}" height="${h}" fill="${tone(22 + r() * 14, hue)}"/>`;
      for (let wy = hz - h + 8; wy < hz - 8; wy += 14) for (let wx = x + 8; wx < x + w - 10; wx += 16)
        if (r() > 0.55) body += `<rect x="${wx}" y="${wy}" width="7" height="6" fill="${tone(55 + r() * 25, 45, 40)}" opacity=".7"/>`;
      x += w + 4;
    }
    // árvores
    for (let i = 0; i < 5; i++) {
      const tx = r() * W, ty = hz - 10 + r() * 20, tr = 14 + r() * 26;
      body += `<rect x="${tx - 3}" y="${ty}" width="6" height="${tr}" fill="${tone(16, 30)}"/><circle cx="${tx}" cy="${ty}" r="${tr}" fill="${tone(20 + r() * 10, 120, 18)}"/>`;
    }
    // pista com faixas
    const vx = 200 + r() * 240;
    body += `<path d="M${vx - 40} ${hz} L${vx + 40} ${hz} L${W + 120} ${H} L${-120} ${H}Z" fill="${tone(24, 220, 5)}"/>`;
    for (let i = 0; i < 7; i++) {
      const t = i / 7, t2 = (i + 0.45) / 7;
      const y1 = hz + (H - hz) * t * t, y2 = hz + (H - hz) * t2 * t2;
      body += `<path d="M${vx} ${y1} L${vx} ${y2}" stroke="${tone(70, 50, 30)}" stroke-width="${1 + t * 6}" opacity=".7"/>`;
    }
    // vagas / carros
    for (let i = 0; i < 4; i++) {
      const cx = r() * W, cy = hz + 40 + r() * (H - hz - 70), s = 0.6 + (cy - hz) / (H - hz);
      body += `<rect x="${cx}" y="${cy}" width="${46 * s}" height="${22 * s}" rx="${6 * s}" fill="${gray ? tone(30 + r() * 40, 0) : pick(['#8a2b2b', '#2b3f8a', '#c9c9c9', '#222', '#6b6b6b'])}"/>`;
    }
  } else {
    const vx = 200 + r() * 240, vy = 130 + r() * 50;
    const bw = 150 + r() * 80, bh = 110 + r() * 40;
    const bx = vx - bw / 2, by = vy - bh / 2;
    body += `<rect width="${W}" height="${H}" fill="${tone(26, hue)}"/>`;
    // paredes laterais
    body += `<path d="M0 0 L${bx} ${by} L${bx} ${by + bh} L0 ${H}Z" fill="${tone(34 + r() * 10, hue)}"/>`;
    body += `<path d="M${W} 0 L${bx + bw} ${by} L${bx + bw} ${by + bh} L${W} ${H}Z" fill="${tone(20 + r() * 8, hue)}"/>`;
    // teto
    body += `<path d="M0 0 L${W} 0 L${bx + bw} ${by} L${bx} ${by}Z" fill="${tone(44, hue, 6)}"/>`;
    // piso
    body += `<path d="M0 ${H} L${W} ${H} L${bx + bw} ${by + bh} L${bx} ${by + bh}Z" fill="${tone(40 + r() * 10, 30, 10)}"/>`;
    for (let i = -6; i <= 6; i++) body += `<path d="M${vx + i * 12} ${by + bh} L${vx + i * 110} ${H}" stroke="${tone(30, 30)}" stroke-width="1" opacity=".5"/>`;
    // parede do fundo, porta e janela
    body += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${tone(48 + r() * 12, hue, 10)}"/>`;
    const dw = bw * 0.28;
    body += `<rect x="${bx + bw * 0.12}" y="${by + bh * 0.25}" width="${dw}" height="${bh * 0.75}" fill="${tone(gray ? 78 : 70, 200, 20)}"/>`;
    body += `<rect x="${bx + bw * 0.55}" y="${by + bh * 0.2}" width="${bw * 0.35}" height="${bh * 0.35}" fill="${tone(gray ? 85 : 75, 205, 30)}"/>`;
    // luminárias
    for (let i = 0; i < 3; i++) {
      const t = 0.25 + i * 0.25;
      body += `<rect x="${vx - 30 * (1 + t * 3)}" y="${by * (1 - t)}" width="${60 * (1 + t * 3)}" height="${3 + t * 6}" fill="#fff" opacity=".75"/>`;
    }
    // objetos: bancos, mesas, pessoas
    for (let i = 0; i < 3; i++) {
      const ox = r() * W * 0.8, oy = by + bh + 20 + r() * (H - by - bh - 60), s = 0.5 + (oy - by) / H;
      body += `<rect x="${ox}" y="${oy}" width="${90 * s}" height="${16 * s}" rx="3" fill="${gray ? tone(60, 0) : pick(['#c9a227', '#5c4632', '#3b4a5a', '#7a2f2f'])}"/>`;
      body += `<rect x="${ox + 6 * s}" y="${oy + 16 * s}" width="${4 * s}" height="${18 * s}" fill="${tone(18, 0)}"/><rect x="${ox + 80 * s}" y="${oy + 16 * s}" width="${4 * s}" height="${18 * s}" fill="${tone(18, 0)}"/>`;
    }
  }
  if (r() > 0.45) {
    const px = 120 + r() * 400, py = 210 + r() * 70, s = 0.8 + (py - 200) / 160;
    body += `<g fill="${tone(14, 220, 10)}" opacity=".9"><circle cx="${px}" cy="${py - 52 * s}" r="${8 * s}"/><rect x="${px - 10 * s}" y="${py - 44 * s}" width="${20 * s}" height="${30 * s}" rx="${6 * s}"/><rect x="${px - 9 * s}" y="${py - 16 * s}" width="${7 * s}" height="${26 * s}"/><rect x="${px + 2 * s}" y="${py - 16 * s}" width="${7 * s}" height="${26 * s}"/></g>`;
  }
  const osd = cam.name.replace(/&/g, 'e').replace(/·/g, '-');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gray ? '#2a2a2a' : '#1d2a44'}"/><stop offset="1" stop-color="${gray ? '#555' : '#4d5b73'}"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${Math.floor(r() * 99)}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .45 0"/></filter>
<filter id="b"><feGaussianBlur stdDeviation=".4"/></filter>
</defs>
<g filter="url(#b)">${body}</g>
<rect width="${W}" height="${H}" filter="url(#n)" opacity=".35"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<text x="${W - 14}" y="${H - 14}" text-anchor="end" font-family="monospace" font-size="11" fill="#fff" opacity=".55">${osd}</text>
</svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(cam.id, url);
  return url;
}
