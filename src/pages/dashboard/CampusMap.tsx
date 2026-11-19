import { useEffect, useRef, useState, type ReactNode } from 'react';
import maplibregl, { type Map as MlMap, type Marker, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { icons } from '../../ds/icons/icons';
import { CENTER, type MapCam } from './data';

export type View = '3d' | 'top';

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    sat: {
      type: 'raster', tileSize: 256, maxzoom: 19,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      attribution: '© Esri',
    },
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenFreeMap © OpenMapTiles © OpenStreetMap' },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0d111b' } },
    { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.15, 'raster-brightness-max': 0.82, 'raster-contrast': 0.05 } },
    {
      id: 'bld', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14,
      paint: {
        'fill-extrusion-color': '#33457e',
        'fill-extrusion-height': ['max', ['coalesce', ['get', 'render_height'], 0], 9],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.82,
      },
    },
  ],
};

const CAMERA = { '3d': { pitch: 58, bearing: -18 }, top: { pitch: 0, bearing: 0 } } as const;

type Props = {
  cams: MapCam[];
  visible: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  view: View;
  moving: boolean;
  heat: boolean;
  onMoved: (id: string, lngLat: [number, number]) => void;
  /** muda a cada pedido de "localizar no mapa" */
  focus: { id: string; n: number } | null;
  popup: (c: MapCam) => ReactNode;
  children?: ReactNode;
};

function pinEl(c: MapCam) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `pm-pin is-${c.state}`;
  el.setAttribute('aria-label', c.name);
  el.innerHTML = `<span class="pm-pin__ic">${c.state === 'off' ? icons.nosignal : icons.camera}</span>${c.alerts1h ? `<span class="pm-pin__n">${c.alerts1h}</span>` : ''}`;
  return el;
}

/** Mapa tático 3D do campus: satélite + prédios extrudados + pins das câmeras. */
export function CampusMap({ cams, visible, selected, onSelect, view, moving, heat, onMoved, focus, popup, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const [ready, setReady] = useState(false);
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  const cb = useRef({ onSelect, onMoved });
  cb.current = { onSelect, onMoved };

  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current!, style: STYLE, center: CENTER, zoom: 16.6, ...CAMERA['3d'],
      maxPitch: 75, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true },
    });
    m.on('load', () => {
      m.addSource('heat', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'heat', type: 'heatmap', source: 'heat', layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'w'], 0, 0, 60, 1],
          'heatmap-intensity': 1.1,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 14, 30, 18, 90],
          'heatmap-opacity': 0.75,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(242,174,64,.35)', 0.5, 'rgba(242,120,64,.6)', 0.8, 'rgba(223,28,65,.8)', 1, 'rgba(255,90,120,.9)'],
        },
      }, 'bld');
      setReady(true);
    });
    m.on('click', () => cb.current.onSelect(null));
    map.current = m;
    return () => { m.remove(); map.current = null; markers.current = {}; };
  }, []);

  // pins
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const live = markers.current;
    cams.forEach((c) => {
      let mk = live[c.id];
      if (!mk) {
        const el = pinEl(c);
        el.addEventListener('click', (e) => { e.stopPropagation(); cb.current.onSelect(c.id); });
        mk = new maplibregl.Marker({ element: el, draggable: false }).setLngLat([c.lng, c.lat]).addTo(m);
        mk.on('dragend', () => { const p = mk!.getLngLat(); cb.current.onMoved(c.id, [+p.lng.toFixed(6), +p.lat.toFixed(6)]); });
        live[c.id] = mk;
      }
      mk.setLngLat([c.lng, c.lat]);
      mk.setDraggable(moving);
      const el = mk.getElement();
      el.classList.toggle('is-hidden', !visible.has(c.id));
      el.classList.toggle('is-sel', selected === c.id);
      el.classList.toggle('is-moving', moving);
    });
  }, [cams, visible, selected, moving]);

  // heatmap
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('heat') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: cams.filter((c) => c.alerts24 > 0).map((c) => ({ type: 'Feature', properties: { w: c.alerts24 }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })),
    });
    m.setLayoutProperty('heat', 'visibility', heat ? 'visible' : 'none');
  }, [cams, heat, ready]);

  useEffect(() => { map.current?.easeTo({ ...CAMERA[view], duration: 700 }); }, [view]);

  useEffect(() => {
    const c = focus && cams.find((x) => x.id === focus.id);
    if (c) map.current?.flyTo({ center: [c.lng, c.lat], offset: [0, 190], zoom: Math.max(map.current.getZoom(), 17.4), duration: 900, essential: true });
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ao escolher um pin, traz ele para baixo do centro para o cartão caber em cima
  useEffect(() => {
    const m = map.current;
    const c = selected ? cams.find((x) => x.id === selected) : undefined;
    if (!m || !c) return;
    const p = m.project([c.lng, c.lat]);
    const h = m.getContainer().clientHeight, w = m.getContainer().clientWidth;
    if (p.y < 410 || p.x < 170 || p.x > w - 170 || p.y > h - 20) m.easeTo({ center: [c.lng, c.lat], offset: [0, Math.min(190, h / 2 - 40)], duration: 500 });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // popup acompanha o pin selecionado
  const sel = selected ? cams.find((c) => c.id === selected) : undefined;
  useEffect(() => {
    const m = map.current;
    if (!m || !sel) { setPt(null); return; }
    const upd = () => setPt(m.project([sel.lng, sel.lat]));
    upd();
    m.on('move', upd);
    return () => { m.off('move', upd); };
  }, [sel?.id, sel?.lng, sel?.lat]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (d: number) => map.current?.easeTo({ zoom: map.current.getZoom() + d, duration: 250 });

  return (
    <div className="pm-map">
      <div ref={box} className="pm-map__gl" />
      {sel && pt && !moving && (
        <div className="pm-pop" style={{ left: pt.x, top: pt.y }} onClick={(e) => e.stopPropagation()}>
          {popup(sel)}
        </div>
      )}
      <div className="pm-zoom">
        <button type="button" aria-label="Aproximar" onClick={() => zoom(0.7)}><span dangerouslySetInnerHTML={{ __html: icons.plus }} /></button>
        <button type="button" aria-label="Afastar" onClick={() => zoom(-0.7)}><span className="pm-minus" /></button>
      </div>
      {children}
    </div>
  );
}
