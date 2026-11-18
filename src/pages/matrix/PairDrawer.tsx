import { useEffect, useState } from 'react';
import { Badge, Button, Icon, IconButton, Menu, NavItem, Tabs } from '../../ds/components';
import { useUi } from '../../lib/useUi';
import { ageText, ENT, fmtDT, gapText, pairType, placeText, TYPE_LABEL, WINDOW_TXT, type Encounter, type Pair } from './data';
import { Avatar, Label } from './parts';

type Tab = 'encontros' | 'locais' | 'envolvidos';
type Other = { p: Pair; n: number };
type Props = {
  pair: Pair; enc: Encounter[]; places: [string, number][]; period: string;
  others: (id: string) => Other[]; onOpenPair: (id: string) => void; onClose: () => void; onExport: () => void;
};

/** Detalhe do par: quantas vezes, onde (bloco e andar) e cada encontro com a câmera que viu. */
export function PairDrawer({ pair, enc, places, period, others, onOpenPair, onClose, onExport }: Props) {
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('encontros');
  const [more, setMore] = useState<HTMLElement | null>(null);
  const a = ENT[pair.a], b = ENT[pair.b];
  const n = enc.length;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('.nx-modal-back, .nx-smodal, .nx-menu, .nx-sheet-back:not(.is-soft)')) return;
      onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  // Agrupa os locais por bloco, com os andares embaixo
  const blocks = new Map<string, { n: number; floors: [string, number][] }>();
  enc.forEach((e) => {
    const g = blocks.get(e.place) ?? { n: 0, floors: [] };
    g.n++;
    if (e.floor) { const f = g.floors.find((x) => x[0] === e.floor); if (f) f[1]++; else g.floors.push([e.floor, 1]); }
    blocks.set(e.place, g);
  });
  const blockList = [...blocks].sort((x, y) => y[1].n - x[1].n);
  const days = new Set(enc.map((e) => e.at.slice(0, 10))).size;

  return (
    <aside className="dv-drawer mx-drawer" aria-label={`${a.label} e ${b.label}`}>
      <header className="dv-drawer__head">
        <span className="mx-duo"><Avatar id={a.id} size={36} /><Avatar id={b.id} size={36} /></span>
        <div className="dv-drawer__title">
          <h2><Label id={a.id} /> + <Label id={b.id} /></h2>
          <p>{TYPE_LABEL[pairType(pair)]} · sem cadastro no campus</p>
        </div>
        <IconButton icon="close" label="Fechar painel" shortcut="Esc" onClick={onClose} tipPlace="bottom" />
      </header>

      <div className="wl-kpis">
        <div><span>Vezes juntos</span><b>{n}</b><small>{period}</small></div>
        <div><span>Dias diferentes</span><b>{days}</b><small>{places.length} {places.length === 1 ? 'local' : 'locais'}</small></div>
        <div><span>Último encontro</span><b className="mx-kpi-sm">{ageText(enc[0].at)}</b><small>{fmtDT(enc[0].at)}</small></div>
      </div>

      <Tabs label="Seções" value={tab} onChange={setTab} className="lc-tabs" options={[
        { value: 'encontros', label: 'Encontros', count: n },
        { value: 'locais', label: 'Onde', count: places.length },
        { value: 'envolvidos', label: 'Envolvidos' },
      ]} />

      <div className="dv-drawer__body" key={tab}>
        {tab === 'encontros' && (
          <section className="dv-sec">
            <p className="dv-muted">Cada vez que os dois foram vistos juntos ({WINDOW_TXT}). Mais recente primeiro.</p>
            <ul className="mx-enc">
              {enc.map((e) => (
                <li key={e.id}>
                  <span className="mx-enc__shots"><Avatar id={a.id} size={36} /><Avatar id={b.id} size={36} /></span>
                  <span className="dv-name">
                    <b>{placeText(e.place, e.floor)}</b>
                    <span>{e.camera}</span>
                    <span className="wl-meta">{fmtDT(e.at)} · {gapText(e.gap)} entre as detecções</span>
                  </span>
                  <IconButton icon="replay" label="Ver gravação" onClick={() => toast(`Gravação de ${e.camera} · ${fmtDT(e.at)} · simulado no protótipo`)} tipPlace="top" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === 'locais' && (
          <section className="dv-sec">
            <p className="dv-muted">Em quais blocos e andares os dois aparecem juntos.</p>
            <ul className="mx-where">
              {blockList.map(([place, g]) => (
                <li key={place}>
                  <div className="mx-where__row is-block">
                    <Icon name={g.floors.length ? 'stack' : 'pin'} size={14} />
                    <b>{place}</b>
                    <span className="mx-bar"><i style={{ width: `${(g.n / n) * 100}%` }} /></span>
                    <span className="mx-where__n">{g.n}×</span>
                  </div>
                  {g.floors.sort((x, y) => y[1] - x[1]).map(([fl, c]) => (
                    <div key={fl} className="mx-where__row">
                      <span className="mx-where__in">{fl}</span>
                      <span className="mx-bar is-soft"><i style={{ width: `${(c / n) * 100}%` }} /></span>
                      <span className="mx-where__n">{c}×</span>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === 'envolvidos' && [a, b].map((x) => {
          const os = others(x.id).sort((p, q) => q.n - p.n);
          return (
            <section key={x.id} className="dv-sec">
              <div className="mx-who">
                <Avatar id={x.id} size={44} />
                <span className="dv-name">
                  <b><Label id={x.id} /> <Badge tone="warning">Sem cadastro</Badge></b>
                  <span>{x.sub}</span>
                  <span className="wl-meta">Visto {x.seen}× no campus · primeira vez {ageText(x.first)}</span>
                </span>
              </div>
              <h3 className="mx-sub">Também visto junto de</h3>
              {os.length === 0 ? <p className="dv-muted">Ninguém mais no período.</p> : (
                <ul className="lc-dlist mx-olist">
                  {os.map((o) => {
                    const id = o.p.a === x.id ? o.p.b : o.p.a;
                    return (
                      <li key={o.p.id}>
                        <button type="button" onClick={() => onOpenPair(o.p.id)}>
                          <Avatar id={id} size={28} />
                          <span className="dv-name"><b><Label id={id} /></b><span>{ENT[id].sub}</span></span>
                          <span className="mx-where__n">{o.n}×</span>
                          <Icon name="chevron" size={14} className="mx-go" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <footer className="dv-drawer__foot">
        <IconButton icon="more" label="Mais ações" onClick={(e) => setMore(more ? null : e.currentTarget)} tipPlace="top" />
        <span className="dv-tools__sp" />
        <Button icon="download" onClick={onExport}>Exportar</Button>
        <Button variant="primary" icon="eye" onClick={() => toast('Abre a inclusão dos dois em lista de observação · simulado no protótipo')}>Observar os dois</Button>
      </footer>

      {more && (
        <Menu anchor={more} onClose={() => setMore(null)}>
          {(a.kind === 'pessoa' || b.kind === 'pessoa') && <NavItem role="menuitem" icon="people" label="Cadastrar pessoa" onClick={() => { setMore(null); toast('Abre o cadastro de pessoa com a face · simulado no protótipo'); }} />}
          {(a.kind === 'veiculo' || b.kind === 'veiculo') && <NavItem role="menuitem" icon="car" label="Cadastrar veículo" onClick={() => { setMore(null); toast('Abre o cadastro de veículo com a placa · simulado no protótipo'); }} />}
          <div className="nx-menu__sep" />
          <NavItem role="menuitem" icon="ocor" label="Registrar ocorrência" onClick={() => { setMore(null); toast('Abre uma nova ocorrência com os encontros anexados · simulado no protótipo'); }} />
        </Menu>
      )}
    </aside>
  );
}
