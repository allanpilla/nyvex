import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Combobox, Icon, Sheet, type StatusType } from '../../ds/components';
import { DEVICES, DEV_LOCAIS, PROFILES, TYPE_BY_NAME, TYPES, profileFor, type Device } from './data';
import { norm } from './parts';
import { CameraSettings } from './CameraSettings';

type Props = { edit?: Device; existing: Device[]; onClose: () => void; onSave: (d: Device) => void };

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const AREA = Object.fromEntries(DEVICES.map((d) => [d.local, d.area]));

/** Cadastro e edição no drawer lateral. Mesmas seções do sistema original: Identificação, Homologação de hardware, Categoria, Localização e Stream. */
export function DeviceForm({ edit, existing, onClose, onSave }: Props) {
  const navigate = useNavigate();
  const nextId = useMemo(() => `DEV-${1000 + existing.length + 1}`, [existing.length]);
  const [name, setName] = useState(edit?.name ?? nextId);
  const [type, setType] = useState<string | null>(edit?.type ?? null);
  const [profileId, setProfileId] = useState<string | null>(edit ? profileFor(edit).id : null);
  const [local, setLocal] = useState<string | null>(edit?.local ?? null);
  const [ip, setIp] = useState(edit?.ip ?? '');
  const prof0 = profileId ? PROFILES.find((p) => p.id === profileId) : undefined;
  const [port, setPort] = useState(String(edit?.port ?? prof0?.rtsp ?? 554));
  const [path, setPath] = useState(prof0?.path ?? '/stream1');
  const [user, setUser] = useState(edit?.user ?? 'admin');
  const [pass, setPass] = useState(edit ? 'Nyv3x#2026' : '');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [cs, setCs] = useState(false);
  const [test, setTest] = useState<'idle' | 'run' | 'ok' | 'fail'>(edit ? 'ok' : 'idle');

  const t = type ? TYPE_BY_NAME[type] : undefined;
  const profiles = useMemo(() => PROFILES.filter((p) => !type || p.types.includes(type)), [type]);
  const prof = profileId ? PROFILES.find((p) => p.id === profileId) : undefined;
  const video = t?.video ?? true;

  // Trocar o tipo invalida um perfil que não serve para ele.
  useEffect(() => { if (prof && type && !prof.types.includes(type)) setProfileId(null); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  // Perfil escolhido define portas e caminho do stream.
  useEffect(() => {
    if (!prof || (edit && prof.id === profileFor(edit).id)) return;
    setPort(String((video ? prof.rtsp : prof.http) ?? 554));
    if (prof.path) setPath(prof.path);
  }, [profileId, video]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!edit || ip !== edit.ip) setTest('idle'); }, [ip, port, user, pass, path]); // eslint-disable-line react-hooks/exhaustive-deps

  const dupIp = existing.find((d) => d.ip === ip.trim() && d.id !== edit?.id);
  const dupName = existing.find((d) => norm(d.name) === norm(name.trim()) && d.id !== edit?.id);
  const errors = {
    name: !name.trim() ? 'Obrigatório' : dupName ? 'Já existe um dispositivo com essa identificação' : '',
    type: !type ? 'Escolha o tipo' : '',
    profile: !profileId ? 'Escolha o perfil de hardware (ou o genérico)' : '',
    local: !local ? 'Escolha onde ele está instalado' : '',
    ip: !ip.trim() ? 'Informe o IP' : !IP_RE.test(ip.trim()) ? 'IP inválido. Ex.: 172.26.1.80' : dupIp ? `IP já usado por “${dupIp.name}”` : '',
    port: !/^\d{1,5}$/.test(port) || Number(port) > 65535 ? 'Porta inválida' : '',
  };
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '');
  const nErr = Object.values(errors).filter(Boolean).length;
  const url = `rtsp://${user || 'usuario'}:${show ? pass || 'senha' : '••••••'}@${ip.trim() || '0.0.0.0'}:${port}${path.startsWith('/') ? path : '/' + path}`;

  const runTest = () => {
    if (errors.ip || errors.port) { setTouched(true); return; }
    setTest('run');
    setTimeout(() => setTest(pass.length >= 4 ? 'ok' : 'fail'), 1100);
  };

  const save = () => {
    setTouched(true);
    if (nErr || !t || !prof || !local) return;
    const ok = test === 'ok';
    onSave({
      ...(edit ?? {
        mac: '44:19:B6:' + Array.from({ length: 3 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase(),
        firmware: '—', situacao: 'ativo' as const, uptime: 100, added: new Date().toISOString().slice(0, 10), outdoor: false,
      }),
      id: edit?.id ?? `novo-${Date.now()}`, name: name.trim(), kind: t.kind, type: t.type,
      vendor: prof.vendor, model: prof.model, certified: prof.certified,
      local, area: AREA[local] ?? '', ip: ip.trim(), port: Number(port), user,
      conn: edit ? edit.conn : ok ? 'online' : 'offline',
      stream: t.video ? (edit ? edit.stream : ok ? 'live' : 'sem') : 'na',
      hb: edit ? edit.hb : ok ? 1 : null,
      latency: edit ? edit.latency : ok ? 18 : null,
      note: edit ? edit.note : ok ? undefined : 'Aguardando a primeira conexão',
      camId: edit?.camId,
    } as Device);
  };

  const testAlert: Record<'ok' | 'fail', [StatusType, string, string]> = {
    ok: ['success', video ? 'Stream encontrado' : 'Conectado', video ? 'Credenciais válidas. Codec e resolução serão detectados pelo gateway ao iniciar.' : `Respondeu em 18 ms em ${ip.trim()}:${port}.`],
    fail: ['error', 'Falha na autenticação', 'O dispositivo respondeu, mas recusou usuário e senha.'],
  };

  return (
    <Sheet
      eyebrow={edit ? 'Editar dispositivo' : 'Novo dispositivo'}
      title={edit ? edit.name : name.trim() || nextId}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          {touched && nErr > 0 && <span className="dv-form__err"><Icon name="errorFill" size={14} />{nErr === 1 ? '1 campo precisa de atenção' : `${nErr} campos precisam de atenção`}</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">Salvar dispositivo</button>
        </>
      }
    >
      <section className="dv-card2">
        <h3>Identificação</h3>
        <div className="dv-row">
          <label className={`dv-field${err('name') ? ' is-err' : ''}`}>
            <span className="dv-field__l">Identificação<i>*</i></span>
            <span className="nx-input"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!edit} /></span>
            {err('name') && <span className="dv-field__h">{err('name')}</span>}
          </label>
          <div className={`dv-field${err('type') ? ' is-err' : ''}`}>
            <span className="dv-field__l">Tipo<i>*</i></span>
            <Combobox label="Tipo" value={type} onChange={setType} invalid={!!err('type')} searchPlaceholder="Buscar tipo…"
              options={TYPES.map((x) => ({ value: x.type, label: x.type, meta: x.category }))} />
            {err('type') && <span className="dv-field__h">{err('type')}</span>}
          </div>
        </div>
      </section>

      <section className="dv-card2">
        <h3>Homologação de hardware</h3>
        <p>Selecione o perfil de hardware homologado pelo laboratório Nyvex para associar drivers, portas e capacidades calibradas.</p>
        <div className={`dv-field${err('profile') ? ' is-err' : ''}`}>
          <span className="dv-field__l">Fabricante e modelo homologado<i>*</i></span>
          <Combobox label="Fabricante e modelo homologado" value={profileId} onChange={setProfileId} invalid={!!err('profile')} searchPlaceholder="Buscar fabricante ou modelo…"
            placeholder={type ? 'Selecione…' : 'Escolha o tipo primeiro'} disabled={!type}
            options={profiles.map((p) => ({ value: p.id, label: p.vendor === 'Genérico' ? 'Genérico · ONVIF / RTSP' : `${p.vendor} · ${p.model}`, meta: p.certified ? 'Certificado' : 'Não homologado' }))} />
          {err('profile') && <span className="dv-field__h">{err('profile')}</span>}
        </div>
        {prof && (
          <div className={`dv-prof${prof.certified ? '' : ' is-generic'}`}>
            <div className="dv-prof__top">
              <span className={`dv-prof__badge${prof.certified ? ' is-on' : ''}`}><i />{prof.certified ? 'Certificado em bancada' : 'Não homologado'}</span>
              <b>{prof.name}</b>
            </div>
            <span className="dv-prof__drv">Driver: <code>{prof.driver}</code></span>
            <p>{prof.desc}</p>
            <div className="dv-prof__caps">
              {prof.caps.map(([c, tone]) => <span key={c} className={`dv-cap is-${tone}`}>{c}</span>)}
              <span className="dv-cap is-port">Portas: {prof.rtsp ? `RTSP ${prof.rtsp} · ` : ''}HTTP {prof.http}</span>
            </div>
          </div>
        )}
      </section>

      <section className="dv-card2 dv-card2--row">
        <span className="dv-field__l">Categoria</span>
        {t ? <><b className="dv-catv">{t.category}</b><span className="dv-cap is-info">{t.tag}</span></> : <span className="dv-muted">Definida pelo tipo</span>}
      </section>

      <section className="dv-card2">
        <h3>Localização</h3>
        <p>Onde o equipamento está instalado, conforme o cadastro de Locais.</p>
        <div className={`dv-field${err('local') ? ' is-err' : ''}`}>
          <span className="dv-field__l">Local<i>*</i></span>
          <Combobox label="Local" value={local} onChange={setLocal} invalid={!!err('local')} searchPlaceholder="Buscar local…"
            options={DEV_LOCAIS.map((l) => ({ value: l, label: AREA[l] ? `${l} — ${AREA[l]}` : l }))} />
          {err('local') && <span className="dv-field__h">{err('local')}</span>}
        </div>
        <button type="button" className="dv-link dv-link--start" onClick={() => { onClose(); navigate('/locais'); }}>Gerenciar locais</button>
      </section>

      <section className="dv-card2">
        <h3>{video ? 'Stream' : 'Conexão'}</h3>
        <p>{video ? 'Fonte de imagem. O gateway detecta o codec e a resolução reais via ffprobe ao iniciar (não é algo cadastrado).' : 'Endereço e credenciais usados para monitorar o equipamento.'}</p>
        <div className="dv-row dv-row--ip">
          <label className={`dv-field${err('ip') ? ' is-err' : ''}`}>
            <span className="dv-field__l">Endereço IP<i>*</i></span>
            <span className="nx-input"><input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="172.26.1.80" inputMode="decimal" className="is-mono" /></span>
            {err('ip') && <span className="dv-field__h">{err('ip')}</span>}
          </label>
          <label className={`dv-field${err('port') ? ' is-err' : ''}`}>
            <span className="dv-field__l">{video ? 'Porta RTSP' : 'Porta HTTP'}</span>
            <span className="nx-input"><input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="is-mono" /></span>
            {err('port') && <span className="dv-field__h">{err('port')}</span>}
          </label>
        </div>
        {video && (
          <label className="dv-field">
            <span className="dv-field__l">Caminho do stream</span>
            <span className="nx-input"><input value={path} onChange={(e) => setPath(e.target.value)} className="is-mono" /></span>
          </label>
        )}
        <div className="dv-row">
          <label className="dv-field">
            <span className="dv-field__l">Usuário</span>
            <span className="nx-input"><input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" /></span>
          </label>
          <label className="dv-field">
            <span className="dv-field__l">Senha</span>
            <span className="nx-input">
              <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" placeholder="••••••" />
              <button type="button" className="dv-eye" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(!show)}><Icon name={show ? 'eyeOff' : 'eye'} size={16} /></button>
            </span>
          </label>
        </div>
        {video && <code className="dv-url">{url}</code>}
        {test === 'ok' || test === 'fail'
          ? <Alert type={testAlert[test][0]} title={testAlert[test][1]} action={<Button onClick={runTest}>Testar de novo</Button>}>{testAlert[test][2]}</Alert>
          : (
            <div className="dv-testrow">
              <span>{test === 'run' ? <><Icon name="refresh" size={14} className="is-spin" />Testando {ip.trim()}…</> : 'Teste antes de salvar para o dispositivo já começar monitorado.'}</span>
              <Button icon="activity" onClick={runTest} disabled={test === 'run'}>{video ? 'Testar stream' : 'Testar conexão'}</Button>
            </div>
          )}
      </section>

      {video && t && (
        <section className="dv-card2">
          <h3>Ajustes de câmera</h3>
          <p>Perímetro, linha e máscara sobre a imagem, ajustes de imagem, ações, diagnóstico, homologação e algoritmos de IA.</p>
          <div className="dv-testrow">
            <span>{ip.trim() ? 'Pode ajustar agora ou depois, pela ficha do dispositivo.' : 'Informe o endereço IP para abrir a imagem da câmera.'}</span>
            <Button icon="sliders" onClick={() => setCs(true)} disabled={!ip.trim()}>Abrir ajustes</Button>
          </div>
        </section>
      )}
      {cs && (
        <CameraSettings preview onClose={() => setCs(false)} d={{
          id: edit?.id ?? nextId, name: name.trim() || nextId, vendor: prof?.vendor ?? 'Genérico', model: prof?.model ?? 'ONVIF',
          ip: ip.trim(), port: Number(port) || 554, certified: prof?.certified ?? false, situacao: 'ativo', conn: test === 'fail' ? 'offline' : 'online', camId: edit?.camId,
        }} />
      )}
    </Sheet>
  );
}
