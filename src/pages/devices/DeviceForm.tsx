import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Segmented } from '../../ds/components';
import { DEV_LOCAIS, KIND_LABEL, MODEL_OPTIONS, type Device, type Kind } from './data';
import { norm } from './parts';

type Props = { edit?: Device; existing: Device[]; onClose: () => void; onSave: (d: Device) => void };

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

/** Cadastro e edição em um só formulário, com teste de conexão antes de salvar. */
export function DeviceForm({ edit, existing, onClose, onSave }: Props) {
  const [kind, setKind] = useState<Kind>(edit?.kind ?? 'camera');
  const opts = MODEL_OPTIONS[kind];
  const [mi, setMi] = useState(() => Math.max(0, edit ? opts.findIndex((o) => o.model === edit.model) : 0));
  const model = opts[mi] ?? opts[0];
  const [name, setName] = useState(edit?.name ?? '');
  const [local, setLocal] = useState(edit?.local ?? '');
  const [env, setEnv] = useState<'int' | 'ext'>(edit?.outdoor ? 'ext' : 'int');
  const [ip, setIp] = useState(edit?.ip ?? '');
  const [port, setPort] = useState(String(edit?.port ?? model.port));
  const [user, setUser] = useState(edit?.user ?? 'admin');
  const [pass, setPass] = useState(edit ? 'Nyv3x#2026' : '');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [test, setTest] = useState<'idle' | 'run' | 'ok' | 'fail'>(edit ? 'ok' : 'idle');

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, [onClose]);
  // Credenciais/endereço mudaram: o teste anterior deixa de valer.
  useEffect(() => { if (!edit || ip !== edit.ip) setTest('idle'); }, [ip, port, user, pass]); // eslint-disable-line react-hooks/exhaustive-deps

  const dupIp = useMemo(() => existing.find((d) => d.ip === ip.trim() && d.id !== edit?.id), [existing, ip, edit]);
  const dupName = useMemo(() => existing.find((d) => norm(d.name) === norm(name.trim()) && d.id !== edit?.id), [existing, name, edit]);
  const errors = {
    name: !name.trim() ? 'Dê um nome para encontrar o dispositivo depois' : dupName ? 'Já existe um dispositivo com esse nome' : '',
    local: !local ? 'Escolha onde ele está instalado' : '',
    ip: !ip.trim() ? 'Informe o IP' : !IP_RE.test(ip.trim()) ? 'IP inválido. Ex.: 172.26.1.80' : dupIp ? `IP já usado por “${dupIp.name}”` : '',
    port: !/^\d{1,5}$/.test(port) || Number(port) > 65535 ? 'Porta inválida' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const err = (k: keyof typeof errors) => (touched[k] ? errors[k] : '');
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const runTest = () => {
    setTouched((t) => ({ ...t, ip: true, port: true }));
    if (errors.ip || errors.port) return;
    setTest('run');
    setTimeout(() => setTest(pass.length >= 4 ? 'ok' : 'fail'), 1100);
  };

  const save = () => {
    setTouched({ name: true, local: true, ip: true, port: true });
    if (!valid) return;
    const id = edit?.id ?? `novo-${Date.now()}`;
    const area = existing.find((d) => d.local === local)?.area ?? '';
    const ok = test === 'ok';
    onSave({
      ...(edit ?? {
        mac: '44:19:B6:' + Array.from({ length: 3 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase(),
        firmware: model.certified ? '—' : '—', situacao: 'ativo' as const, uptime: 100, added: new Date().toISOString().slice(0, 10),
      }),
      id, kind, name: name.trim(), type: model.type, vendor: model.vendor, model: model.model, certified: model.certified,
      local, area, outdoor: env === 'ext', ip: ip.trim(), port: Number(port), user,
      conn: edit ? edit.conn : ok ? 'online' : 'offline',
      stream: kind === 'camera' ? (edit ? edit.stream : ok ? 'live' : 'sem') : 'na',
      hb: edit ? edit.hb : ok ? 1 : null,
      latency: edit ? edit.latency : ok ? 18 : null,
      note: edit ? edit.note : ok ? undefined : 'Aguardando a primeira conexão',
      camId: edit?.camId,
    } as Device);
  };

  return createPortal(
    <div className="nx-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="dv-form" role="dialog" aria-modal="true" aria-labelledby="dv-form-t" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <header className="dv-form__head">
          <div>
            <h2 id="dv-form-t">{edit ? 'Editar dispositivo' : 'Adicionar dispositivo'}</h2>
            <p>{edit ? edit.name : 'Cadastre o equipamento e teste a conexão antes de salvar.'}</p>
          </div>
          <IconButton icon="close" label="Fechar" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
        </header>

        <div className="dv-form__body">
          <fieldset className="dv-fs">
            <legend>Equipamento</legend>
            <div className="dv-field">
              <span className="dv-field__l">Categoria</span>
              <Segmented label="Categoria" value={kind} onChange={(k) => { if (edit) return; setKind(k); setMi(0); setPort(String(MODEL_OPTIONS[k][0].port)); }}
                options={(['camera', 'acesso', 'infra'] as Kind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
              {edit && <span className="dv-field__h">A categoria não muda depois do cadastro.</span>}
            </div>
            <label className="dv-field">
              <span className="dv-field__l">Modelo</span>
              <select className="nx-select" value={mi} onChange={(e) => { const i = Number(e.target.value); setMi(i); setPort(String(opts[i].port)); }}>
                {opts.map((o, i) => <option key={o.model} value={i}>{o.vendor === 'Genérico' ? o.model : `${o.vendor} ${o.model}`} · {o.type}</option>)}
              </select>
              <span className={`dv-field__h${model.certified ? ' is-ok' : ''}`}>
                {model.certified ? <><Icon name="check" size={12} />Integração certificada: PTZ, eventos e saúde completos</> : 'Integração genérica: só vídeo e heartbeat'}
              </span>
            </label>
            <label className={`dv-field${err('name') ? ' is-err' : ''}`}>
              <span className="dv-field__l">Nome</span>
              <span className="nx-input"><input value={name} onChange={(e) => setName(e.target.value)} onBlur={blur('name')} placeholder="Ex.: Bloco 02 · Entrada principal" autoFocus={!edit} /></span>
              <span className="dv-field__h">{err('name') || 'Padrão sugerido: Local · Ponto. Facilita a busca e o mural.'}</span>
            </label>
            <div className="dv-row">
              <label className={`dv-field${err('local') ? ' is-err' : ''}`}>
                <span className="dv-field__l">Local</span>
                <select className="nx-select" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={blur('local')}>
                  <option value="" disabled>Escolha um local</option>
                  {DEV_LOCAIS.map((l) => <option key={l}>{l}</option>)}
                </select>
                {err('local') && <span className="dv-field__h">{err('local')}</span>}
              </label>
              <div className="dv-field">
                <span className="dv-field__l">Ambiente</span>
                <Segmented label="Ambiente" value={env} onChange={setEnv} options={[{ value: 'int', label: 'Interno' }, { value: 'ext', label: 'Externo' }]} />
              </div>
            </div>
          </fieldset>

          <fieldset className="dv-fs">
            <legend>Conexão</legend>
            <div className="dv-row dv-row--ip">
              <label className={`dv-field${err('ip') ? ' is-err' : ''}`}>
                <span className="dv-field__l">Endereço IP</span>
                <span className="nx-input"><input value={ip} onChange={(e) => setIp(e.target.value)} onBlur={blur('ip')} placeholder="172.26.1.80" inputMode="decimal" className="is-mono" /></span>
                {err('ip') && <span className="dv-field__h">{err('ip')}</span>}
              </label>
              <label className={`dv-field${err('port') ? ' is-err' : ''}`}>
                <span className="dv-field__l">Porta</span>
                <span className="nx-input"><input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} onBlur={blur('port')} inputMode="numeric" className="is-mono" /></span>
                {err('port') && <span className="dv-field__h">{err('port')}</span>}
              </label>
            </div>
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
            <div className={`dv-test is-${test}`}>
              {test === 'idle' && <span>Teste antes de salvar para já começar monitorado.</span>}
              {test === 'run' && <span><Icon name="refresh" size={16} className="is-spin" />Testando {ip.trim()}…</span>}
              {test === 'ok' && <span><Icon name="check" size={16} />Conectado · credenciais válidas{kind === 'camera' ? ' · stream encontrado' : ''}</span>}
              {test === 'fail' && <span><Icon name="warn" size={16} />Sem autenticação. Confira usuário e senha.</span>}
              <Button icon="activity" onClick={runTest} disabled={test === 'run'}>{test === 'idle' ? 'Testar conexão' : 'Testar de novo'}</Button>
            </div>
          </fieldset>
        </div>

        <footer className="dv-form__foot">
          {!edit && test !== 'ok' && <span className="dv-form__hint">Dá para salvar sem testar: ele fica como “Aguardando a primeira conexão”.</span>}
          <span className="dv-tools__sp" />
          <Button onClick={onClose}>Cancelar</Button>
          <button type="submit" className="nx-btn nx-btn--primary">{edit ? 'Salvar alterações' : 'Adicionar dispositivo'}</button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
