import { useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, Icon, PageHeader, Select, Switch } from '../../ds/components';
import type { IconName } from '../../ds/icons/icons';
import type { Screen } from '../../navigation';
import { CLIENT_NAME } from '../../navigation';
import { useUi } from '../../lib/useUi';
import { storage } from '../../lib/storage';
import '../devices/devices.css';
import '../users/users.css';
import './settings.css';

type Values = {
  timezone: string;
  dateFormat: string;
  retention: string;
  anonymize: boolean;
  alertEmail: string;
  notifyAlerts: boolean;
  notifyOccurrences: boolean;
};
type SectionId = 'identificacao' | 'exportacao' | 'regional' | 'privacidade' | 'notificacoes';
type Section = { id: SectionId; label: string; icon: IconName; description: string; fields: (keyof Values)[] };

const DEFAULTS: Values = {
  timezone: 'America/Sao_Paulo',
  dateFormat: 'dd/mm/yyyy',
  retention: '90',
  anonymize: false,
  alertEmail: '',
  notifyAlerts: true,
  notifyOccurrences: true,
};

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
];
const DATE_FORMATS = [
  { value: 'dd/mm/yyyy', label: '31/12/2026' },
  { value: 'yyyy-mm-dd', label: '2026-12-31' },
];
const RETENTION = [
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '180 dias' },
  { value: '365', label: '1 ano' },
];

const SECTIONS: Section[] = [
  { id: 'identificacao', label: 'Identificação', icon: 'idcard', description: 'Dados do cliente nesta plataforma.', fields: [] },
  { id: 'exportacao', label: 'Exportação de dados', icon: 'download', description: 'Cópia dos dados do cliente em formato aberto.', fields: [] },
  { id: 'regional', label: 'Regional', icon: 'clock', description: 'Fuso horário e formato de data usados nas telas e relatórios.', fields: ['timezone', 'dateFormat'] },
  { id: 'privacidade', label: 'Dados e privacidade', icon: 'lock', description: 'Por quanto tempo as imagens ficam guardadas e como são tratadas.', fields: ['retention', 'anonymize'] },
  { id: 'notificacoes', label: 'Notificações', icon: 'alert', description: 'Avisos operacionais enviados por e-mail.', fields: ['alertEmail', 'notifyAlerts', 'notifyOccurrences'] },
];

const KEY = 'nx-settings';
const KEY_SEC = 'nx-settings-section';
const load = (): Values => {
  try { return { ...DEFAULTS, ...JSON.parse(storage.get(KEY) ?? '{}') }; } catch { return DEFAULTS; }
};
const labelOf = (opts: { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label ?? '—';
const emailOk = (v: string) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Uma linha de configuração: rótulo e explicação à esquerda, controle à direita. */
function Row({ label, hint, children, stack, id }: { label: ReactNode; hint?: ReactNode; children: ReactNode; stack?: boolean; id?: string }) {
  return (
    <div className={`st-row${stack ? ' is-stack' : ''}`}>
      <div className="st-row__txt">
        <span className="st-row__l" id={id}>{label}</span>
        {hint && <span className="st-row__h">{hint}</span>}
      </div>
      <div className="st-row__ctl">{children}</div>
    </div>
  );
}

export function SettingsPage({ screen }: { screen: Screen }) {
  const { toast } = useUi();
  const [saved, setSaved] = useState<Values>(load);
  const [draft, setDraft] = useState<Values>(saved);
  const [sec, setSec] = useState<SectionId>(() => {
    const s = storage.get(KEY_SEC) as SectionId | null;
    return SECTIONS.some((x) => x.id === s) ? s! : 'identificacao';
  });
  const [touched, setTouched] = useState(false);
  const [exporting, setExporting] = useState(false);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirtyKeys = useMemo(() => (Object.keys(draft) as (keyof Values)[]).filter((k) => draft[k] !== saved[k]), [draft, saved]);
  const dirtySecs = SECTIONS.filter((s) => s.fields.some((f) => dirtyKeys.includes(f)));
  const cur = SECTIONS.find((s) => s.id === sec)!;
  const editable = cur.fields.length > 0;
  const emailErr = touched && !emailOk(draft.alertEmail);

  const go = (id: SectionId) => { setSec(id); storage.set(KEY_SEC, id); };
  const save = () => {
    setTouched(true);
    if (!emailOk(draft.alertEmail)) { go('notificacoes'); return; }
    const v = { ...draft, alertEmail: draft.alertEmail.trim() };
    setSaved(v); setDraft(v); storage.set(KEY, JSON.stringify(v)); setTouched(false);
    toast('Configurações salvas');
  };
  const discard = () => { setDraft(saved); setTouched(false); };
  const exportZip = () => {
    setExporting(true);
    setTimeout(() => { setExporting(false); toast('Pacote de exportação gerado: nyvex-unibrasil.zip'); }, 1200);
  };

  const summary = (id: SectionId) => {
    switch (id) {
      case 'identificacao': return CLIENT_NAME;
      case 'exportacao': return 'ZIP · JSON e CSV';
      case 'regional': return `${labelOf(TIMEZONES, draft.timezone).replace(/ \(.*\)/, '')} · ${labelOf(DATE_FORMATS, draft.dateFormat)}`;
      case 'privacidade': return `Imagens por ${labelOf(RETENTION, draft.retention)}`;
      case 'notificacoes': {
        const n = Number(draft.notifyAlerts) + Number(draft.notifyOccurrences);
        return n === 0 ? 'Desligadas' : draft.alertEmail.trim() || 'Sem e-mail definido';
      }
    }
  };

  return (
    <div className="dv st">
      <div className="dv-main">
        <PageHeader title={screen.label} icon="settings" description="Preferências do cliente nesta plataforma." />

        <div className="dv-body st-body">
          <div className="st-split">
            <nav className="dv-tcard is-t2 st-nav" aria-label="Seções das configurações">
              {SECTIONS.map((s) => {
                const dirty = dirtySecs.includes(s);
                return (
                  <button key={s.id} type="button" className={`st-nav__item${s.id === sec ? ' is-sel' : ''}`} aria-current={s.id === sec ? 'page' : undefined} onClick={() => go(s.id)}>
                    <span className="st-nav__ic"><Icon name={s.icon} size={16} /></span>
                    <span className="st-nav__txt">
                      <b>{s.label}{dirty && <i className="us-rl__dirty" title="Alterações não salvas" />}</b>
                      <span>{summary(s.id)}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <section className="dv-tcard is-t2 us-rd st-panel" aria-labelledby="st-title">
              <header className="us-rd__head">
                <span className="us-rd__ic"><Icon name={cur.icon} size={16} /></span>
                <div className="us-rd__title">
                  <h2 id="st-title">{cur.label}</h2>
                  <p>{cur.description}</p>
                </div>
              </header>

              <div className="st-panel__body">
                {sec === 'identificacao' && (
                  <>
                    <Row label="Cliente"><span className="st-ro">UniBrasil Centro Universitário</span></Row>
                    <Row label="Plano"><span className="st-ro is-empty">Não informado</span></Row>
                    <p className="st-note"><Icon name="lock" size={14} />Dados da sessão, somente leitura. A edição do cliente é feita no Console, pelo operador da plataforma.</p>
                  </>
                )}

                {sec === 'exportacao' && (
                  <Row label="Exportar dados" hint="Pacote em formato aberto (JSON e CSV) com usuários, pessoas, regras, configuração das câmeras e alertas, para portabilidade (LGPD, art. 18).">
                    <Button icon={exporting ? 'refresh' : 'download'} className={exporting ? 'is-spin' : undefined} disabled={exporting} onClick={exportZip}>{exporting ? 'Gerando…' : 'Exportar (ZIP)'}</Button>
                  </Row>
                )}

                {sec === 'regional' && (
                  <>
                    <Row label="Fuso horário" hint="Horário usado em eventos, alertas e relatórios.">
                      <Select label="Fuso horário" value={draft.timezone} options={TIMEZONES} onChange={(v) => set('timezone', v)} />
                    </Row>
                    <Row label="Formato de data" hint="Como as datas aparecem no sistema.">
                      <Select label="Formato de data" value={draft.dateFormat} options={DATE_FORMATS} onChange={(v) => set('dateFormat', v)} />
                    </Row>
                  </>
                )}

                {sec === 'privacidade' && (
                  <>
                    <Row label="Retenção de imagens" hint="Depois desse prazo, as imagens são apagadas automaticamente.">
                      <Select label="Retenção de imagens" value={draft.retention} options={RETENTION} onChange={(v) => set('retention', v)} />
                    </Row>
                    <Row label={<>Anonimizar faces não identificadas <Badge tone="neutral">Em breve</Badge></>}
                      hint="Minimização de dados (LGPD). O recurso ainda está em construção.">
                      <Switch label="Anonimizar faces não identificadas" checked={draft.anonymize} onChange={(v) => set('anonymize', v)} disabled />
                    </Row>
                  </>
                )}

                {sec === 'notificacoes' && (
                  <>
                    <Row label="E-mail para alertas" hint="Destino das notificações operacionais." id="st-email">
                      <label className={`dv-field st-email${emailErr ? ' is-err' : ''}`}>
                        <span className="nx-input">
                          <input type="email" value={draft.alertEmail} placeholder="central@cliente.com.br" aria-labelledby="st-email"
                            onChange={(e) => set('alertEmail', e.target.value)} onBlur={() => setTouched(true)} />
                        </span>
                        {emailErr && <span className="dv-field__h">Informe um e-mail válido.</span>}
                      </label>
                    </Row>
                    <Row label="Alertas de vigilância" hint="Avisar quando um alerta de face, placa ou vídeo for gerado.">
                      <Switch label="Notificar alertas de vigilância" checked={draft.notifyAlerts} onChange={(v) => set('notifyAlerts', v)} />
                    </Row>
                    <Row label="Novas ocorrências" hint="Avisar quando uma ocorrência for registrada.">
                      <Switch label="Notificar novas ocorrências" checked={draft.notifyOccurrences} onChange={(v) => set('notifyOccurrences', v)} />
                    </Row>
                    <p className="st-note"><Icon name="infoFill" size={14} />O envio depende da automação da central, ainda em especificação.</p>
                  </>
                )}
              </div>

              {(editable || dirtyKeys.length > 0) && (
                <footer className="us-rd__foot">
                  {dirtyKeys.length > 0
                    ? <span className="us-rd__pending"><i />Alterações não salvas{dirtySecs.length > 1 ? ` em ${dirtySecs.length} seções` : dirtySecs[0] && dirtySecs[0].id !== sec ? ` em ${dirtySecs[0].label}` : ''}</span>
                    : <span className="us-rd__saved">Nenhuma alteração pendente</span>}
                  <span className="dv-tools__sp" />
                  <Button disabled={!dirtyKeys.length} onClick={discard}>Descartar</Button>
                  <Button variant="primary" icon="check" disabled={!dirtyKeys.length} onClick={save}>Salvar</Button>
                </footer>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
