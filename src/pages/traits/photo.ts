/**
 * Leitura de foto para a busca (protótipo): o navegador mede a cor média das regiões da imagem
 * e escolhe a cor mais próxima da paleta. Gênero, idade, acessórios, tipo, marca e placa ficam
 * para a pessoa conferir, porque aqui não há motor de visão de verdade.
 */
import { COLORS, type Color } from './data';
import { VCOLORS, type VColor } from './vehicles';

export type PhotoRead = { url: string; name: string; upper: Color; lower: Color; vcolor: VColor };

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function nearest<T extends string>(rgb: number[], list: { id: T; hex: string }[]): T {
  let best = list[0].id, d = Infinity;
  for (const c of list) {
    const [r, g, b] = hex(c.hex);
    // Peso maior no verde, como o olho percebe.
    const x = 2 * (r - rgb[0]) ** 2 + 4 * (g - rgb[1]) ** 2 + 3 * (b - rgb[2]) ** 2;
    if (x < d) { d = x; best = c.id; }
  }
  return best;
}
function avg(ctx: CanvasRenderingContext2D, w: number, h: number, [x0, x1, y0, y1]: number[]) {
  const d = ctx.getImageData(Math.round(w * x0), Math.round(h * y0), Math.max(1, Math.round(w * (x1 - x0))), Math.max(1, Math.round(h * (y1 - y0)))).data;
  const s = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; }
  const n = d.length / 4;
  return s.map((v) => v / n);
}

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(u); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(u); fail(new Error('Não foi possível abrir a imagem.')); };
    img.src = u;
  });
}

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX = 10 * 1024 * 1024;

export async function readPhoto(file: File): Promise<PhotoRead> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error('Use uma foto em JPG, PNG ou WEBP.');
  if (file.size > PHOTO_MAX) throw new Error('A foto deve ter no máximo 10 MB.');
  const img = await load(file);
  // Miniatura guardada com a busca (vai junto na auditoria).
  const k = Math.min(1, 360 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const { width: w, height: h } = c;
  const up = avg(ctx, w, h, [0.32, 0.68, 0.3, 0.52]);
  const lo = avg(ctx, w, h, [0.34, 0.66, 0.62, 0.86]);
  const mid = avg(ctx, w, h, [0.2, 0.8, 0.4, 0.7]);
  return {
    url: c.toDataURL('image/jpeg', 0.82),
    name: file.name,
    upper: nearest(up, COLORS.filter((x) => !x.lowerOnly && x.id !== 'colorida')),
    lower: nearest(lo, COLORS.filter((x) => x.id !== 'colorida')),
    vcolor: nearest(mid, VCOLORS),
  };
}
