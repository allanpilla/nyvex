/*
 * Usuários e Permissões, fiel à tela do sistema (homolog · sol-unibrasil).
 * Catálogo, papéis e concessões copiados da matriz real (97 permissões). Nomes e e-mails de pessoas são inventados.
 * Rótulos sem tradução (sensitive_attributes, transit, stores…) aparecem crus, como no sistema.
 */

/** [chave, rótulo da ação, nível]: o nível diz até qual papel do sistema a permissão é concedida
 *  (1 = só Super Admin, 2 = + Administrador, 3 = + Operador, 4 = + Visualizador). Membro não tem nenhuma. */
type P = [string, string, number];
export type Resource = { label: string; permissions: P[] };
export type Module = { label: string; resources: Resource[] };

export const CATALOG: Module[] = [
  { label: "Identidade", resources: [
    { label: "Busca", permissions: [["identify:search:execute", "Executar", 4]] },
    { label: "Busca forense", permissions: [["identify:forensics:read", "Ver", 3], ["identify:forensics:export", "Exportar", 3], ["identify:forensics:sensitive_attributes", "sensitive_attributes", 2]] },
    { label: "Consentimentos (LGPD)", permissions: [["identify:consents:read", "Ver", 2], ["identify:consents:write", "Editar", 2]] },
    { label: "Controle de acesso", permissions: [["identify:access:read", "Ver", 4], ["identify:access:evaluate", "Avaliar", 2], ["identify:access:transit", "transit", 3]] },
    { label: "Credenciais", permissions: [["identify:credentials:read", "Ver", 2], ["identify:credentials:write", "Editar", 2], ["identify:credentials:manage", "Administrar", 2]] },
    { label: "Desaparecidos", permissions: [["identify:missing:read", "Ver", 4], ["identify:missing:write", "Editar", 3]] },
    { label: "Despacho", permissions: [["identify:dispatch:read", "Ver", 4], ["identify:dispatch:write", "Editar", 3]] },
    { label: "Escolar", permissions: [["identify:school:read", "Ver", 4], ["identify:school:write", "Editar", 3]] },
    { label: "Listas de monitoramento", permissions: [["identify:watchlists:read", "Ver", 4], ["identify:watchlists:write", "Editar", 2]] },
    { label: "Ocorrências", permissions: [["identify:incidents:read", "Ver", 4], ["identify:incidents:write", "Editar", 3], ["identify:incidents:manage", "Administrar", 2]] },
    { label: "Pessoas", permissions: [["identify:persons:read", "Ver", 4], ["identify:persons:write", "Editar", 3], ["identify:persons:manage", "Administrar", 2]] },
    { label: "Refinamento da IA", permissions: [["identify:ai_tuning:read", "Ver", 2], ["identify:ai_tuning:write", "Editar", 2]] },
    { label: "Segurança pública (Hélios/Córtex/Alerta Brasil)", permissions: [["identify:public_security:read", "Ver", 4], ["identify:public_security:query", "Consultar", 3]] },
    { label: "Veículos", permissions: [["identify:vehicles:read", "Ver", 4], ["identify:vehicles:write", "Editar", 3], ["identify:vehicles:manage", "Administrar", 2]] },
    { label: "authorization", permissions: [["identify:authorization:read", "Ver", 2], ["identify:authorization:write", "Editar", 2]] },
    { label: "contracting", permissions: [["identify:contracting:read", "Ver", 4], ["identify:contracting:write", "Editar", 2]] },
    { label: "qualifications", permissions: [["identify:qualifications:read", "Ver", 4], ["identify:qualifications:write", "Editar", 2], ["identify:qualifications:waive", "waive", 2]] },
    { label: "visits", permissions: [["identify:visits:read", "Ver", 4], ["identify:visits:write", "Editar", 3], ["identify:visits:approve", "approve", 2]] },
  ] },
  { label: "Defesa Civil", resources: [
    { label: "Abrigos", permissions: [["risk:shelters:read", "Ver", 2], ["risk:shelters:write", "Editar", 2], ["risk:shelters:manage", "Administrar", 2]] },
    { label: "Meteorologia", permissions: [["risk:weather:read", "Ver", 2], ["risk:weather:write", "Editar", 2]] },
    { label: "Moradias", permissions: [["risk:dwellings:read", "Ver", 2], ["risk:dwellings:write", "Editar", 2], ["risk:dwellings:manage", "Administrar", 2]] },
    { label: "Moradores", permissions: [["risk:residents:read", "Ver", 2], ["risk:residents:write", "Editar", 2]] },
    { label: "Áreas de risco", permissions: [["risk:areas:read", "Ver", 2], ["risk:areas:write", "Editar", 2], ["risk:areas:manage", "Administrar", 2]] },
  ] },
  { label: "Comunicação", resources: [
    { label: "Avisos", permissions: [["comms:broadcasts:read", "Ver", 2], ["comms:broadcasts:write", "Editar", 2], ["comms:broadcasts:manage", "Administrar", 2]] },
    { label: "Canais de contato", permissions: [["comms:contacts:read", "Ver", 2], ["comms:contacts:write", "Editar", 2]] },
    { label: "E-mails transacionais", permissions: [["comms:emails:read", "Ver", 2], ["comms:emails:admin", "Administrar", 2]] },
  ] },
  { label: "Almoxarifado", resources: [
    { label: "Movimento de estoque", permissions: [["inventory:movements:write", "Editar", 3], ["inventory:movements:write_off", "Dar baixa", 2]] },
    { label: "Operadores do setor", permissions: [["inventory:operators:assign", "Atribuir", 2]] },
    { label: "stores", permissions: [["inventory:stores:read", "Ver", 4], ["inventory:stores:write", "Editar", 2]] },
  ] },
  { label: "Cautela", resources: [
    { label: "Devoluções e consumo", permissions: [["custody:closures:return", "Receber de volta", 3], ["custody:closures:consume", "Declarar consumo", 2]] },
    { label: "records", permissions: [["custody:records:read", "Ver", 4], ["custody:records:issue", "Entregar", 3]] },
  ] },
  { label: "Pessoal", resources: [
    { label: "Escalas", permissions: [["hr:schedules:read", "Ver", 4], ["hr:schedules:write", "Editar", 3], ["hr:schedules:publish", "Publicar", 2]] },
    { label: "Férias e afastamentos", permissions: [["hr:leaves:read", "Ver", 3], ["hr:leaves:write", "Editar", 2]] },
    { label: "Unidades de lotação", permissions: [["hr:units:read", "Ver", 4], ["hr:units:write", "Editar", 2]] },
    { label: "Vínculos funcionais", permissions: [["hr:employments:read", "Ver", 3], ["hr:employments:write", "Editar", 2]] },
  ] },
  { label: "Infraestrutura", resources: [
    { label: "Dispositivos", permissions: [["equipments:equipment:read", "Ver", 4], ["equipments:equipment:write", "Editar", 2], ["equipments:equipment:manage", "Administrar", 2]] },
    { label: "Locais", permissions: [["equipments:location:read", "Ver", 4], ["equipments:location:write", "Editar", 2], ["equipments:location:manage", "Administrar", 2]] },
    { label: "Telemetria", permissions: [["equipments:heartbeat:write", "Editar", 2]] },
  ] },
  { label: "Aquisição de vídeo", resources: [
    { label: "Streams de vídeo", permissions: [["acquisition:streams:read", "Ver", 3]] },
  ] },
  { label: "Análise inteligente de vídeo", resources: [
    { label: "Runtime de análise", permissions: [["analytics:runtime:configure", "configure", 2]] },
  ] },
  { label: "Administração", resources: [
    { label: "Clientes", permissions: [["iam:tenants:read", "Ver", 1], ["iam:tenants:create", "Criar", 1], ["iam:tenants:update", "Atualizar", 1]] },
    { label: "Usuários", permissions: [["iam:users:read", "Ver", 2], ["iam:users:create", "Criar", 2], ["iam:users:update", "Atualizar", 2], ["iam:users:delete", "Excluir", 2]] },
  ] },
];
const ALL: P[] = CATALOG.flatMap((m) => m.resources.flatMap((r) => r.permissions));
export const TOTAL = ALL.length; // 97
const upTo = (lv: number) => ALL.filter((p) => p[2] >= lv).map((p) => p[0]);

export type Role = { key: string; label: string; plane: 'platform' | 'tenant'; is_system: boolean; granted: string[] };
export const ROLES: Role[] = [
  { key: 'super_admin', label: 'Super Admin', plane: 'platform', is_system: true, granted: upTo(1) },
  { key: 'admin', label: 'Administrador', plane: 'tenant', is_system: true, granted: upTo(2) },
  { key: 'operator', label: 'Operador', plane: 'tenant', is_system: true, granted: upTo(3) },
  { key: 'viewer', label: 'Visualizador', plane: 'tenant', is_system: true, granted: upTo(4) },
  { key: 'member', label: 'Membro', plane: 'tenant', is_system: true, granted: [] },
  { key: 'ux_ui', label: 'UX/UI', plane: 'tenant', is_system: false, granted: [] },
];

export type User = { id: string; full_name: string; email: string; roles: string[]; is_active: boolean };
const u = (i: number, full_name: string, email: string, roles: string[]): User => ({ id: `u${i}`, full_name, email, roles, is_active: true });
/** 11 usuários com a mesma distribuição de papéis do homolog. */
export const USERS: User[] = [
  u(1, 'Leandro Mota', 'leandro.mota@nyvex.com.br', ['super_admin', 'admin']),
  u(2, 'Elaine Souto', 'elaine@nyvex.com.br', ['super_admin']),
  u(3, 'Tiago', 'tiago@nyvex.com.br', ['super_admin']),
  u(4, 'Leo Nyvex', 'leo@nyvex.com.br', ['super_admin']),
  u(5, 'Visualizador Homolog', 'visualizador@nyvex.com.br', ['viewer']),
  u(6, 'Membro Homolog', 'membro@nyvex.com.br', ['member']),
  u(7, 'Eduardo', 'eduardo@unibrasil.edu.br', ['admin']),
  u(8, 'Admin Teste', 'adminteste@nyvex.com.br', ['admin']),
  u(9, 'Operador UX', 'operador@nyvex.com.br', ['operator']),
  u(10, 'Marina Duarte', 'marina.duarte@unibrasil.edu.br', ['admin']),
  u(11, 'Júlio', 'julio@nyvex.com.br', ['super_admin']),
];

export const initials = (n: string) => n.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
export const tempPassword = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 14 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};
