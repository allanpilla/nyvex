import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Icon, IconButton, Segmented, Select, Switch, Tabs } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { CAMS, CAM_BY_ID } from '../mural/data';
import { sceneUrl } from '../mural/scene';
import { profileFor, type Device } from './data';
import { StatusPill } from './parts';
import './camera.css';

type Tab = 'perimetro' | 'imagem' | 'acoes' | 'diag' | 'homolog' | 'ia';
type Tool = 'mover' | 'linha' | 'poligono' | 'mascara';
type Pt = [number, number];
type Dir = 'ab' | 'ba' | 'ambos';
type Cam = Pick<Device, 'id' | 'name' | 'vendor' | 'model' | 'ip' | 'port' | 'certified' | 'situacao' | 'conn'> & { camId?: string };

const IMG0 = { brilho: 50, contraste: 50, saturacao: 50, nitidez: 50 };
const LIGHT = [
  { value: 'inteligente', label: 'Luz noturna inteligente' },
  { value: 'ir', label: 'Infravermelho' },
  { value: 'branca', label: 'Luz branca' },
  { value: 'off', label: 'Desligada' },
];
type Need = 'area' | 'linha' | 'licenca' | null;
type Algo = { k: string; label: string; code: string; desc: string; need: Need; on: boolean };
const AI_GROUPS: [string, Algo[]][] = [
  ['Perímetro e área', [
    { k: 'intrusao', label: 'Intrusão', code: 'INTRUSION_DETECTION', desc: 'Pessoa entrando na área de interesse configurada.', need: 'area', on: true },
    { k: 'linha', label: 'Cruzamento de linha', code: 'LINE_CROSSING', desc: 'Pessoa cruzando a linha virtual no sentido definido.', need: 'linha', on: true },
    { k: 'contagem', label: 'Contagem de pessoas', code: 'PEOPLE_COUNTING', desc: 'Conta quem cruza a linha virtual, separando entrada e saída. Não gera alerta: o resultado fica em Inteligência.', need: 'linha', on: false },
    { k: 'permanencia', label: 'Permanência indevida', code: 'PERMANENCIA_INDEVIDA', desc: 'Pessoa parada na área de interesse por mais tempo que o configurado.', need: 'area', on: false },
    { k: 'ocupacao', label: 'Ocupação da zona', code: 'QUEUE_OCCUPANCY', desc: 'Número de pessoas na área acima do limite.', need: 'area', on: false },
  ]],
  ['Objetos e veículos', [
    { k: 'veiculos', label: 'Detecção de veículos', code: 'VEHICLE_DETECTION', desc: 'Veículo entrando ou parado na área de interesse.', need: 'area', on: false },
    { k: 'abandono', label: 'Objeto abandonado', code: 'ABANDONED_OBJECT', desc: 'Objeto deixado na cena por mais tempo que o configurado.', need: null, on: false },
  ]],
  ['Identificação', [
    { k: 'face', label: 'Reconhecimento facial', code: 'FACE_RECOGNITION', desc: 'Compara rostos com as listas de pessoas cadastradas.', need: 'licenca', on: false },
    { k: 'lpr', label: 'Leitura de placas (LPR)', code: 'LPR', desc: 'Lê placas de veículos e compara com as listas cadastradas.', need: 'licenca', on: false },
  ]],
];
const AI = AI_GROUPS.flatMap(([, l]) => l);
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
type Sched = { de: string; ate: string; dias: number[] };
const schedText = (h?: Sched) => {
  if (!h) return null;
  const hrs = h.de && h.ate ? `${h.de}–${h.ate}` : 'Dia todo';
  const d = h.dias.length === 7 || !h.dias.length ? 'todos os dias' : h.dias.join() === '0,1,2,3,4' ? 'Seg a Sex' : h.dias.map((i) => DAYS[i]).join(', ');
  return `${hrs} · ${d}`;
};
const DIAG: [string, string][] = [['Ping', '4 ms'], ['Stream RTSP', 'H.264 · 1920×1080 · 15 fps'], ['Controle ISAPI / ONVIF', 'Respondendo'], ['Relógio (NTP)', 'Sincronizado · desvio 0,2 s'], ['Cartão SD', '58% livre']];

const uuid = (s: string) => {
  let h = 2166136261;
  const hex = Array.from({ length: 32 }, (_, i) => { h = Math.imul(h ^ s.charCodeAt(i % s.length) ^ i, 16777619); return ((h >>> 0) % 16).toString(16); }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Ajustes de câmera: estúdio visual (perímetro, linha e máscara sobre o vídeo) e as abas de imagem, ações, diagnóstico, homologação e IA do sistema atual. */
export function CameraSettings({ d, onClose, preview }: { d: Cam; onClose: () => void; preview?: boolean }) {
  const { toast } = useUi();
  const prof = profileFor(d);
  const direct = d.certified; // perfil genérico (ONVIF/RTSP) não tem controle direto da câmera
  const offline = d.situacao === 'inativo' || d.conn === 'offline';
  const cam = (d.camId && CAM_BY_ID[d.camId]) || CAMS[0];
  const [tab, setTab] = useState<Tab>('perimetro');
  const [tool, setTool] = useState<Tool>('mover');
  const [grid, setGrid] = useState(false);
  const [poly, setPoly] = useState<Pt[]>([[200, 330], [800, 330], [860, 800], [140, 800]]);
  const [line, setLine] = useState<[Pt, Pt]>([[150, 690], [850, 690]]);
  const [mask, setMask] = useState<[Pt, Pt] | null>(null);
  const [draft, setDraft] = useState<Pt[] | null>(null);
  const [drag, setDrag] = useState<{ k: 'poly' | 'line' | 'mask'; i: number } | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [dirty, setDirty] = useState(false);
  const [fire, setFire] = useState(false);
  const [img, setImg] = useState(IMG0);
  const [light, setLight] = useState('inteligente');
  const [led, setLed] = useState(60);
  const [sens, setSens] = useState(75);
  const [dir, setDir] = useState<Dir>('ambos');
  const [ai, setAi] = useState<Record<string, boolean>>(Object.fromEntries(AI.map((a) => [a.k, a.on])));
  const [sched, setSched] = useState<Record<string, Sched>>({ intrusao: { de: '18:00', ate: '06:00', dias: [0, 1, 2, 3, 4, 5, 6] } });
  const [limit, setLimit] = useState('4');
  const [diag, setDiag] = useState<'idle' | 'run' | 'done'>('idle');
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.nx-menu')) { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onClose]);

  const at = (e: React.PointerEvent | React.MouseEvent): Pt => {
    const r = svg.current!.getBoundingClientRect();
    const c = (v: number) => Math.round(Math.max(0, Math.min(1000, v)));
    return [c(((e.clientX - r.left) / r.width) * 1000), c(((e.clientY - r.top) / r.height) * 1000)];
  };
  const down = (e: React.PointerEvent) => {
    const p = at(e);
    if (tool === 'linha') { setDraft([p, p]); setDrag({ k: 'line', i: 1 }); setLine([p, p]); }
    else if (tool === 'mascara') { setMask([p, p]); setDrag({ k: 'mask', i: 1 }); }
    else if (tool === 'poligono') {
      const pts = draft ?? [];
      if (pts.length >= 3 && Math.hypot(pts[0][0] - p[0], pts[0][1] - p[1]) < 30) { setPoly(pts); setDraft(null); setTool('mover'); setDirty(true); return; }
      setDraft([...pts, p]);
      return;
    } else return;
    svg.current?.setPointerCapture(e.pointerId);
    setDirty(true);
  };
  const move = (e: React.PointerEvent) => {
    const p = at(e);
    setCursor(p);
    if (!drag) return;
    if (drag.k === 'poly') setPoly((l) => l.map((q, i) => (i === drag.i ? p : q)));
    if (drag.k === 'line') setLine((l) => (drag.i === 0 ? [p, l[1]] : [l[0], p]));
    if (drag.k === 'mask') setMask((m) => (m ? [m[0], p] : m));
  };
  const up = () => { if (drag?.k === 'line' && tool === 'linha') { setDraft(null); setTool('mover'); } if (drag?.k === 'mask') setTool('mover'); setDrag(null); };
  const grab = (k: 'poly' | 'line', i: number) => (e: React.PointerEvent) => { if (tool !== 'mover') return; e.stopPropagation(); svg.current?.setPointerCapture(e.pointerId); setDrag({ k, i }); setDirty(true); };

  const testFire = () => { if (fire) return; setFire(true); toast(`Alerta de teste disparado: intrusão em ${d.name}`); setTimeout(() => setFire(false), 4000); };
  const runDiag = () => { setDiag('run'); setTimeout(() => setDiag('done'), 1200); };
  const filter = `brightness(${0.5 + img.brilho / 100}) contrast(${0.5 + img.contraste / 100}) saturate(${img.saturacao / 50})`;
  const polyPts = (draft && tool === 'poligono' ? draft : poly).map((p) => p.join(',')).join(' ');
  const mid: Pt = [(line[0][0] + line[1][0]) / 2, (line[0][1] + line[1][1]) / 2];
  const noDirect = !direct && <Alert type="warning" title="Controle direto indisponível">Este perfil genérico (ONVIF/RTSP) não oferece controle direto da câmera. Imagem, iluminação, ações e diagnóstico não funcionam aqui; perímetro e algoritmos de IA seguem pela plataforma.</Alert>;

  return createPortal(
    <div className="nx-modal-back cs-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cs" role="dialog" aria-modal="true" aria-label={`Ajustes de câmera de ${d.name}`}>
        <header className="cs-head">
          <span className="dv-kind is-camera is-lg"><Icon name="camera" size={20} /></span>
          <div className="cs-head__t">
            <h2>{d.name}<StatusPill d={d as Device} /></h2>
            <p>Modelo <b>{d.model}</b> · Driver <code>{prof.driver}</code> · <span className="is-mono">{d.ip}:{d.port}</span></p>
          </div>
          <span className={`dv-prof__badge${direct ? ' is-on' : ''}`}><i />{direct ? 'Certificado' : 'Genérico'}</span>
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>

        <div className="cs-body">
          <section className="cs-studio">
            <div className="cs-bar">
              <b>Estúdio visual e perímetro</b>
              <span className={`cs-live${preview ? ' is-prev' : offline ? ' is-off' : ''}`}><i />{preview ? 'Prévia' : offline ? 'Sem sinal' : 'Ao vivo'}</span>
              <span className="dv-tools__sp" />
              <Button icon="grid" className={grid ? 'is-active' : undefined} onClick={() => setGrid(!grid)}>Grade</Button>
              <Button icon="flash" className={fire ? 'cs-firebtn is-on' : 'cs-firebtn'} onClick={testFire}>{fire ? 'Disparando…' : 'Testar disparo'}</Button>
              <IconButton icon="snapshot" label="Baixar frame" onClick={() => toast('Frame salvo · simulado no protótipo')} tipPlace="top" />
              <IconButton icon="refresh" label="Atualizar imagem" onClick={() => toast('Imagem atualizada')} tipPlace="top" />
            </div>

            <div className={`cs-view${offline ? ' is-off' : ''}${fire ? ' is-fire' : ''}`}>
              <img src={sceneUrl(cam)} alt="" style={{ filter }} draggable={false} />
              {offline && <span className="cs-view__off"><Icon name="nosignal" size={22} />Sem vídeo: o último frame é usado na calibração</span>}
              <svg ref={svg} viewBox="0 0 1000 1000" preserveAspectRatio="none" className={`cs-svg is-${tool}`}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => setCursor(null)}>
                {grid && Array.from({ length: 9 }, (_, i) => <g key={i} className="cs-grid"><line x1={(i + 1) * 100} x2={(i + 1) * 100} y1="0" y2="1000" /><line y1={(i + 1) * 100} y2={(i + 1) * 100} x1="0" x2="1000" /></g>)}
                <defs><pattern id="cs-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="16" className="cs-hatch" /></pattern></defs>
                {mask && <rect className="cs-mask" x={Math.min(mask[0][0], mask[1][0])} y={Math.min(mask[0][1], mask[1][1])} width={Math.abs(mask[1][0] - mask[0][0])} height={Math.abs(mask[1][1] - mask[0][1])} />}
                <polygon points={polyPts} className={`cs-poly${draft && tool === 'poligono' ? ' is-draft' : ''}${fire ? ' is-fire' : ''}`} />
                <line x1={line[0][0]} y1={line[0][1]} x2={line[1][0]} y2={line[1][1]} className="cs-line" />
                {(draft && tool === 'poligono' ? draft : poly).map((p, i) => <circle key={`p${i}`} cx={p[0]} cy={p[1]} r="14" className="cs-h is-poly" onPointerDown={grab('poly', i)} />)}
                {line.map((p, i) => <circle key={`l${i}`} cx={p[0]} cy={p[1]} r="14" className="cs-h is-line" onPointerDown={grab('line', i)} />)}
              </svg>
              <span className="cs-tag" style={{ left: `${poly.reduce((a, p) => a + p[0], 0) / poly.length / 10}%`, top: `${Math.min(...poly.map((p) => p[1])) / 10}%` }}><Icon name="shield" size={12} />Zona de intrusão · {sens}%</span>
              {fire && <span className="cs-alert" role="status"><Icon name="shield" size={14} />Alerta disparado: intrusão detectada (pessoa identificada na zona 1)</span>}
              {fire && (() => { const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length / 10, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length / 10; return <span className="cs-hit" style={{ left: `${cx}%`, top: `${cy}%` }}><em>Pessoa · 94%</em></span>; })()}
              {cursor && <span className="cs-cursor is-mono">x {cursor[0]} · y {cursor[1]}</span>}
              <span className="cs-tag is-line" style={{ left: `${mid[0] / 10}%`, top: `${mid[1] / 10}%` }}>A {dir === 'ab' ? '→' : dir === 'ba' ? '←' : '↔'} B</span>
            </div>

            <div className="cs-tools">
              <Segmented<Tool> label="Ferramenta" size="sm" value={tool} onChange={(v) => { setTool(v); setDraft(null); }} options={[
                { value: 'mover', label: <><Icon name="drag" size={14} />Mover pontos</> },
                { value: 'linha', label: <><Icon name="edit" size={14} />Desenhar linha</> },
                { value: 'poligono', label: <><Icon name="shield" size={14} />Desenhar polígono</> },
                { value: 'mascara', label: <><Icon name="eyeOff" size={14} />Máscara</> },
              ]} />
              <span className="cs-hint">
                {tool === 'poligono' ? (draft?.length ? `${draft.length} pontos · clique no primeiro para fechar` : 'Clique no vídeo para marcar os vértices')
                  : tool === 'linha' ? 'Arraste de A até B' : tool === 'mascara' ? 'Arraste para cobrir a área privada' : 'Arraste os pontos para ajustar'}
              </span>
            </div>
            <div className="cs-save">
              <span className={dirty ? 'is-dirty' : 'is-ok'}><Icon name={dirty ? 'warnFill' : 'successFill'} size={14} />{dirty ? 'Perímetro não salvo' : 'Perímetro salvo'}</span>
              {mask ? <button type="button" className="dv-link" onClick={() => { setMask(null); setDirty(true); }}>Remover máscara</button> : <span className="dv-muted">Sem máscara</span>}
              <span className="dv-tools__sp" />
              <Button variant="primary" icon="check" disabled={!dirty} onClick={() => { setDirty(false); toast('Perímetro salvo'); }}>Salvar perímetro</Button>
            </div>
          </section>

          <section className="cs-side">
            <Tabs<Tab> label="Ajustes" value={tab} onChange={setTab} className="cs-tabs" options={[
              { value: 'perimetro', label: 'Perímetro' },
              { value: 'imagem', label: 'Imagem' },
              { value: 'acoes', label: 'Ações' },
              { value: 'diag', label: 'Diagnóstico' },
              { value: 'homolog', label: 'Homologação' },
              { value: 'ia', label: 'IA' },
            ]} />
            <div className="cs-pane" key={tab}>
              {tab === 'perimetro' && (
                <>
                  <Group title="Zona de intrusão" icon="shield">
                    <Range label="Sensibilidade" value={sens} onChange={(v) => { setSens(v); setDirty(true); }} />
                    <p className="cs-note">{poly.length} vértices · alerta quando uma pessoa ou veículo permanece dentro da área.</p>
                  </Group>
                  <Group title="Linha de cruzamento" icon="share">
                    <div className="dv-field"><span className="dv-field__l">Sentido que gera alerta</span>
                      <Segmented<Dir> label="Sentido" value={dir} onChange={(v) => { setDir(v); setDirty(true); }} options={[{ value: 'ab', label: 'A → B' }, { value: 'ba', label: 'B → A' }, { value: 'ambos', label: 'Ambos' }]} />
                    </div>
                  </Group>
                  <Group title="Máscara de privacidade" icon="eyeOff">
                    <p className="cs-note">{mask ? 'Uma área coberta: ela não aparece na gravação nem é analisada.' : 'Nenhuma área coberta. Use a ferramenta Máscara no vídeo.'}</p>
                  </Group>
                </>
              )}

              {tab === 'imagem' && (
                <>
                  {noDirect}
                  <Group title="Calibração do sensor e lente" icon="sliders" action={<button type="button" className="dv-link" disabled={!direct} onClick={() => setImg(IMG0)}><Icon name="refresh" size={12} />Voltar a 50%</button>}>
                    <Range label="Brilho" value={img.brilho} disabled={!direct} onChange={(v) => setImg({ ...img, brilho: v })} />
                    <Range label="Contraste" value={img.contraste} disabled={!direct} onChange={(v) => setImg({ ...img, contraste: v })} />
                    <Range label="Saturação" value={img.saturacao} disabled={!direct} onChange={(v) => setImg({ ...img, saturacao: v })} />
                    <Range label="Nitidez" value={img.nitidez} disabled={!direct} onChange={(v) => setImg({ ...img, nitidez: v })} />
                  </Group>
                  <Group title="Iluminação suplementar" icon="sun">
                    <div className="dv-row">
                      <div className="dv-field"><span className="dv-field__l">Modo de operação</span><Select label="Modo de operação" value={light} onChange={setLight} options={LIGHT} disabled={!direct} /></div>
                      <Range label="Intensidade do LED" value={led} disabled={!direct || light === 'off'} onChange={setLed} compact />
                    </div>
                  </Group>
                </>
              )}

              {tab === 'acoes' && (
                <>
                  {noDirect}
                  <div className="cs-acts">
                    {([['replay', 'Reiniciar câmera', 'O vídeo volta em cerca de 1 min'], ['clock', 'Sincronizar relógio', 'Ajusta data e hora pelo servidor NTP'], ['snapshot', 'Capturar snapshot', 'Salva um frame em alta resolução'], ['refresh', 'Restaurar imagem de fábrica', 'Brilho, contraste e iluminação voltam ao padrão']] as const).map(([ic, t, s]) => (
                      <button key={t} type="button" className="cs-act" disabled={!direct || offline} onClick={() => toast(`${t} · simulado no protótipo`)}>
                        <span className="cs-act__ic"><Icon name={ic} size={16} /></span><span><b>{t}</b><small>{s}</small></span><Icon name="arrowRight" size={14} />
                      </button>
                    ))}
                  </div>
                  <Group title="Dissuasão" icon="sound">
                    <Toggle label="Estrobo (Live Guard)" sub="Pisca a luz ao detectar intrusão" disabled={!direct} />
                    <Toggle label="Áudio de alerta" sub="Toca a mensagem gravada na câmera" disabled={!direct} />
                  </Group>
                </>
              )}

              {tab === 'diag' && (
                <>
                  {noDirect}
                  <ul className="cs-diag">
                    {DIAG.map(([k, v], i) => {
                      const st = diag === 'idle' ? 'idle' : diag === 'run' ? 'run' : offline && i > 0 ? 'bad' : !direct && i >= 2 ? 'na' : 'ok';
                      return (
                        <li key={k} className={`is-${st}`}>
                          <Icon name={st === 'ok' ? 'successFill' : st === 'bad' ? 'errorFill' : st === 'run' ? 'refresh' : st === 'na' ? 'infoFill' : 'activity'} size={16} className={st === 'run' ? 'is-spin' : undefined} />
                          <b>{k}</b><span>{st === 'ok' ? v : st === 'bad' ? 'Sem resposta' : st === 'na' ? 'Não suportado pelo perfil' : st === 'run' ? 'Verificando…' : '—'}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Button icon="activity" onClick={runDiag} disabled={diag === 'run' || !direct}>{diag === 'done' ? 'Rodar de novo' : 'Rodar diagnóstico'}</Button>
                </>
              )}

              {tab === 'homolog' && (
                <div className={`dv-prof${prof.certified ? '' : ' is-generic'}`}>
                  <div className="dv-prof__top">
                    <span className={`dv-prof__badge${prof.certified ? ' is-on' : ''}`}><i />{prof.certified ? 'Certificado em bancada' : 'Não homologado'}</span>
                    <b>{prof.name}</b>
                  </div>
                  <span className="dv-prof__drv">Driver: <code>{prof.driver}</code></span>
                  <p>{prof.desc}</p>
                  <div className="dv-prof__caps">
                    {prof.caps.map(([c, t]) => <span key={c} className={`dv-cap is-${t}`}>{c}</span>)}
                    <span className="dv-cap is-port">Portas: {prof.rtsp ? `RTSP ${prof.rtsp} · ` : ''}HTTP {prof.http}</span>
                  </div>
                </div>
              )}

              {tab === 'ia' && (() => {
                const nOn = AI.filter((a) => ai[a.k]).length;
                const has = (n: Need) => n === 'area' ? poly.length >= 3 : n === 'linha' ? true : n !== 'licenca';
                return (
                  <>
                    <div className="cs-aihead">
                      <p className="dv-muted">A IA analisa nesta câmera só os algoritmos ligados aqui e envia cada ocorrência ao núcleo como alerta.</p>
                      <span className={`cs-aicount${nOn >= Number(limit) ? ' is-full' : ''}`}>{nOn} de {limit} ativos</span>
                      <span className="cs-ailimit"><span>Limite</span><Select label="Limite de algoritmos" value={limit} onChange={setLimit} options={['2', '4', '6', '8'].map((v) => ({ value: v, label: v }))} /></span>
                    </div>
                    {AI_GROUPS.map(([g, list]) => (
                      <section key={g} className="cs-aigrp">
                        <h4>{g}</h4>
                        {list.map((a) => (
                          <AiRow key={a.k} a={a} on={ai[a.k]} ok={has(a.need)} sched={sched[a.k]}
                            onToggle={(v) => {
                              if (v && nOn >= Number(limit)) { toast(`Limite de ${limit} algoritmos atingido. Desligue outro ou aumente o limite.`); return; }
                              if (v && !has(a.need)) { toast('Requer licença de análise facial e de placas'); return; }
                              setAi({ ...ai, [a.k]: v });
                            }}
                            onSched={(h) => { setSched({ ...sched, [a.k]: h }); toast(`Horário salvo: ${a.label}`); }} />
                        ))}
                      </section>
                    ))}
                  </>
                );
              })()}
            </div>
          </section>
        </div>

        <footer className="cs-foot">
          <span className="cs-uuid is-mono">UUID {uuid(d.id)}</span>
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={() => { toast(preview ? 'Ajustes guardados: valem quando a câmera for salva' : 'Ajustes de câmera salvos'); onClose(); }}>Salvar ajustes</Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function AiRow({ a, on, ok, sched, onToggle, onSched }: { a: Algo; on: boolean; ok: boolean; sched?: Sched; onToggle: (v: boolean) => void; onSched: (h: Sched) => void }) {
  const [open, setOpen] = useState(false);
  const [de, setDe] = useState(sched?.de ?? '');
  const [ate, setAte] = useState(sched?.ate ?? '');
  const [dias, setDias] = useState<number[]>(sched?.dias ?? [0, 1, 2, 3, 4, 5, 6]);
  const tag = a.need === 'licenca' ? ['Requer licença', 'is-warn'] : a.need === 'area' ? ['Área configurada', 'is-ok'] : a.need === 'linha' ? ['Linha configurada', 'is-ok'] : null;
  const bad = !!de !== !!ate;
  return (
    <div className={`cs-ai${open ? ' is-open' : ''}${on ? ' is-on' : ''}`}>
      <div className="cs-ai__row">
        <Switch label={a.label} checked={on} onChange={onToggle} disabled={!ok && !on} />
        <span className="cs-ai__txt">
          <span className="cs-ai__t"><b>{a.label}</b><code>{a.code}</code>{tag && <span className={`cs-ai__tag ${tag[1]}`}>{tag[0]}</span>}</span>
          <small>{a.desc}</small>
          {sched && <span className="cs-ai__when"><Icon name="clock" size={12} />{schedText(sched)}</span>}
        </span>
        <button type="button" className={`cs-ai__clk${open ? ' is-open' : ''}`} aria-expanded={open} aria-label={`Horário de ${a.label}`} title="Horário" onClick={() => setOpen(!open)}>
          <Icon name="clock" size={14} /><Icon name="chevron" size={12} />
        </button>
      </div>
      {open && (
        <div className="cs-sched">
          <span className="cs-sched__l">Horário</span>
          <div className="cs-sched__hrs">
            <span className="nx-input"><input type="time" value={de} onChange={(e) => setDe(e.target.value)} aria-label="Das" /></span>
            <span className="cs-sched__sep">até</span>
            <span className="nx-input"><input type="time" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" /></span>
            <small className={bad ? 'is-err' : undefined}>{bad ? 'Preencha os dois horários' : 'Vazio = dia todo'}</small>
          </div>
          <span className="cs-sched__l">Dias</span>
          <div className="nx-seg cs-days" role="group" aria-label="Dias da semana">
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={dias.includes(i)} className={`nx-seg__opt${dias.includes(i) ? ' is-on' : ''}`}
                onClick={() => setDias(dias.includes(i) ? dias.filter((x) => x !== i) : [...dias, i].sort())}>{d}</button>
            ))}
          </div>
          <div className="cs-sched__acts">
            {sched && <button type="button" className="dv-link" onClick={() => { setDe(''); setAte(''); setDias([0, 1, 2, 3, 4, 5, 6]); onSched({ de: '', ate: '', dias: [0, 1, 2, 3, 4, 5, 6] }); }}>Remover restrição</button>}
            <span className="dv-tools__sp" />
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" icon="check" disabled={bad || !dias.length} onClick={() => { onSched({ de, ate, dias }); setOpen(false); }}>Salvar horário</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, icon, action, children }: { title: string; icon: Parameters<typeof Icon>[0]['name']; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="cs-group">
      <div className="cs-group__h"><Icon name={icon} size={14} /><h3>{title}</h3><span className="dv-tools__sp" />{action}</div>
      {children}
    </section>
  );
}

function Range({ label, value, onChange, disabled, compact }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; compact?: boolean }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(100, v)));
  return (
    <div className={`cs-range${disabled ? ' is-dis' : ''}${compact ? ' is-compact' : ''}`}>
      <div className="cs-range__h"><span>{label}</span><b>{value}%</b></div>
      <div className="cs-range__row">
        {!compact && <button type="button" className="cs-step" aria-label={`Diminuir ${label.toLowerCase()}`} onClick={() => set(value - 5)} disabled={disabled}>−</button>}
        <input type="range" min={0} max={100} value={value} disabled={disabled} aria-label={label} onChange={(e) => set(Number(e.target.value))} style={{ ['--v' as string]: `${value}%` }} />
        {!compact && <button type="button" className="cs-step" aria-label={`Aumentar ${label.toLowerCase()}`} onClick={() => set(value + 5)} disabled={disabled}>+</button>}
      </div>
    </div>
  );
}

function Toggle({ label, sub, disabled }: { label: string; sub: string; disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <div className="cs-toggle">
      <span><b>{label}</b><small>{sub}</small></span>
      <Switch label={label} checked={on} onChange={setOn} disabled={disabled} />
    </div>
  );
}
