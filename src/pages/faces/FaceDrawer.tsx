import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Icon, IconButton, Menu, NavItem } from '../../ds/components';
import { copy } from '../devices/parts';
import { FaceImg } from './FaceImg';
import { hms, KIND_LABEL, SRC, srcName, STATUS_LABEL, type Face } from './data';

type Props = { f: Face; all: Face[]; onOpen: (id: string) => void; onClose: () => void; toast: (m: string) => void };

/** Detalhe da captura. Na tela atual o card não abre nada; aqui o clique leva à revisão e às ações. */
export function FaceDrawer({ f, all, onOpen, onClose, toast }: Props) {
  const navigate = useNavigate();
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [review, setReview] = useState<'procede' | 'descartado' | null>(null);
  const s = SRC[f.src];
  const same = all.filter((x) => x.seed === f.seed && x.id !== f.id && (f.kind === 'watchlist' || x.src === f.src)).slice(0, 8);
  const fromSrc = all.filter((x) => x.src === f.src && x.id !== f.id && x.seed !== f.seed).slice(0, 8);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.nx-menu, .nx-smodal')) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <aside className="dv-drawer fc-drawer" aria-label="Detalhe da face">
      <header className="dv-drawer__head">
        <span className={`dv-kind is-lg fc-kind is-${f.kind}`}><Icon name={f.kind === 'watchlist' ? 'eye' : 'faces'} size={20} /></span>
        <div className="dv-drawer__title">
          <h2>{f.kind === 'watchlist' ? f.match!.person : f.kind === 'observacao' ? 'Pessoa não cadastrada' : 'Face detectada'}</h2>
          <p>{srcName(s)} · {hms(f.at)}</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="dv-drawer__body">
        <div className={`fc-hero is-${f.kind}`}>
          <FaceImg seed={f.seed} night={s.night} alt="Recorte da face" />
          <span className="fc-hero__det">Detecção {f.det.toLocaleString('pt-BR')}%</span>
        </div>

        {f.kind === 'watchlist' && (
          <Alert type="warning" title={`Match com ${f.match!.person} · ${f.match!.score}%`}>
            Lista “{f.match!.list}”. Um match pede revisão humana e não confirma identidade.
          </Alert>
        )}
        {f.kind === 'observacao' && (
          <Alert type="information" title="Pessoa não cadastrada · em observação">
            Este rosto não corresponde a ninguém do cadastro. Cadastre a pessoa para poder incluí-la em uma watchlist.
          </Alert>
        )}

        <div className="fc-acts2">
          {f.kind === 'watchlist' ? (
            review ? (
              <span className={`fc-rev is-${review === 'procede' ? 'confirmado' : 'descartado'}`}><i />Revisado · {review === 'procede' ? 'procede' : 'descartado'}</span>
            ) : (
              <>
                <Button variant="primary" icon="check" onClick={() => { setReview('procede'); toast('Match revisado: procede'); }}>Procede</Button>
                <Button onClick={() => { setReview('descartado'); toast('Match revisado: descartado'); }}>Descartar</Button>
              </>
            )
          ) : (
            <Button icon="plus" onClick={() => toast('Cadastro de pessoas · ainda não desenhado no protótipo')}>Cadastrar pessoa</Button>
          )}
          <Button icon="search" onClick={() => toast('Busca por semelhança · ainda não desenhada no protótipo')}>Buscar semelhantes</Button>
          <span className="dv-tools__sp" />
          <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="bottom" />
        </div>

        <dl className="dv-info">
          <div className="dv-info__row"><dt>Tipo</dt><dd><Badge tone={f.kind === 'watchlist' ? 'danger' : f.kind === 'observacao' ? 'warning' : 'neutral'}>{KIND_LABEL[f.kind]}</Badge></dd></div>
          <div className="dv-info__row"><dt>Fonte</dt><dd>{s.name ?? <span className="fc-muted">Sem nome cadastrado</span>}</dd></div>
          <div className="dv-info__row"><dt>Local</dt><dd>{s.local}</dd></div>
          <div className="dv-info__row"><dt>Situação da fonte</dt><dd><span className={`dv-conn is-${s.status === 'online' ? 'online' : s.status === 'atencao' ? 'instavel' : 'offline'}`}><i />{STATUS_LABEL[s.status]}</span></dd></div>
          <div className="dv-info__row"><dt>Capturada em</dt><dd>{new Date(f.at).toLocaleDateString('pt-BR')} · {hms(f.at)}</dd></div>
          <div className="dv-info__row"><dt>Track</dt><dd className="is-mono">#{f.track}</dd></div>
          <div className="dv-info__row"><dt>ID da fonte</dt><dd><button type="button" className="dv-copyval is-mono" onClick={() => copy(s.id, toast, 'ID copiado')}><span>{s.id}</span><Icon name="copy" size={14} /></button></dd></div>
        </dl>

        {same.length > 0 && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>{f.kind === 'watchlist' ? 'Outras capturas desta pessoa' : 'Mesma pessoa nesta fonte'}</h3><span className="fc-muted">{same.length}</span></div>
            <Strip list={same} onOpen={onOpen} />
          </section>
        )}
        {fromSrc.length > 0 && (
          <section className="dv-sec">
            <div className="dv-sec__head"><h3>Capturas recentes desta fonte</h3></div>
            <Strip list={fromSrc} onOpen={onOpen} />
          </section>
        )}
      </div>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          {f.kind === 'watchlist' && <NavItem role="menuitem" icon="eye" label="Abrir watchlist" onClick={() => { setMore(null); navigate('/listas-de-observacao'); }} />}
          <NavItem role="menuitem" icon="tv" label="Ver câmera no mural" onClick={() => { setMore(null); navigate('/mural-de-video'); toast(`Abra ${srcName(s)} no mural`); }} />
          <NavItem role="menuitem" icon="download" label="Baixar recorte" onClick={() => { setMore(null); toast('Recorte salvo em Exportações'); }} />
        </Menu>
      )}
    </aside>
  );
}

function Strip({ list, onOpen }: { list: Face[]; onOpen: (id: string) => void }) {
  return (
    <div className="fc-strip">
      {list.map((x) => (
        <button key={x.id} type="button" className={`fc-mini is-${x.kind}`} onClick={() => onOpen(x.id)} aria-label={`${srcName(SRC[x.src])}, ${hms(x.at)}`}>
          <FaceImg seed={x.seed} night={SRC[x.src].night} />
          <span>{hms(x.at).slice(0, 5)}</span>
        </button>
      ))}
    </div>
  );
}
