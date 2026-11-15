import { useState } from 'react';
import { Checkbox, Icon, IconButton, Menu, useTooltip, useTooltipApi } from '../../ds/components';
import { KIND_ICON, KIND_LABEL, type Device, type Kind } from '../devices/data';
import { ENV_LABEL, HEALTH_LABEL, LAYERS, fmtDate, type Env, type Loc, type LocHealth } from './data';

export function EnvBadge({ env }: { env: Env }) {
  return <span className={`lc-env is-${env}`}><Icon name={env === 'indoor' ? 'stack' : 'map'} size={12} />{ENV_LABEL[env]}</span>;
}

export function HealthPill({ h, compact }: { h: LocHealth; compact?: boolean }) {
  const cls = h === 'ok' ? 'online' : h === 'warn' ? 'instavel' : h === 'bad' ? 'offline' : 'na';
  const tip = useTooltip(HEALTH_LABEL[h], undefined, !!compact, 'top');
  return <span className={`dv-conn is-${cls}${compact ? ' lc-dot' : ''}`} {...(compact ? tip : {})}><i />{compact ? null : HEALTH_LABEL[h]}</span>;
}

/** Contagem por categoria; o que tem problema aparece em destaque. */
export function DevCounts({ devs }: { devs: Device[] }) {
  if (!devs.length) return <span className="lc-none">0</span>;
  return (
    <span className="lc-counts">
      {(['camera', 'acesso', 'infra'] as Kind[]).map((k) => {
        const list = devs.filter((d) => d.kind === k);
        if (!list.length) return null;
        const on = list.filter((d) => d.situacao === 'ativo');
        const tone = on.some((d) => d.conn === 'offline') ? 'bad' : on.some((d) => d.conn === 'instavel') ? 'warn' : '';
        return <Count key={k} k={k} n={list.length} tone={tone} />;
      })}
    </span>
  );
}
function Count({ k, n, tone }: { k: Kind; n: number; tone: string }) {
  const tip = useTooltip(`${n} · ${KIND_LABEL[k]}`, undefined, true, 'top');
  return <span className={`lc-count${tone ? ` is-${tone}` : ''}`} {...tip}><Icon name={KIND_ICON[k]} size={14} />{n}</span>;
}

/* ───────────── mapa ───────────── */

type Pin = { id: string; x: number; y: number; label: string; env: Env; h: LocHealth; on?: boolean };

/** Mapa esquemático (sem tiles externos): ruas, quadras e os pins dos locais. */
export function MapCanvas({ pins, onPin, perimeter, tall, children }: {
  pins: Pin[]; onPin?: (id: string) => void; perimeter?: Loc['perimeter']; tall?: boolean; children?: React.ReactNode;
}) {
  const tip = useTooltipApi();
  const [zoom, setZoom] = useState(1);
  return (
    <div className={`lc-mapc${tall ? ' is-tall' : ''}`}>
      <div className="lc-mapc__world" style={{ transform: `scale(${zoom})` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="lc-mapc__bg">
          <path d="M-5 30 C20 26 40 34 60 28 S90 22 105 26" className="lc-st is-main" />
          <path d="M-5 72 C25 70 45 78 70 70 S95 66 105 68" className="lc-st" />
          <path d="M22 -5 C24 25 18 55 26 105" className="lc-st" />
          <path d="M64 -5 C60 30 70 60 62 105" className="lc-st is-main" />
          <path d="M-5 50 L105 54" className="lc-st is-thin" />
          <path d="M40 -5 L46 105" className="lc-st is-thin" />
          <path d="M84 -5 L80 105" className="lc-st is-thin" />
          <rect x="70" y="36" width="10" height="12" rx="1" className="lc-park" />
          <rect x="30" y="56" width="8" height="10" rx="1" className="lc-park" />
          {perimeter && (perimeter.kind === 'area'
            ? <path d="M38 34 L60 31 L66 46 L58 62 L40 64 L33 50 Z" className="lc-perim" style={{ fill: perimeter.color, opacity: perimeter.opacity / 100 * 0.5, stroke: perimeter.color }} />
            : <path d="M36 50 L64 52" className="lc-perim is-path" style={{ stroke: perimeter.color, opacity: perimeter.opacity / 100 }} />)}
        </svg>
        {pins.map((p) => (
          <button key={p.id} type="button" className={`lc-pin2 is-${p.env} is-h-${p.h}${p.on ? ' is-on' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}
            tabIndex={onPin ? 0 : -1} aria-label={p.label}
            onClick={() => onPin?.(p.id)} onMouseEnter={(e) => tip.show(e.currentTarget, `${p.label} · ${HEALTH_LABEL[p.h]}`, undefined, 'top')} onMouseLeave={tip.hide}>
            <Icon name="pin" size={p.on ? 22 : 16} />
          </button>
        ))}
      </div>
      <div className="lc-mapc__zoom">
        <IconButton icon="zoomIn" label="Aproximar" onClick={() => setZoom((z) => Math.min(2, z + 0.25))} tipPlace="right" />
        <IconButton icon="zoomOut" label="Afastar" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} tipPlace="right" />
      </div>
      <span className="lc-mapc__attr">© OpenStreetMap · CARTO</span>
      {children}
    </div>
  );
}

/** Menu de camadas do mapa, igual ao sistema atual. */
export function LayersButton() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [on, setOn] = useState<Set<string>>(new Set(LAYERS.slice(0, 3)));
  return (
    <>
      <button type="button" className="lc-mapbtn" onClick={(e) => setEl(el ? null : e.currentTarget)} aria-expanded={!!el}><Icon name="stack" size={14} />Camadas<Icon name="chevron" size={12} /></button>
      {el && (
        <Menu anchor={el} onClose={() => setEl(null)} className="dv-fmenu">
          <div className="dv-fmenu__body">
            {LAYERS.map((l) => <Checkbox key={l} label={l} checked={on.has(l)} onChange={() => setOn((s) => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; })}><span className="dv-fmenu__l">{l}</span></Checkbox>)}
          </div>
        </Menu>
      )}
    </>
  );
}

/** Cartão da área monitorada (perímetro KML/desenho) ou do limite territorial de referência. */
export function PerimeterCard({ p, onImport, onDraw, onRemove }: { p?: Loc['perimeter']; onImport: () => void; onDraw: () => void; onRemove?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="lc-perimcard">
      <button type="button" className="lc-perimcard__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <b>{p?.reference ? 'Limite territorial' : 'Área monitorada'}</b>
        {p && <span className={`lc-tag${p.reference ? ' is-ref' : ' is-on'}`}>{p.reference ? 'Referência' : 'Ativa'}</span>}
        <Icon name="chevron" size={14} className={open ? undefined : 'is-asc'} />
      </button>
      {open && (p ? (
        <>
          <dl className="lc-perimcard__dl">
            <div><dt>Fonte</dt><dd><Icon name="audit" size={12} />{p.source}</dd></div>
            <div><dt>Tipo</dt><dd>{p.kind === 'area' ? 'Área' : 'Caminho'}</dd></div>
            {p.areaKm2 != null && <div><dt>Área</dt><dd>{p.areaKm2.toLocaleString('pt-BR')} km²</dd></div>}
            <div><dt>Vértices</dt><dd>{p.vertices.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Atualizado</dt><dd>{fmtDate(p.updated)}</dd></div>
            <div><dt>Cor</dt><dd><i className="lc-swatch" style={{ background: p.color }} /></dd></div>
            <div><dt>Opacidade</dt><dd>{p.opacity}%</dd></div>
          </dl>
          {p.reference
            ? <p className="lc-perimcard__note">Limite oficial importado do OpenStreetMap. É dado de referência da árvore territorial e não pode ser editado nem removido aqui.</p>
            : <div className="lc-perimcard__acts"><IconButton icon="upload" label="Exportar KML" onClick={onImport} tipPlace="top" />{onRemove && <IconButton icon="trash" label="Remover perímetro" onClick={onRemove} tipPlace="top" />}</div>}
        </>
      ) : (
        <>
          <p className="lc-perimcard__note">Nenhum perímetro carregado.</p>
          <div className="lc-perimcard__acts is-wide">
            <button type="button" className="nx-btn nx-btn--secondary nx-btn--sm" onClick={onImport}><Icon name="upload" size={14} />Importar KML</button>
            <button type="button" className="nx-btn nx-btn--secondary nx-btn--sm" onClick={onDraw}><Icon name="edit" size={14} />Desenhar</button>
          </div>
        </>
      ))}
    </div>
  );
}
