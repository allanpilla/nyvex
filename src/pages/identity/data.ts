/**
 * Identidade: cadastro único de pessoas e de veículos.
 * As 7 primeiras pessoas e as placas lidas pelo LPR vêm da homologação (lidas em 20/11/2026);
 * o restante é sintético, para a tela ter volume. Avistamentos, alertas e credenciais são de exemplo.
 */
import { CAMS } from '../mural/data';
import { WATCHLISTS } from '../watchlists/data';

export const NOW = new Date('2026-11-20T09:30:00-03:00').getTime();
const MIN = 60e3, H = 60 * MIN, D = 24 * H;

function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

/* ───────────── Pessoas ───────────── */

export type PStatus = 'pendente' | 'ativa' | 'suspensa' | 'inativa' | 'bloqueada' | 'falecida';
export const P_STATUS: Record<PStatus, string> = { pendente: 'Pendente', ativa: 'Ativa', suspensa: 'Suspensa', inativa: 'Inativa', bloqueada: 'Bloqueada', falecida: 'Falecida' };
export const P_STATUS_ORDER: PStatus[] = ['pendente', 'ativa', 'suspensa', 'inativa', 'bloqueada', 'falecida'];

export type DocType = 'CPF' | 'RG' | 'Passaporte' | 'CNH' | 'Outro';
export const DOC_TYPES: DocType[] = ['CPF', 'RG', 'Passaporte', 'CNH', 'Outro'];

export type PType = { id: string; name: string; code: string; fields: number; groups: number; desc: string };
export const P_TYPES: PType[] = [
  { id: 'aluno', name: 'Aluno', code: 'STUDENT', fields: 4, groups: 1, desc: 'RA, curso, período e turno.' },
  { id: 'funcionario', name: 'Funcionário', code: 'STAFF', fields: 3, groups: 1, desc: 'Matrícula, setor e cargo.' },
  { id: 'prestador', name: 'Prestador de serviço', code: 'CONTRACTOR', fields: 3, groups: 1, desc: 'Empresa, contrato e vigência.' },
  { id: 'professor', name: 'Professor', code: 'TEACHER', fields: 3, groups: 1, desc: 'Matrícula, departamento e disciplinas.' },
  { id: 'responsavel', name: 'Responsável', code: 'GUARDIAN', fields: 2, groups: 1, desc: 'Parentesco e aluno vinculado.' },
  { id: 'visitante', name: 'Visitante', code: 'VISITOR', fields: 4, groups: 1, desc: 'Anfitrião, motivo, empresa e validade.' },
  { id: 'aluno-demo', name: 'Aluno (DEMO)', code: 'DEMO_STUDENT', fields: 8, groups: 2, desc: 'Tipo de demonstração com dois grupos de campos.' },
];
export const typeName = (id: string) => P_TYPES.find((t) => t.id === id)?.name ?? id;

export type Risk = 'baixo' | 'medio' | 'alto';
export const RISK_LABEL: Record<Risk, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

export type Sighting = { at: number; camId: string; score: number };
export type AlertSt = 'pendente' | 'reconhecido' | 'descartado';
export type PAlert = { id: string; at: number; camId: string; score: number; list: string; sev: 'critica' | 'alta' | 'media'; status: AlertSt; reason?: string };
export type Cred = { id: string; kind: 'Cartão' | 'QR Code' | 'Facial'; code: string; until: number | null; status: 'ativa' | 'vencida' | 'revogada' };
export type Link = { personId: string; relation: string };
export type Contact = { kind: 'Telefone' | 'E-mail'; masked: string };
export type Consent = { purpose: string; at: number; until: number | null };
export type Person = {
  id: string; name: string; social?: string; doc: { type: DocType; tail: string } | null; birth?: string; externalId?: string;
  photo: number | null; status: PStatus; types: string[]; risk: Risk; wanted?: boolean;
  created: number; updated: number;
  /** Matrícula, RA, curso etc. (atributos do tipo). */
  attrs: [string, string][];
  sightings: Sighting[]; alerts: PAlert[]; creds: Cred[]; links: Link[]; contacts: Contact[]; consents: Consent[];
  qualifications: string[]; assignments: string[];
  /** Listas em que foi incluída nesta sessão (as demais vêm das watchlists). */
  extraLists?: { name: string; reason: string; threshold: number }[];
};

export const camById = (id: string) => CAMS.find((c) => c.id === id);
export const camLabel = (id: string) => camById(id)?.name ?? id;
/** Nome da câmera sem o bloco/área. */
export const camShort = (id: string) => { const c = camById(id); return c ? c.name.slice(c.local.length + 3) : id; };

const cam = (s: string) => CAMS.find((c) => c.name === s)!.id;
const PORT = [cam('Portarias · Portaria 1'), cam('Portarias · Portaria 2'), cam('Portarias · Portaria 3 · Pedestres')];
/** Rotina de cada perfil: câmeras por onde costuma passar ao longo do dia. */
const ROUTINE: Record<string, string[]> = {
  aluno: [cam('Bloco 05 · Rampa TE'), cam('Bloco 05 · Corredor térreo'), cam('Bloco 07 · Entrada TE'), cam('Bloco 07 · Sala Alimentação'), cam('Bloco 04 · Pátio'), cam('Ginásio · Entrada 1 TE')],
  funcionario: [cam('Bloco 08 · Saguão'), cam('Bloco 08 · Secretaria'), cam('Bloco 08 · Tesouraria'), cam('Bloco 07 · Sala Alimentação')],
  professor: [cam('Bloco 02 · Entrada'), cam('Bloco 02 · Corredor térreo'), cam('Bloco 09 · Auditório'), cam('Bloco 07 · Acervo')],
  prestador: [cam('Portarias · Doca de carga'), cam('Bloco 09 · Data center'), cam('Bloco 06 · Externa 1'), cam('Bloco 04 · Externa')],
  visitante: [cam('Portarias · Guarita'), cam('Bloco 08 · Saguão'), cam('Bloco 06 · Recepção')],
  responsavel: [cam('Portarias · Guarita'), cam('Bloco 08 · Secretaria')],
  none: [cam('Bloco 04 · Pátio'),cam('Bloco 07 · Entrada TE'), cam('Bloco 06 · Externa 1')],
};

/** Avistamentos de um dia típico: entrada pela portaria, rotina e saída. */
function buildSightings(seed: number, types: string[], days: number, perDay: [number, number]): Sighting[] {
  const r = rng(seed);
  const route = ROUTINE[types.find((t) => ROUTINE[t]) ?? 'none'] ?? ROUTINE.none;
  const out: Sighting[] = [];
  for (let d = 0; d < days; d++) {
    if (r() < 0.28) continue; // dias sem passagem (fins de semana, faltas)
    const day0 = Math.floor((NOW - d * D) / D) * D + 3 * H; // 00h em Brasília
    const n = perDay[0] + Math.floor(r() * (perDay[1] - perDay[0] + 1));
    let t = day0 + (7 + r() * 3) * H;
    const gate = PORT[Math.floor(r() * PORT.length)];
    const seq = [gate, ...Array.from({ length: Math.max(0, n - 2) }, () => route[Math.floor(r() * route.length)]), gate];
    seq.forEach((c, i) => {
      if (t > NOW) return;
      out.push({ at: Math.round(t), camId: c, score: 72 + Math.floor(r() * 26) });
      t += (i === seq.length - 2 ? 2 + r() * 4 : 0.2 + r() * 1.4) * H;
    });
  }
  return out.sort((a, b) => b.at - a.at);
}

function buildAlerts(seed: number, s: Sighting[], list: string, n: number, pend: number): PAlert[] {
  const r = rng(seed);
  return s.slice(0, n).map((x, i) => ({
    id: `al-${seed}-${i}`, at: x.at, camId: x.camId, score: 50 + Math.floor(r() * 40), list,
    sev: (i % 4 === 0 ? 'critica' : i % 3 === 0 ? 'media' : 'alta') as PAlert['sev'],
    status: (i < pend ? 'pendente' : r() > 0.4 ? 'reconhecido' : 'descartado') as AlertSt,
  }));
}

type Seed = Omit<Person, 'sightings' | 'alerts' | 'creds' | 'links' | 'contacts' | 'consents' | 'qualifications' | 'assignments' | 'attrs'> & Partial<Person> & {
  seen?: [days: number, perDay: [number, number]]; alertsN?: [list: string, n: number, pend: number];
};
const ago = (h: number) => NOW - h * H;
const day = (iso: string) => new Date(`${iso}T12:00:00-03:00`).getTime();

const SEEDS: Seed[] = [
  // Homologação
  { id: '01a168b8-7543-7925-b89e-0e4aed2fa28d', name: 'teste fake face', doc: { type: 'CPF', tail: '07' }, photo: null, status: 'pendente', types: [], risk: 'baixo', created: ago(500), updated: ago(500) },
  { id: '01a168b8-7543-7925-b89e-0e4aed2f8824', name: 'Teste QA perfil', doc: { type: 'CPF', tail: '19' }, photo: null, status: 'ativa', types: ['responsavel'], risk: 'baixo', created: ago(620), updated: ago(300),
    attrs: [['Parentesco', 'Mãe'], ['Aluno vinculado', 'usuario de teste']], links: [{ personId: '01a168b8-7543-7925-b89e-0e4aed2fd947', relation: 'Responsável por' }] },
  { id: '01a168b8-7543-7925-b89e-0e4aed2fd947', name: 'usuario de teste', doc: { type: 'CPF', tail: '76' }, photo: null, status: 'pendente', types: ['aluno'], risk: 'baixo', created: ago(640), updated: ago(640),
    attrs: [['RA', '2026001'], ['Curso', 'Sistemas de Informação'], ['Período', '1º'], ['Turno', 'Noite']], links: [{ personId: '01a168b8-7543-7925-b89e-0e4aed2f8824', relation: 'Dependente de' }] },
  { id: '01a168b8-7543-7925-b89e-0e4aed2f7fc6', name: 'Andrei', doc: { type: 'CPF', tail: '67' }, photo: 11, status: 'ativa', types: ['funcionario'], risk: 'medio', created: ago(1400), updated: ago(70),
    attrs: [['Matrícula', '8812'], ['Setor', 'Tecnologia da Informação'], ['Cargo', 'Analista de suporte']], seen: [30, [3, 6]], alertsN: ['Acompanhamento QA Faces', 6, 2],
    creds: [{ id: 'c1', kind: 'Cartão', code: '0042 1187', until: day('2027-06-30'), status: 'ativa' }, { id: 'c2', kind: 'Facial', code: 'Face cadastrada', until: null, status: 'ativa' }],
    qualifications: ['NR-10 · Segurança em eletricidade'], contacts: [{ kind: 'E-mail', masked: 'a••••@unibrasil.com.br' }, { kind: 'Telefone', masked: '(41) •••••-4410' }] },
  { id: '01a168b8-7543-7925-b89e-0e4aed2fbcdf', name: 'Thiago Suzue', doc: { type: 'Passaporte', tail: '' }, photo: 23, status: 'ativa', types: [], risk: 'medio', created: ago(900), updated: ago(72),
    seen: [30, [2, 5]], alertsN: ['Acompanhamento QA Faces', 14, 9] },
  { id: '01a168b8-7543-7925-b89e-0e4aed2f3456', name: 'Elisa Santos', doc: { type: 'CPF', tail: '55' }, photo: 4, status: 'ativa', types: ['visitante'], risk: 'baixo', created: ago(1100), updated: ago(400),
    attrs: [['Anfitrião', 'Secretaria acadêmica'], ['Motivo', 'Reuniões de QA'], ['Empresa', 'Nyvex'], ['Validade', '31/12/2026']], seen: [30, [1, 3]], alertsN: ['Acompanhamento QA Faces', 3, 0],
    creds: [{ id: 'c3', kind: 'QR Code', code: 'VIS-20931', until: day('2026-12-31'), status: 'ativa' }] },
  { id: '01a168b8-7543-7925-b89e-0e4aed2f0842', name: 'Leo Lima [DEMO]', doc: { type: 'Outro', tail: '42' }, photo: 37, status: 'ativa', types: ['aluno-demo', 'aluno'], risk: 'baixo', created: ago(1500), updated: ago(96),
    attrs: [['RA', 'DEMO-0042'], ['Curso', 'Demonstração'], ['Período', '3º'], ['Turno', 'Manhã']], seen: [12, [2, 4]] },
  // Sintéticas
  { id: 'p-mariana', name: 'Mariana Duarte Lopes', doc: { type: 'CPF', tail: '31' }, photo: 52, status: 'ativa', types: ['aluno'], risk: 'medio', created: ago(4000), updated: ago(20),
    attrs: [['RA', '2023014'], ['Curso', 'Engenharia Civil'], ['Período', '6º'], ['Turno', 'Manhã']], seen: [30, [3, 7]], extraLists: [{ name: 'Lista de observação · Reitoria', reason: 'Acompanhamento solicitado pela Reitoria (chamado SEG-2307).', threshold: 80 }],
    alertsN: ['Lista de observação · Reitoria', 4, 1],
    creds: [{ id: 'c4', kind: 'Cartão', code: '0042 2210', until: day('2027-02-28'), status: 'ativa' }, { id: 'c5', kind: 'Facial', code: 'Face cadastrada', until: null, status: 'ativa' }],
    contacts: [{ kind: 'E-mail', masked: 'm••••@aluno.unibrasil.com.br' }], links: [{ personId: 'p-ricardo', relation: 'Colega de projeto' }] },
  { id: 'p-ricardo', name: 'Ricardo Almeida Prado', doc: { type: 'CPF', tail: '02' }, photo: 61, status: 'ativa', types: ['funcionario'], risk: 'baixo', created: ago(9000), updated: ago(500),
    attrs: [['Matrícula', '8841'], ['Setor', 'Manutenção'], ['Cargo', 'Técnico de manutenção']], seen: [30, [4, 8]],
    creds: [{ id: 'c6', kind: 'Cartão', code: '0042 0091', until: day('2026-11-10'), status: 'vencida' }], qualifications: ['NR-35 · Trabalho em altura', 'NR-10 · Segurança em eletricidade'], assignments: ['OS-4471 · Troca de luminárias · Bloco 05'],
    links: [{ personId: 'p-mariana', relation: 'Colega de projeto' }] },
  { id: 'p-ana', name: 'Ana Beatriz Moreira', doc: { type: 'RG', tail: '88' }, photo: 70, status: 'ativa', types: ['visitante'], risk: 'baixo', created: ago(3), updated: ago(3),
    attrs: [['Anfitrião', 'Coordenação de Direito'], ['Motivo', 'Banca de TCC'], ['Empresa', '—'], ['Validade', '20/11/2026']], seen: [1, [2, 3]],
    creds: [{ id: 'c7', kind: 'QR Code', code: 'VIS-21007', until: NOW + 9 * H, status: 'ativa' }] },
  { id: 'p-carlos', name: 'Carlos Eduardo Lima', doc: { type: 'CPF', tail: '64' }, photo: 83, status: 'ativa', types: ['professor'], risk: 'baixo', created: ago(15000), updated: ago(800),
    attrs: [['Matrícula', '2207'], ['Departamento', 'Direito'], ['Disciplinas', 'Direito Civil I e II']], seen: [30, [2, 5]],
    creds: [{ id: 'c8', kind: 'Cartão', code: '0042 0307', until: day('2026-12-08'), status: 'ativa' }, { id: 'c9', kind: 'Facial', code: 'Face cadastrada', until: null, status: 'ativa' }],
    contacts: [{ kind: 'E-mail', masked: 'c••••@unibrasil.com.br' }] },
  { id: 'p-juliana-pc', name: 'Juliana Pires Costa', doc: { type: 'CPF', tail: '13' }, photo: 95, status: 'bloqueada', types: ['aluno'], risk: 'alto', created: ago(6000), updated: ago(30),
    attrs: [['RA', '2022877'], ['Curso', 'Medicina Veterinária'], ['Período', '8º'], ['Turno', 'Integral']], seen: [30, [1, 3]],
    creds: [{ id: 'c10', kind: 'Cartão', code: '0042 1934', until: day('2027-07-31'), status: 'revogada' }] },
  { id: 'p-carla', name: 'Carla Mendes', doc: { type: 'CPF', tail: '40' }, photo: 104, status: 'ativa', types: ['funcionario'], risk: 'baixo', created: ago(20000), updated: ago(900),
    attrs: [['Matrícula', '7710'], ['Setor', 'Segurança patrimonial'], ['Cargo', 'Coordenadora']], seen: [30, [3, 6]],
    creds: [{ id: 'c11', kind: 'Cartão', code: '0042 0012', until: day('2027-12-31'), status: 'ativa' }], qualifications: ['Vigilante · CNV ativa'] },
  { id: 'p-rafael', name: 'Rafael Souza', doc: { type: 'CPF', tail: '28' }, photo: 118, status: 'ativa', types: ['funcionario'], risk: 'baixo', created: ago(18000), updated: ago(1200),
    attrs: [['Matrícula', '7742'], ['Setor', 'Segurança patrimonial'], ['Cargo', 'Supervisor']], seen: [30, [3, 6]],
    creds: [{ id: 'c12', kind: 'Cartão', code: '0042 0018', until: day('2026-12-02'), status: 'ativa' }] },
  { id: 'p-juliana', name: 'Juliana Prado', doc: { type: 'CPF', tail: '91' }, photo: 126, status: 'ativa', types: ['funcionario'], risk: 'baixo', created: ago(16000), updated: ago(2000),
    attrs: [['Matrícula', '6620'], ['Setor', 'Reitoria'], ['Cargo', 'Assessora']], seen: [30, [2, 4]] },
  { id: 'p-marcos', name: 'Marcos Lima', doc: { type: 'CPF', tail: '73' }, photo: 133, status: 'inativa', types: ['funcionario'], risk: 'alto', created: ago(30000), updated: ago(2100),
    attrs: [['Matrícula', '5521'], ['Setor', 'Almoxarifado'], ['Cargo', 'Auxiliar (desligado em 08/2026)']], seen: [30, [0, 1]], alertsN: ['Acesso restrito · Portarias', 2, 0],
    creds: [{ id: 'c13', kind: 'Cartão', code: '0042 0577', until: day('2026-08-31'), status: 'revogada' }] },
  { id: 'p-bruno', name: 'Bruno Tavares', doc: { type: 'CPF', tail: '45' }, photo: 141, status: 'inativa', types: ['funcionario'], risk: 'alto', created: ago(25000), updated: ago(1500),
    attrs: [['Matrícula', '5980'], ['Setor', 'Manutenção'], ['Cargo', 'Eletricista (desligado em 09/2026)']], seen: [30, [0, 2]], alertsN: ['Acesso restrito · Portarias', 3, 1],
    creds: [{ id: 'c14', kind: 'Cartão', code: '0042 0802', until: day('2026-09-30'), status: 'revogada' }] },
  { id: 'p-patricia', name: 'Patrícia Rocha', doc: { type: 'CPF', tail: '09' }, photo: 150, status: 'suspensa', types: ['prestador'], risk: 'medio', created: ago(12000), updated: ago(480),
    attrs: [['Empresa', 'Limpa Mais Serviços'], ['Contrato', 'CT-2025-118'], ['Vigência', 'até 31/10/2026']], seen: [30, [0, 2]],
    creds: [{ id: 'c15', kind: 'Cartão', code: '0042 1401', until: day('2026-10-31'), status: 'vencida' }], assignments: ['OS-4390 · Limpeza pós-obra · Bloco 06'] },
  { id: 'p-andre', name: 'André Kowalski', doc: { type: 'Passaporte', tail: '' }, photo: 157, status: 'ativa', types: ['professor'], risk: 'baixo', created: ago(7000), updated: ago(700),
    attrs: [['Matrícula', '3105'], ['Departamento', 'Engenharias'], ['Disciplinas', 'Estruturas de concreto']], seen: [30, [2, 4]],
    creds: [{ id: 'c16', kind: 'Cartão', code: '0042 2602', until: day('2026-12-15'), status: 'ativa' }] },
  { id: 'p-fernanda', name: 'Fernanda Okada', doc: { type: 'RG', tail: '52' }, photo: 166, status: 'ativa', types: ['visitante'], risk: 'baixo', created: ago(2800), updated: ago(1800),
    attrs: [['Anfitrião', 'Reitoria'], ['Motivo', 'Reuniões institucionais'], ['Empresa', 'Okada Consultoria'], ['Validade', '01/12/2026']], seen: [30, [1, 2]] },
  { id: 'p-gustavo', name: 'Gustavo Henrique Ramos', doc: { type: 'CPF', tail: '17' }, photo: 172, status: 'ativa', types: ['aluno'], risk: 'baixo', created: ago(5000), updated: ago(300),
    attrs: [['RA', '2024311'], ['Curso', 'Educação Física'], ['Período', '4º'], ['Turno', 'Noite']], seen: [30, [3, 6]],
    creds: [{ id: 'c17', kind: 'Cartão', code: '0042 3310', until: day('2027-07-31'), status: 'ativa' }] },
  { id: 'p-larissa', name: 'Larissa Fontana', doc: { type: 'CPF', tail: '86' }, photo: 179, status: 'ativa', types: ['aluno'], risk: 'baixo', created: ago(5200), updated: ago(260),
    attrs: [['RA', '2024188'], ['Curso', 'Psicologia'], ['Período', '4º'], ['Turno', 'Manhã']], seen: [30, [3, 6]],
    creds: [{ id: 'c18', kind: 'Cartão', code: '0042 3118', until: day('2027-07-31'), status: 'ativa' }] },
  { id: 'p-diego', name: 'Diego Nascimento', doc: { type: 'CPF', tail: '39' }, photo: 186, status: 'ativa', types: ['prestador'], risk: 'baixo', created: ago(900), updated: ago(40),
    attrs: [['Empresa', 'Redes Sul Telecom'], ['Contrato', 'CT-2026-041'], ['Vigência', 'até 15/12/2026']], seen: [10, [2, 4]],
    creds: [{ id: 'c19', kind: 'Cartão', code: 'PRS-0410', until: day('2026-12-15'), status: 'ativa' }], assignments: ['OS-4502 · Cabeamento do data center · Bloco 09'] },
  { id: 'p-helena', name: 'Helena Vieira', doc: { type: 'CPF', tail: '24' }, photo: 191, status: 'ativa', types: ['responsavel'], risk: 'baixo', created: ago(2000), updated: ago(1000),
    attrs: [['Parentesco', 'Mãe'], ['Aluno vinculado', 'Gustavo Henrique Ramos']], seen: [30, [0, 2]], links: [{ personId: 'p-gustavo', relation: 'Responsável por' }] },
  { id: 'p-desconhecido', name: 'Desconhecido #4471', doc: null, photo: 198, status: 'pendente', types: [], risk: 'alto', wanted: true, created: ago(60), updated: ago(2),
    seen: [7, [1, 3]] },
];

export function buildPeople(): Person[] {
  return SEEDS.map((s, i) => {
    const sightings = s.seen ? buildSightings(1000 + i * 37, s.types, s.seen[0], s.seen[1]) : [];
    const alerts = s.alertsN ? buildAlerts(2000 + i, sightings, s.alertsN[0], s.alertsN[1], s.alertsN[2]) : [];
    const { seen, alertsN, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      attrs: [], creds: [], links: [], contacts: [], qualifications: [], assignments: [],
      ...rest, sightings, alerts,
      consents: s.consents ?? (s.photo != null && s.status !== 'pendente' ? [{ purpose: 'Reconhecimento facial para controle de acesso', at: s.created + D, until: null }] : []),
    } as Person;
  });
}

/** Listas de observação em que a pessoa está (das watchlists + incluídas nesta sessão). */
export function listsOf(p: Person) {
  const fromWl = WATCHLISTS.flatMap((w) => w.people.filter((x) => x.name === p.name).map((x) => ({
    name: w.name, reason: x.reason, threshold: x.threshold, until: x.until, active: w.state === 'ativa' && !(x.until && new Date(x.until).getTime() < NOW),
  })));
  return [...fromWl, ...(p.extraLists ?? []).map((x) => ({ ...x, until: null as string | null, active: true }))];
}
export const isMonitored = (p: Person) => listsOf(p).some((l) => l.active);
export const pendingAlerts = (p: Person) => p.alerts.filter((a) => a.status === 'pendente').length;
export const credExpired = (p: Person) => p.creds.some((c) => c.status === 'vencida');
export const credExpiring = (p: Person) => p.creds.some((c) => c.status === 'ativa' && c.until != null && c.until - NOW < 30 * D);
export const docText = (p: Person) => (!p.doc ? 'Sem documento' : p.doc.type === 'Passaporte' && !p.doc.tail ? 'Passaporte · protegido' : `${p.doc.type} · final ${p.doc.tail}`);
export const shortId = (id: string) => {
  if (/^[0-9a-f-]{36}$/.test(id)) return `••••${id.slice(-4)}`;
  let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `••••${(h & 0xffff).toString(16).padStart(4, '0')}`;
};
export const initials = (n: string) => n.replace(/\[.*?\]|#\d+/g, '').trim().split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';

/* ───────────── Veículos ───────────── */

export type VStatus = 'ativo' | 'inativo' | 'bloqueado';
export const V_STATUS: Record<VStatus, string> = { ativo: 'Ativo', inativo: 'Inativo', bloqueado: 'Bloqueado' };
export const V_TYPES = ['Carro', 'Moto', 'Caminhonete', 'Utilitário', 'Caminhão'] as const;
export type VType = typeof V_TYPES[number];
export type VPass = { at: number; camId: string; dir: 'entrada' | 'saida' | null; conf: number };
export type Vehicle = {
  id: string; plate: string; type: VType | null; brand: string; model: string; color: string; year: number | null;
  status: VStatus; interest: boolean; interestReason?: string; owner: string | null; fleet?: string;
  passes: VPass[]; intel: number; created: number; source: 'LPR' | 'Cadastro';
};

const LPR = [cam('Estacionamento · Cancela Norte'), cam('Estacionamento · Cancela Sul'), cam('Portarias · Portaria 1'), cam('Portarias · Portaria 2')];
function buildPasses(seed: number, days: number, perDay: [number, number]): VPass[] {
  const r = rng(seed);
  const out: VPass[] = [];
  for (let d = 0; d < days; d++) {
    if (r() < 0.35) continue;
    const day0 = Math.floor((NOW - d * D) / D) * D + 3 * H;
    const n = perDay[0] + Math.floor(r() * (perDay[1] - perDay[0] + 1));
    let t = day0 + (6.5 + r() * 4) * H;
    for (let i = 0; i < n; i++) {
      if (t > NOW) break;
      const c = LPR[Math.floor(r() * LPR.length)];
      out.push({ at: Math.round(t), camId: c, dir: c.includes('cancela') ? (i % 2 ? 'saida' : 'entrada') : null, conf: 88 + Math.floor(r() * 12) });
      t += (1 + r() * 8) * H;
    }
  }
  return out.sort((a, b) => b.at - a.at);
}
const one = (seed: number, hAgo: number): VPass[] => { const r = rng(seed); return [{ at: NOW - hAgo * H, camId: LPR[Math.floor(r() * LPR.length)], dir: null, conf: 80 + Math.floor(r() * 18) }]; };

type VSeed = Omit<Vehicle, 'passes' | 'id' | 'type' | 'brand' | 'model' | 'color' | 'year' | 'status' | 'interest' | 'owner' | 'intel' | 'created' | 'source'> & Partial<Vehicle> & { pass?: [days: number, perDay: [number, number]] | number };
const V_SEEDS: VSeed[] = [
  // Placas da homologação (a maioria criada pelo LPR, sem marca/modelo)
  { plate: 'AAM1814', pass: 74 }, { plate: 'MAC4819', pass: 42.3 },
  { plate: 'TAU1F42', type: 'Carro', brand: 'BYD', model: 'Song Plus', color: 'Azul', year: 2025, source: 'Cadastro', pass: 0, interest: true, interestReason: 'Incluído no Acompanhamento QA Faces (teste de QA).' },
  { plate: 'TXM1C14', pass: 96.8 }, { plate: 'MAL1719', pass: 100.5 }, { plate: 'MAL1710', pass: [5, [1, 1]] }, { plate: 'MAI1870', pass: 100.6 },
  { plate: 'AXA4I10', pass: 101.4 }, { plate: 'AXA4110', pass: 101.5 }, { plate: 'AXI6110', pass: 101.9 }, { plate: 'AXI4114', pass: 102.3 },
  { plate: 'BCD3E21', pass: 104 }, { plate: 'QHP2G07', pass: 110 }, { plate: 'RFT8B33', pass: 120 }, { plate: 'MBX5H90', pass: 131 },
  { plate: 'PZA1C55', pass: 140 }, { plate: 'KLM7D12', pass: 152 }, { plate: 'NTR4F08', pass: 166 }, { plate: 'OPQ9A61', pass: 170 },
  { plate: 'GHJ2K48', status: 'inativo', pass: 600 },
  // Cadastrados
  { plate: 'BRA2E19', type: 'Carro', brand: 'Fiat', model: 'Argo', color: 'Prata', year: 2021, owner: 'p-mariana', source: 'Cadastro', pass: [30, [1, 3]], interest: true, interestReason: 'Veículo da pessoa em Lista de observação · Reitoria.' },
  { plate: 'RTX4C82', type: 'Moto', brand: 'Honda', model: 'CG 160', color: 'Preta', year: 2019, source: 'LPR', pass: [14, [1, 2]] },
  { plate: 'QWE1A23', type: 'Utilitário', brand: 'Volkswagen', model: 'Saveiro', color: 'Branca', year: 2020, fleet: 'Frota · Manutenção', owner: 'p-ricardo', source: 'Cadastro', pass: [30, [2, 5]] },
  { plate: 'AYK7J05', type: 'Carro', brand: 'Jeep', model: 'Compass', color: 'Cinza', year: 2023, owner: 'p-carlos', source: 'Cadastro', pass: [30, [1, 2]] },
  { plate: 'MKP3H41', type: 'Carro', brand: 'Chevrolet', model: 'Onix', color: 'Vermelho', year: 2018, status: 'bloqueado', interest: true, interestReason: 'Alerta de furto (BO 2026/118.204).', source: 'LPR', pass: [3, [1, 2]], intel: 3 },
  { plate: 'RHK2D19', type: 'Caminhonete', brand: 'Fiat', model: 'Strada', color: 'Branca', year: 2022, source: 'Cadastro', pass: [20, [1, 2]], interest: true, interestReason: 'Veículo de teste do QA (Lista de veículos).' },
  { plate: 'BEE4R22', type: 'Carro', brand: 'Volkswagen', model: 'Gol', color: 'Prata', year: 2014, status: 'bloqueado', interest: true, interestReason: 'Dano ao patrimônio (OC-1184).', source: 'Cadastro', pass: 240, intel: 2 },
  { plate: 'QWE7J81', type: 'Moto', brand: 'Honda', model: 'CG 160', color: 'Preta', year: 2021, status: 'bloqueado', interest: true, interestReason: 'Tentativa de acesso sem credencial (OC-1203).', source: 'Cadastro', pass: 72, intel: 1 },
  { plate: 'SDF6G14', type: 'Carro', brand: 'Toyota', model: 'Corolla', color: 'Preto', year: 2024, owner: 'p-carla', source: 'Cadastro', pass: [30, [2, 4]] },
  { plate: 'TUV3K77', type: 'Carro', brand: 'Hyundai', model: 'HB20', color: 'Branco', year: 2022, owner: 'p-gustavo', source: 'Cadastro', pass: [30, [1, 2]] },
  { plate: 'LMN8P02', type: 'Carro', brand: 'Renault', model: 'Kwid', color: 'Laranja', year: 2020, owner: 'p-larissa', source: 'Cadastro', pass: [30, [1, 2]] },
  { plate: 'XYZ1R39', type: 'Caminhão', brand: 'Mercedes-Benz', model: 'Accelo 1016', color: 'Branco', year: 2017, fleet: 'Fornecedor · Limpa Mais', source: 'Cadastro', pass: [10, [1, 2]] },
  { plate: 'CDE5S81', type: 'Utilitário', brand: 'Fiat', model: 'Fiorino', color: 'Branca', year: 2021, owner: 'p-diego', fleet: 'Fornecedor · Redes Sul', source: 'Cadastro', pass: [10, [1, 2]] },
  { plate: 'FGH4T26', type: 'Carro', brand: 'Volkswagen', model: 'T-Cross', color: 'Azul', year: 2023, owner: 'p-rafael', source: 'Cadastro', pass: [30, [2, 3]] },
  { plate: 'JKL9U53', type: 'Carro', brand: 'Honda', model: 'Civic', color: 'Cinza', year: 2019, owner: 'p-andre', source: 'Cadastro', pass: [30, [1, 2]] },
  { plate: 'OPA2V88', type: 'Carro', brand: 'Nissan', model: 'Kicks', color: 'Branco', year: 2021, owner: 'p-helena', status: 'inativo', source: 'Cadastro', pass: 900 },
];

export function buildVehicles(): Vehicle[] {
  return V_SEEDS.map((s, i) => {
    const passes = s.pass == null ? [] : typeof s.pass === 'number' ? (s.pass === 0 ? [] : one(3000 + i, s.pass)) : buildPasses(3000 + i * 13, s.pass[0], s.pass[1]);
    const { pass, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      id: `v-${s.plate.toLowerCase()}`, type: null, brand: '', model: '', color: '', year: null, status: 'ativo', interest: false, owner: null, intel: 0,
      created: passes.length ? passes[passes.length - 1].at - 2 * MIN : NOW - (40 + i) * D, source: 'LPR',
      ...rest, passes,
    } as Vehicle;
  });
}
export const vRisk = (v: Vehicle): Risk => (v.status === 'bloqueado' ? 'alto' : v.interest || v.intel > 0 ? 'medio' : 'baixo');
export const vDesc = (v: Vehicle) => [v.brand && `${v.brand} ${v.model}`.trim(), v.year, v.color].filter(Boolean).join(' · ') || 'Não especificado';
export const alarms24 = (v: Vehicle) => (v.interest || v.status === 'bloqueado' ? v.passes.filter((p) => NOW - p.at < D).length : 0);

/* ───────────── utilidades ───────────── */
export const fmtDay = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const fmtDT = (t: number) => `${fmtDay(t)} · ${fmtTime(t)}`;
export const ageText = (t: number) => {
  const s = (NOW - t) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} dias`;
};
export const WINDOW_D = { '7d': 7, '30d': 30, '90d': 90 } as const;
export type Win = keyof typeof WINDOW_D;
export const inWin = (t: number, w: Win) => NOW - t <= WINDOW_D[w] * D;
export { D, H };
