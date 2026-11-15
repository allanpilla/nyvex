import { useState } from 'react';
import { Button, Combobox, Icon, Segmented, Sheet } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { norm } from '../devices/parts';
import { descendants, pathOf, PLACE_TYPES, STREET_TYPES, UFS, ZONES, type Env, type Exposure, type Loc } from './data';
import { LayersButton, MapCanvas, PerimeterCard } from './parts';

type Props = { edit?: Loc; parentId?: string; locs: Loc[]; onClose: () => void; onSave: (l: Loc) => void };

/** Cadastro e edição no drawer lateral. Mesmas seções do sistema atual: Identificação e ambiente, Localização e Mapa (área monitorada). */
export function LocationForm({ edit, parentId, locs, onClose, onSave }: Props) {
  const { toast } = useUi();
  const parent0 = parentId ? locs.find((l) => l.id === parentId) : undefined;
  const [env, setEnv] = useState<Env>(edit?.env ?? parent0?.env ?? 'indoor');
  const [exposure, setExposure] = useState<Exposure>(edit?.exposure ?? (parent0?.env === 'outdoor' ? 'exposto' : 'abrigado'));
  const [autoName, setAutoName] = useState(edit?.autoName ?? false);
  const [name, setName] = useState(edit?.name ?? '');
  const [zone, setZone] = useState(edit?.zone ?? (parent0?.zone === 'Cidade' ? 'Bairro' : parent0?.zone === 'Bairro' ? 'Via' : parent0?.zone ?? ''));
  const [placeType, setPlaceType] = useState(edit?.placeType ?? '');
  const [parent, setParent] = useState<string | null>(edit?.parentId ?? parentId ?? null);
  const [building, setBuilding] = useState(edit?.building ?? '');
  const [floor, setFloor] = useState(edit?.floor ?? '');
  const [sector, setSector] = useState(edit?.sector ?? '');
  const [uf, setUf] = useState(edit?.uf ?? parent0?.uf ?? 'PR');
  const [city, setCity] = useState(edit?.city ?? parent0?.city ?? 'Curitiba');
  const [district, setDistrict] = useState(edit?.district ?? parent0?.district ?? '');
  const [street, setStreet] = useState(edit?.street ?? '');
  const [streetType, setStreetType] = useState(edit?.streetType ?? '');
  const [number, setNumber] = useState(edit?.number ?? '');
  const [lane, setLane] = useState(edit?.lane ?? '');
  const [flow, setFlow] = useState(edit?.flow ?? '');
  const [reference, setReference] = useState(edit?.reference ?? '');
  const [lat, setLat] = useState(String(edit?.lat ?? parent0?.lat ?? ''));
  const [lng, setLng] = useState(String(edit?.lng ?? parent0?.lng ?? ''));
  const [perimeter, setPerimeter] = useState(edit?.perimeter);
  const [touched, setTouched] = useState(false);

  const out = env === 'outdoor';
  const genName = out ? [street && `${street}${number ? `, ${number}` : ''}`, !street && district, !street && !district && city].filter(Boolean).join('') : '';
  const finalName = autoName && out ? genName : name.trim();
  const parentOpts = locs.filter((l) => l.id !== edit?.id && !(edit && descendants(edit.id, locs).some((d) => d.id === l.id)) && l.zone !== 'Via');
  const dup = locs.find((l) => l.parentId === parent && norm(l.name) === norm(finalName) && l.id !== edit?.id);
  const errors = {
    name: !finalName ? (autoName ? 'Preencha o endereço para gerar o nome' : 'Obrigatório') : dup ? 'Já existe um local com esse nome aqui' : '',
    uf: out && !uf ? 'Obrigatório' : '',
    city: out && !city.trim() ? 'Obrigatório' : '',
    street: out && zone === 'Via' && !street.trim() ? 'Obrigatório para vias' : '',
    lat: lat && (isNaN(Number(lat)) || Math.abs(Number(lat)) > 90) ? 'Latitude inválida' : '',
    lng: lng && (isNaN(Number(lng)) || Math.abs(Number(lng)) > 180) ? 'Longitude inválida' : '',
  };
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '');
  const nErr = Object.values(errors).filter(Boolean).length;

  const locate = () => {
    const p = locs.find((l) => l.id === parent) ?? locs.find((l) => l.id === 'curitiba');
    if (!p) return;
    setLat((p.lat + (Math.random() - 0.5) * 0.01).toFixed(6));
    setLng((p.lng + (Math.random() - 0.5) * 0.01).toFixed(6));
    toast('Coordenadas encontradas pelo endereço');
  };

  const save = () => {
    setTouched(true);
    if (nErr) return;
    const now = new Date().toISOString();
    onSave({
      ...(edit ?? { created: now, people: [] }),
      id: edit?.id ?? `novo-${Date.now()}`, name: finalName, autoName: autoName && out,
      kind: out && ['Cidade', 'Bairro', 'Via'].includes(zone) ? 'territorio' : 'instalacao',
      env, exposure, zone: zone.trim() || (out ? 'Via' : 'Predial'), placeType: placeType.trim() || undefined, parentId: parent,
      building: out ? undefined : building.trim() || undefined, floor: out ? undefined : floor.trim() || undefined, sector: out ? undefined : sector.trim() || undefined,
      uf: out ? uf : undefined, city: out ? city.trim() : undefined, district: out ? district.trim() || undefined : undefined, street: out ? street.trim() || undefined : undefined,
      streetType: out ? streetType || undefined : undefined, number: out ? number.trim() || undefined : undefined, lane: out ? lane.trim() || undefined : undefined,
      flow: out ? flow.trim() || undefined : undefined, reference: out ? reference.trim() || undefined : undefined,
      lat: Number(lat) || -25.4244, lng: Number(lng) || -49.2132, perimeter, updated: now,
    } as Loc);
  };

  return (
    <Sheet eyebrow={edit ? 'Editar local' : 'Novo local'} title={edit ? edit.name : finalName || 'Novo local'} onClose={onClose} onSubmit={save} width={600}
      footer={
        <>
          {touched && nErr > 0 && <span className="dv-form__err"><Icon name="errorFill" size={14} />{nErr === 1 ? '1 campo precisa de atenção' : `${nErr} campos precisam de atenção`}</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">Salvar local</button>
        </>
      }>
      <section className="dv-card2">
        <h3>Identificação e ambiente</h3>
        <div className="dv-row">
          <div className="dv-field">
            <span className="dv-field__l">Ambiente<i>*</i></span>
            <Segmented label="Ambiente" value={env} onChange={(v) => { setEnv(v); if (v === 'outdoor') setExposure('exposto'); }} options={[
              { value: 'indoor', label: <><Icon name="stack" size={14} />Interno</> },
              { value: 'outdoor', label: <><Icon name="map" size={14} />Externo</> },
            ]} />
          </div>
          <div className="dv-field">
            <span className="dv-field__l">Exposição</span>
            <Segmented label="Exposição" value={exposure} onChange={setExposure} options={[
              { value: 'abrigado', label: <><Icon name="shield" size={14} />Abrigado</> },
              { value: 'exposto', label: <><Icon name="sun" size={14} />Exposto</> },
            ]} />
          </div>
        </div>
        <div className="dv-row">
          <label className={`dv-field${err('name') ? ' is-err' : ''}`}>
            <span className="dv-field__l">Nome do local<i>*</i></span>
            <span className="nx-input"><input value={autoName && out ? genName : name} onChange={(e) => { setName(e.target.value); setAutoName(false); }} readOnly={autoName && out}
              placeholder={out ? 'Gerado pelo endereço ou digite' : 'Ex.: Bloco 10 — Reitoria'} autoFocus={!edit} /></span>
            {out && (
              <button type="button" className="dv-link dv-link--start lc-genname" onClick={() => setAutoName(!autoName)}>
                <Icon name={autoName ? 'sparkle' : 'refresh'} size={12} />{autoName ? 'Gerado a partir do endereço · editar' : 'Usar o endereço'}
              </button>
            )}
            {err('name') && <span className="dv-field__h">{err('name')}</span>}
          </label>
          <label className="dv-field">
            <span className="dv-field__l">Zona</span>
            <span className="nx-input"><input value={zone} onChange={(e) => setZone(e.target.value)} list="lc-zones" placeholder="Agrupamento operacional" /></span>
            <datalist id="lc-zones">{ZONES.map((z) => <option key={z} value={z} />)}</datalist>
          </label>
        </div>
        <label className="dv-field lc-half">
          <span className="dv-field__l">Tipo de lugar</span>
          <span className="nx-input"><input value={placeType} onChange={(e) => setPlaceType(e.target.value)} list="lc-ptypes" placeholder="Praça, Bar, Escola…" /></span>
          <datalist id="lc-ptypes">{PLACE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          <span className="dv-field__hint">Sugestões do catálogo; outros tipos também são aceitos.</span>
        </label>
      </section>

      <section className="dv-card2">
        <h3>Localização</h3>
        {!out ? (
          <>
            <label className="dv-field">
              <span className="dv-field__l">Prédio / bloco</span>
              <span className="nx-input"><input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Bloco A · Torre 1" /></span>
            </label>
            <div className="dv-row">
              <label className="dv-field"><span className="dv-field__l">Andar</span><span className="nx-input"><input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Térreo" /></span></label>
              <label className="dv-field"><span className="dv-field__l">Setor</span><span className="nx-input"><input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Recepção" /></span></label>
            </div>
          </>
        ) : (
          <>
            <div className="dv-row">
              <div className={`dv-field${err('uf') ? ' is-err' : ''}`}>
                <span className="dv-field__l">UF<i>*</i></span>
                <select className="nx-select lc-select" value={uf} onChange={(e) => setUf(e.target.value)} aria-label="UF">{UFS.map((u) => <option key={u}>{u}</option>)}</select>
              </div>
              <label className={`dv-field${err('city') ? ' is-err' : ''}`}>
                <span className="dv-field__l">Cidade<i>*</i></span>
                <span className="nx-input"><Icon name="search" size={14} /><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Buscar cidade" /></span>
                {err('city') && <span className="dv-field__h">{err('city')}</span>}
              </label>
            </div>
            <div className="dv-row">
              <label className="dv-field">
                <span className="dv-field__l">Bairro</span>
                <span className="nx-input"><Icon name="search" size={14} /><input value={district} onChange={(e) => setDistrict(e.target.value)} list="lc-districts" placeholder="Selecione…" /></span>
                <datalist id="lc-districts">{locs.filter((l) => l.zone === 'Bairro').map((l) => <option key={l.id} value={l.name} />)}</datalist>
              </label>
              <label className={`dv-field${err('street') ? ' is-err' : ''}`}>
                <span className="dv-field__l">Rua{zone === 'Via' && <i>*</i>}</span>
                <span className="nx-input"><Icon name="search" size={14} /><input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Buscar rua" /></span>
                {err('street') && <span className="dv-field__h">{err('street')}</span>}
              </label>
            </div>
            <div className="dv-row">
              <div className="dv-field">
                <span className="dv-field__l">Tipo de via</span>
                <select className="nx-select lc-select" value={streetType} onChange={(e) => setStreetType(e.target.value)} aria-label="Tipo de via">
                  <option value="">Selecione…</option>{STREET_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <label className="dv-field"><span className="dv-field__l">Nº / ponto de referência</span><span className="nx-input"><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1000" /></span></label>
            </div>
            <div className="dv-row">
              <label className="dv-field"><span className="dv-field__l">Faixa</span><span className="nx-input"><input value={lane} onChange={(e) => setLane(e.target.value)} placeholder="Faixa 2 de 3" /></span></label>
              <label className="dv-field"><span className="dv-field__l">Sentido / fluxo</span><span className="nx-input"><input value={flow} onChange={(e) => setFlow(e.target.value)} placeholder="Bairro → Centro" /></span></label>
            </div>
            <label className="dv-field">
              <span className="dv-field__l">Referência adicional</span>
              <span className="nx-input"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex.: em frente ao nº 1000, ao lado do metrô" /></span>
            </label>
          </>
        )}
        <div className="dv-field">
          <span className="dv-field__l">Local pai (opcional)</span>
          <Combobox label="Local pai" value={parent} searchPlaceholder="Buscar local…" placeholder="Nenhum (raiz)"
            onChange={(v) => setParent(v === '-' ? null : v)}
            options={[{ value: '-', label: 'Nenhum (raiz)' }, ...parentOpts.map((l) => ({ value: l.id, label: [...pathOf(l, locs).map((p) => p.name), l.name].join(' / '), meta: l.zone }))]} />
        </div>
      </section>

      <section className="dv-card2">
        <h3>Mapa e área monitorada</h3>
        <p>Posição do local e perímetro usado nas regras (cercas virtuais e camadas do mapa).</p>
        <MapCanvas pins={[{ id: 'x', x: 50, y: 48, label: finalName || 'Novo local', env, h: 'none', on: true }]} perimeter={perimeter}>
          <div className="lc-mapc__top"><span className="dv-tools__sp" /><LayersButton /></div>
        </MapCanvas>
        <PerimeterCard p={perimeter}
            onImport={() => { setPerimeter({ kind: 'area', vertices: 12, areaKm2: 0.006, color: '#2f8cff', opacity: 60, source: 'KML', updated: new Date().toISOString() }); toast('KML importado · simulado no protótipo'); }}
            onDraw={() => { setPerimeter({ kind: 'area', vertices: 6, areaKm2: 0.003, color: '#2f8cff', opacity: 60, source: 'Desenho', updated: new Date().toISOString() }); toast('Perímetro desenhado · simulado no protótipo'); }}
            onRemove={() => setPerimeter(undefined)} />
        <div className="lc-coords">
          <label className={`dv-field${err('lat') ? ' is-err' : ''}`}><span className="dv-field__l">Latitude</span><span className="nx-input"><input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" className="is-mono" placeholder="-25.4244" /></span></label>
          <label className={`dv-field${err('lng') ? ' is-err' : ''}`}><span className="dv-field__l">Longitude</span><span className="nx-input"><input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" className="is-mono" placeholder="-49.2132" /></span></label>
          <Button icon="pin" onClick={() => toast('Clique no mapa para pegar a posição · simulado no protótipo')}>Pegar do mapa</Button>
          {out && <Button icon="search" onClick={locate}>Localizar pelo endereço</Button>}
        </div>
      </section>
    </Sheet>
  );
}
