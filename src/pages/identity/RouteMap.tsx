import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { type Map as MlMap, type Marker, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { icons } from '../../ds/icons/icons';
import { buildCams, CENTER, loadPos } from '../dashboard/data';

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    sat: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: '© Esri' },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0d111b' } },
    { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.6, 'raster-brightness-max': 0.62, 'raster-contrast': 0.05 } },
  ],
};

export type Stop = { camId: string; label: string; time: string };

/** Trajeto do dia sobre o mapa do campus: câmeras na ordem em que a pessoa (ou o veículo) foi vista. */
export function RouteMap({ stops, active, onPick }: { stops: Stop[]; active: number | null; onPick: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marks = useRef<Marker[]>([]);
  const ready = useRef(false);
  const pick = useRef(onPick);
  pick.current = onPick;
  const pos = useMemo(() => { const cams = buildCams(loadPos()); return (id: string) => cams.find((c) => c.id === id); }, []);
  const coords = stops.map((s) => pos(s.camId)).filter(Boolean).map((c) => [c!.lng, c!.lat] as [number, number]);

  const draw = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    marks.current.forEach((k) => k.remove());
    marks.current = [];
    (m.getSource('route') as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
    // Uma marca por câmera; se a câmera repete, mostra os números juntos.
    const byCam = new Map<string, number[]>();
    stops.forEach((s, i) => byCam.set(s.camId, [...(byCam.get(s.camId) ?? []), i]));
    byCam.forEach((idx, camId) => {
      const c = pos(camId);
      if (!c) return;
      const el = document.createElement('button');
      el.type = 'button';
      const first = idx[0] === 0, lastStop = idx.includes(stops.length - 1);
      el.className = `id-rpin${first ? ' is-first' : ''}${lastStop ? ' is-last' : ''}${active != null && idx.includes(active) ? ' is-on' : ''}`;
      el.innerHTML = `<span>${idx.map((i) => i + 1).join(' · ')}</span>`;
      el.setAttribute('aria-label', `${stops[idx[0]].label} · ${idx.map((i) => stops[i].time).join(', ')}`);
      el.addEventListener('click', (e) => { e.stopPropagation(); pick.current(idx[0]); });
      marks.current.push(new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(m));
    });
    if (coords.length) {
      const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
      m.fitBounds(b, { padding: 70, maxZoom: 17.4, duration: 600 });
    }
  };

  useEffect(() => {
    const m = new maplibregl.Map({ container: box.current!, style: STYLE, center: CENTER, zoom: 16.2, attributionControl: { compact: true } });
    m.on('load', () => {
      m.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } });
      m.addLayer({ id: 'route-glow', type: 'line', source: 'route', paint: { 'line-color': '#375dfb', 'line-width': 9, 'line-opacity': 0.22, 'line-blur': 3 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      m.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#7d9bff', 'line-width': 2.5, 'line-dasharray': [2, 1.4] }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      ready.current = true;
      draw();
    });
    map.current = m;
    return () => { m.remove(); map.current = null; ready.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(draw, [stops, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (d: number) => map.current?.easeTo({ zoom: map.current.getZoom() + d, duration: 250 });
  return (
    <div className="pm-map id-rmap">
      <div ref={box} className="pm-map__gl" />
      {!stops.length && <div className="id-rmap__empty">Nenhum avistamento neste dia</div>}
      <div className="pm-zoom id-rmap__zoom">
        <button type="button" aria-label="Aproximar" onClick={() => zoom(0.7)}><span dangerouslySetInnerHTML={{ __html: icons.plus }} /></button>
        <button type="button" aria-label="Afastar" onClick={() => zoom(-0.7)}><span className="pm-minus" /></button>
      </div>
    </div>
  );
}
