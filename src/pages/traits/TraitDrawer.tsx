import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Icon, IconButton, Menu, NavItem } from '../../ds/components';
import { copy } from '../devices/parts';
import { FaceImg } from '../faces/FaceImg';
import { Figure } from './Figure';
import { camName, camOf, colorBg, COLOR, EXTRAS, GENDER_LABEL, isSet, MOODS, traitOk, when, type Filters, type Obs, type TraitKey } from './data';

type Props = {
  o: Obs; f: Filters; all: Obs[]; now: number;
  onOpen: (id: string) => void; onClose: () => void; toast: (m: string) => void;
  onSearchLike: (f: Partial<Filters>) => void;
};

/** Detalhe da observação: o que o motor descreveu, com a confiança de cada atributo. */
export function TraitDrawer({ o, f, all, now, onOpen, onClose, toast, onSearchLike }: Props) {
  const navigate = useNavigate();
  const [more, setMore] = useState<HTMLElement | null>(null);
  const cam = camOf(o.src);
  // Mesma descrição em outros momentos: sugere trajeto, mas não confirma que é a mesma pessoa.
  const trail = all.filter((x) => x.person === o.person).sort((a, b) => a.at - b.at);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.nx-menu, .nx-smodal')) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const asked = (k: TraitKey) => isSet(f, k);
  const ok = (k: TraitKey) => traitOk(o, f, k);
  const yn = (v: boolean) => (v ? 'Sim' : 'Não');

  return (
    <aside className="dv-drawer tr-drawer" aria-label="Detalhe da observação">
      <header className="dv-drawer__head">
        <span className="dv-kind is-lg"><Icon name="faces" size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{GENDER_LABEL[o.gender]} · {o.age} anos</h2>
          <p>{camName(o.src)} · {when(o.at, now)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__body">
        <div className="tr-dhero">
          <div className="fc-hero">
            <FaceImg seed={o.seed} night={cam.night} alt="Recorte da pessoa" />
            <span className="fc-hero__det">Track #{o.track}</span>
          </div>
          <div className="tr-dhero__fig">
            <Figure upper={[o.upper]} lower={[o.lower]} gender={o.gender} hat={o.hat} glasses={o.glasses} backpack={o.backpack} extras={o.extras} />
            <span>Como o motor descreveu</span>
          </div>
        </div>

        <Alert type="information" title="Descreve, não identifica">Para saber quem é, use o reconhecimento facial. Semelhança de roupa não confirma identidade.</Alert>

        <div className="fc-acts2">
          <Button variant="primary" icon="tv" onClick={() => { navigate('/mural-de-video'); toast(`Gravação de ${camName(o.src)} às ${new Date(o.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`); }}>Ver gravação</Button>
          <Button icon="search" onClick={() => onSearchLike({ gender: o.gender, ages: [o.age], upper: [o.upper], lower: [o.lower], hat: o.hat ? 'sim' : '', glasses: o.glasses ? 'sim' : '', backpack: o.backpack ? 'sim' : 'nao', extras: [], moods: [] })}>Buscar parecidos</Button>
          <span className="dv-tools__sp" />
          <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
        </div>

        <section className="dv-sec">
          <div className="dv-sec__head"><h3>Características</h3><span className="fc-muted">confiança do motor</span></div>
          <div className="tr-attrs">
            <Attr label="Gênero" value={GENDER_LABEL[o.gender]} conf={o.conf.gender} asked={asked('gender')} ok={ok('gender')} />
            <Attr label="Faixa etária" value={`${o.age} anos`} conf={o.conf.age} asked={asked('ages')} ok={ok('ages')} />
            <Attr label="Roupa superior" value={<><i className="tr-dot" style={{ background: colorBg(o.upper) }} />{COLOR[o.upper].label}</>} conf={o.conf.upper} asked={asked('upper')} ok={ok('upper')} />
            <Attr label="Roupa inferior" value={<><i className="tr-dot" style={{ background: colorBg(o.lower) }} />{COLOR[o.lower].label}</>} conf={o.conf.lower} asked={asked('lower')} ok={ok('lower')} />
            <Attr label="Boné ou chapéu" value={yn(o.hat)} conf={o.conf.hat} asked={asked('hat')} ok={ok('hat')} />
            <Attr label="Óculos" value={yn(o.glasses)} conf={o.conf.glasses} asked={asked('glasses')} ok={ok('glasses')} />
            <Attr label="Mochila" value={yn(o.backpack)} conf={o.conf.backpack} asked={asked('backpack')} ok={ok('backpack')} />
            <Attr label="Outros" value={o.extras.length ? o.extras.map((x) => EXTRAS.find((e) => e.id === x)!.label).join(', ') : '—'} asked={asked('extras')} ok={ok('extras')} />
            <Attr label="Humor aparente" value={MOODS.find((m) => m.id === o.mood)!.label} conf={o.conf.mood} asked={asked('moods')} ok={ok('moods')} guess />
          </div>
        </section>

        <dl className="dv-info">
          <div className="dv-info__row"><dt>Câmera</dt><dd>{cam.name ?? <span className="fc-muted">Sem nome cadastrado</span>}</dd></div>
          <div className="dv-info__row"><dt>Local</dt><dd>{cam.local}</dd></div>
          <div className="dv-info__row"><dt>Capturada em</dt><dd>{new Date(o.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}</dd></div>
          <div className="dv-info__row"><dt>ID da câmera</dt><dd><button type="button" className="dv-copyval is-mono" onClick={() => copy(cam.id, toast, 'ID copiado')}><span>{cam.id}</span><Icon name="copy" size={14} /></button></dd></div>
        </dl>

        {trail.length > 1 && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Vista com esta descrição</h3><span className="fc-muted">{trail.length}</span></div>
            <p className="fc-hint">Possível trajeto. Pode ser outra pessoa vestida igual.</p>
            <ol className="tr-trail">
              {trail.map((x) => (
                <li key={x.id} className={x.id === o.id ? 'is-cur' : undefined}>
                  <button type="button" onClick={() => x.id !== o.id && onOpen(x.id)} disabled={x.id === o.id}>
                    <span className="tr-trail__img"><FaceImg seed={x.seed} night={camOf(x.src).night} /></span>
                    <span className="tr-trail__t"><b>{camName(x.src)}</b><em>{camOf(x.src).local}</em></span>
                    <time>{when(x.at, now)}</time>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          <NavItem role="menuitem" icon="ocor" label="Anexar a uma ocorrência" onClick={() => { setMore(null); toast('Observação anexada à ocorrência OC-2026-0142'); }} />
          <NavItem role="menuitem" icon="download" label="Baixar recorte" onClick={() => { setMore(null); toast('Recorte salvo em Exportações'); }} />
          <NavItem role="menuitem" icon="copy" label="Copiar ID da observação" onClick={() => { setMore(null); copy(o.id, toast, 'ID copiado'); }} />
        </Menu>
      )}
    </aside>
  );
}

function Attr({ label, value, conf, asked, ok, guess }: { label: string; value: ReactNode; conf?: number; asked: boolean; ok: boolean; guess?: boolean }) {
  return (
    <div className={`tr-attr${asked ? (ok ? ' is-ok' : ' is-miss') : ''}`}>
      <span className="tr-attr__l">{label}{guess && <span className="tr-badge">palpite</span>}</span>
      <span className="tr-attr__v">{value}{asked && <Icon name={ok ? 'check' : 'close'} size={14} />}</span>
      {conf != null ? <span className={`tr-conf${conf < 60 ? ' is-low' : ''}`}><span className="tr-conf__t"><i style={{ width: `${conf}%` }} /></span><em>{conf}%</em></span> : <span />}
    </div>
  );
}
