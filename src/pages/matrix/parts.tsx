import { Icon } from '../../ds/components';
import { FaceImg } from '../faces/FaceImg';
import { ENT } from './data';

/** Rosto (pessoa) ou ícone de veículo, no tamanho do avatar. */
export function Avatar({ id, size = 32 }: { id: string; size?: number }) {
  const e = ENT[id];
  return (
    <span className={`mx-av is-${e.kind}`} style={{ width: size, height: size }}>
      {e.kind === 'pessoa' ? <FaceImg seed={e.seed ?? 0} night={false} /> : <Icon name="car" size={Math.round(size * 0.5)} />}
    </span>
  );
}

/** Pessoa: código provisório. Veículo: placa no padrão Mercosul. */
export function Label({ id }: { id: string }) {
  const e = ENT[id];
  return e.kind === 'veiculo' ? <span className="mx-plate">{e.label}</span> : <>{e.label}</>;
}

/** Avatar + nome + descrição (cabeçalho das linhas da matriz). `mini` mostra só o avatar. */
export function Ent({ id, mini }: { id: string; mini?: boolean }) {
  const e = ENT[id];
  if (mini) return <Avatar id={id} size={26} />;
  return (
    <span className="mx-ent">
      <Avatar id={id} size={28} />
      <span className="dv-name"><b><Label id={id} /></b><span>{e.sub}</span></span>
    </span>
  );
}

/** Versão da tabela de pares: avatar + nome, descrição curta embaixo. */
export function EntChip({ id }: { id: string }) {
  const e = ENT[id];
  return (
    <span className="mx-ent is-chip">
      <Avatar id={id} size={32} />
      <span className="dv-name"><b><Label id={id} /></b><span>{e.sub}</span></span>
    </span>
  );
}
