import { useState } from 'react';
import { Button, Combobox, Icon, Segmented, Sheet } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { childrenOf, FLOOR_NAMES, isFloor, type Env, type Loc } from './data';
import { LayersButton, MapCanvas } from './parts';

type Props = { edit?: Loc; parentId?: string; locs: Loc[]; onClose: () => void; onSave: (l: Loc) => void };
type Mode = 'bloco' | 'andar';

// O mapa do formulário é esquemático: cada ponto percentual equivale a ~0,0001° em torno do campus.
const BASE = { lat: -25.4244, lng: -49.2132 };
const STEP = 0.0001;
const toXY = (lat: number, lng: number) => ({ x: Math.max(2, Math.min(98, 50 + (lng - BASE.lng) / STEP)), y: Math.max(2, Math.min(98, 50 - (lat - BASE.lat) / STEP)) });
const fromXY = (x: number, y: number) => ({ lat: +(BASE.lat + (50 - y) * STEP).toFixed(6), lng: +(BASE.lng + (x - 50) * STEP).toFixed(6) });

/** Cadastro de bloco do campus ou de andar de um bloco, no drawer lateral. */
export function LocationForm({ edit, parentId, locs, onClose, onSave }: Props) {
  const { toast } = useUi();
  const [mode, setMode] = useState<Mode>(edit ? (isFloor(edit) ? 'andar' : 'bloco') : parentId ? 'andar' : 'bloco');
  const floorMode = mode === 'andar';
  const [env, setEnv] = useState<Env>(edit?.env ?? 'indoor');
  const [name, setName] = useState(edit && !isFloor(edit) ? edit.name : '');
  const [floor, setFloor] = useState<string | null>(edit && isFloor(edit) ? edit.name : null);
  const [parent, setParent] = useState<string | null>(edit?.parentId ?? parentId ?? null);
  const [sector, setSector] = useState(edit?.sector ?? '');
  const parentLoc = locs.find((l) => l.id === parent);
  const start = edit ?? parentLoc;
  const [lat, setLat] = useState(String(start?.lat ?? ''));
  const [lng, setLng] = useState(String(start?.lng ?? ''));
  const [pick, setPick] = useState(false);
  const [touched, setTouched] = useState(false);

  const blocks = locs.filter((l) => !isFloor(l) && l.id !== edit?.id);
  const used = parent ? childrenOf(parent, locs).filter((l) => l.id !== edit?.id).map((l) => l.name) : [];
  const finalName = floorMode ? floor ?? '' : name.trim();
  const dup = floorMode ? !!floor && used.includes(floor) : locs.some((l) => !isFloor(l) && norm(l.name) === norm(finalName) && l.id !== edit?.id);
  const errors = {
    name: !finalName ? 'Obrigatório' : dup ? (floorMode ? 'Esse andar já existe neste bloco' : 'Já existe um bloco com esse nome') : '',
    parent: floorMode && !parent ? 'Escolha o bloco do andar' : '',
    lat: lat && (isNaN(Number(lat)) || Math.abs(Number(lat)) > 90) ? 'Latitude inválida' : '',
    lng: lng && (isNaN(Number(lng)) || Math.abs(Number(lng)) > 180) ? 'Longitude inválida' : '',
  };
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '');
  const nErr = Object.values(errors).filter(Boolean).length;

  const pos = toXY(Number(lat) || BASE.lat, Number(lng) || BASE.lng);
  const move = (x: number, y: number) => {
    const p = fromXY(x, y);
    setLat(String(p.lat)); setLng(String(p.lng));
    if (pick) { setPick(false); toast('Posição definida no mapa'); }
  };

  const save = () => {
    setTouched(true);
    if (nErr) return;
    const now = new Date().toISOString();
    const pl = floorMode ? parentLoc : undefined;
    onSave({
      ...(edit ?? { created: now, people: [], autoName: false, kind: 'instalacao', exposure: 'abrigado', zone: 'Predial' }),
      id: edit?.id ?? `novo-${Date.now()}`, name: finalName, parentId: floorMode ? parent : null,
      env: pl?.env ?? env, building: pl?.building ?? (floorMode ? undefined : edit?.building), floor: floorMode ? finalName : undefined,
      sector: sector.trim() || undefined, perimeter: edit?.perimeter,
      lat: Number(lat) || BASE.lat, lng: Number(lng) || BASE.lng, updated: now,
    } as Loc);
  };

  return (
    <Sheet eyebrow={edit ? (floorMode ? 'Editar andar' : 'Editar local') : floorMode ? 'Novo andar' : 'Novo local'}
      title={finalName ? (floorMode && parentLoc ? `${parentLoc.name} · ${finalName}` : finalName) : floorMode ? 'Novo andar' : 'Novo local'}
      onClose={onClose} onSubmit={save} width={600}
      footer={
        <>
          {touched && nErr > 0 && <span className="dv-form__err"><Icon name="errorFill" size={14} />{nErr === 1 ? '1 campo precisa de atenção' : `${nErr} campos precisam de atenção`}</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">{floorMode ? 'Salvar andar' : 'Salvar local'}</button>
        </>
      }>
      <section className="dv-card2">
        <h3>Identificação</h3>
        {!edit && (
          <div className="dv-field">
            <span className="dv-field__l">O que você está cadastrando</span>
            <Segmented<Mode> label="Tipo de cadastro" value={mode} onChange={(v) => { setMode(v); setTouched(false); }} options={[
              { value: 'bloco', label: <><Icon name="pin" size={14} />Bloco do campus</> },
              { value: 'andar', label: <><Icon name="stack" size={14} />Andar de um bloco</> },
            ]} />
          </div>
        )}
        {floorMode ? (
          <div className="dv-row">
            <div className={`dv-field${err('parent') ? ' is-err' : ''}`}>
              <span className="dv-field__l">Bloco<i>*</i></span>
              <Combobox label="Bloco" value={parent} placeholder="Escolha o bloco" invalid={!!err('parent')}
                onChange={(v) => { setParent(v); const b = locs.find((l) => l.id === v); if (b && !edit) { setLat(String(b.lat)); setLng(String(b.lng)); } }}
                options={blocks.map((l) => ({ value: l.id, label: l.name, meta: `${childrenOf(l.id, locs).length} andares` }))} />
              {err('parent') && <span className="dv-field__h">{err('parent')}</span>}
            </div>
            <div className={`dv-field${err('name') ? ' is-err' : ''}`}>
              <span className="dv-field__l">Andar<i>*</i></span>
              <Combobox label="Andar" value={floor} placeholder="Térreo, 1º andar…" invalid={!!err('name')} onChange={setFloor}
                options={FLOOR_NAMES.map((f) => ({ value: f, label: f, meta: used.includes(f) ? 'já existe' : undefined }))} />
              {err('name') && <span className="dv-field__h">{err('name')}</span>}
            </div>
          </div>
        ) : (
          <div className="dv-row">
            <label className={`dv-field${err('name') ? ' is-err' : ''}`}>
              <span className="dv-field__l">Nome do local<i>*</i></span>
              <span className="nx-input"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bloco 10 — Reitoria" autoFocus={!edit} /></span>
              {err('name') && <span className="dv-field__h">{err('name')}</span>}
            </label>
            <div className="dv-field">
              <span className="dv-field__l">Ambiente<i>*</i></span>
              <Segmented label="Ambiente" value={env} onChange={setEnv} options={[
                { value: 'indoor', label: <><Icon name="stack" size={14} />Interno</> },
                { value: 'outdoor', label: <><Icon name="map" size={14} />Externo</> },
              ]} />
            </div>
          </div>
        )}
        <label className="dv-field lc-half">
          <span className="dv-field__l">Setor <span className="al-opt">opcional</span></span>
          <span className="nx-input"><input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Recepção, Laboratórios…" /></span>
        </label>
      </section>

      <section className="dv-card2">
        <h3>Mapa</h3>
        <p>Arraste o pin para a posição {floorMode ? 'do andar' : 'do local'}, ou use “Pegar do mapa” e clique no ponto.</p>
        <MapCanvas pins={[{ id: 'x', x: pos.x, y: pos.y, label: finalName || 'Novo local', env, h: 'none', on: true }]} onMove={move} pick={pick}>
          <div className="lc-mapc__top">
            {pick && <span className="lc-mapc__hint"><Icon name="pin" size={14} />Clique no mapa para posicionar</span>}
            <span className="dv-tools__sp" /><LayersButton />
          </div>
        </MapCanvas>
        <div className="lc-coords">
          <label className={`dv-field${err('lat') ? ' is-err' : ''}`}><span className="dv-field__l">Latitude</span><span className="nx-input"><input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" className="is-mono" placeholder="-25.4244" /></span></label>
          <label className={`dv-field${err('lng') ? ' is-err' : ''}`}><span className="dv-field__l">Longitude</span><span className="nx-input"><input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" className="is-mono" placeholder="-49.2132" /></span></label>
          <Button icon="pin" className={pick ? 'is-active' : undefined} onClick={() => setPick(!pick)}>{pick ? 'Cancelar' : 'Pegar do mapa'}</Button>
        </div>
      </section>
    </Sheet>
  );
}
