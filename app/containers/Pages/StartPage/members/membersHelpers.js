export const ESCOLARIDADE_OPTIONS = [
  'ANALFABETO',
  'ENSINO FUNDAMENTAL INCOMPLETO',
  'ENSINO FUNDAMENTAL COMPLETO',
  'ENSINO MEDIO INCOMPLETO',
  'ENSINO MEDIO COMPLETO',
  'ENSINO SUPERIOR INCOMPLETO',
  'ENSINO SUPERIOR COMPLETO'
];

export const ESCOLAS_CONCLUIDAS_OPTIONS = [
  'Escola de Fundamentos',
  'Lideranca Avancada 1',
  'Lideranca Avancada 2',
  'Lideranca Avancada 3'
];

export const ESTADO_CIVIL_OPTIONS = ['Solteiro', 'Casado', 'Viuvo', 'Divorciado', 'Uniao Estavel'];
export const GENDER_OPTIONS = ['MASCULINO', 'FEMININO'];
export const STATUS_OPTIONS = ['VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'];
export const INACTIVE_STATUSES = ['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'];

export const CARGO_OPTIONS = [
  { value: 'lideranca_apostolica', label: 'Liderança Apostólica' },
  { value: 'pastor_geracao', label: 'Pastor de Geração' },
  { value: 'pastor_campus', label: 'Pastor de Campus' }
];

export const initialFormState = {
  id: '',
  name: '',
  preferredName: '',
  email: '',
  telefone: '',
  whatsapp: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  country: 'Brasil',
  cep: '',
  cpf: '',
  rg: '',
  data_nascimento: '',
  gender: '',
  estado_civil: '',
  status: 'MEMBRO',
  statusReason: '',
  membershipDate: '',
  baptismDate: '',
  baptismPlace: '',
  conversionDate: '',
  campusId: '',
  spouseMemberId: '',
  liderancaApostolicaMemberId: '',
  pastorGeracaoMemberId: '',
  pastorCampusMemberId: '',
  photoUrl: '',
  escolaridade: '',
  nome_esposo: '',
  profissao: '',
  frequenta_celula: false,
  batizado: false,
  encontro: false,
  escolas: [],
  cargos: []
};

const maritalStatusToEnum = {
  Solteiro: 'SOLTEIRO',
  Casado: 'CASADO',
  Viuvo: 'VIUVO',
  Divorciado: 'DIVORCIADO',
  'Uniao Estavel': 'UNIAO_ESTAVEL'
};

const maritalEnumToLabel = {
  SOLTEIRO: 'Solteiro',
  CASADO: 'Casado',
  VIUVO: 'Viuvo',
  DIVORCIADO: 'Divorciado',
  UNIAO_ESTAVEL: 'Uniao Estavel'
};

export const formatPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, d1, d2, d3) => {
      if (!d2) return d1 ? `(${d1}` : '';
      if (!d3) return `(${d1}) ${d2}`;
      return `(${d1}) ${d2}-${d3}`;
    });
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
};

export const formatCPF = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`));
};

export const parseLegacyNotes = (notes) => {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed.legacy && typeof parsed.legacy === 'object') {
      return parsed.legacy;
    }
    return {};
  } catch (error) {
    return {};
  }
};

export const normalizeEscolas = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export const toFormFromMember = (member) => {
  const legacy = parseLegacyNotes(member.notes);
  return {
    ...initialFormState,
    id: member.id || '',
    name: member.fullName || '',
    preferredName: member.preferredName || '',
    email: member.email || '',
    telefone: member.phone || '',
    whatsapp: member.whatsapp || '',
    endereco: member.street || '',
    numero: member.number || '',
    complemento: member.complement || '',
    bairro: member.neighborhood || '',
    cidade: member.city || '',
    estado: member.state || '',
    country: member.country || 'Brasil',
    cep: member.zipCode || '',
    cpf: formatCPF(member.cpf || ''),
    rg: member.rg || '',
    data_nascimento: member.birthDate || '',
    gender: member.gender || '',
    estado_civil: maritalEnumToLabel[member.maritalStatus] || '',
    status: member.status || 'MEMBRO',
    statusReason: member.statusReason || '',
    membershipDate: member.membershipDate || '',
    baptismDate: member.baptismDate || '',
    baptismPlace: member.baptismPlace || '',
    conversionDate: member.conversionDate || '',
    campusId: member.campusId || '',
    spouseMemberId: member.spouseMemberId || member.spouse?.id || '',
    liderancaApostolicaMemberId: member.liderancaApostolicaMemberId || member.liderancaApostolica?.id || '',
    pastorGeracaoMemberId: member.pastorGeracaoMemberId || member.pastorGeracao?.id || '',
    pastorCampusMemberId: member.pastorCampusMemberId || member.pastorCampus?.id || '',
    photoUrl: member.photoUrl || '',
    escolaridade: legacy.escolaridade || '',
    nome_esposo: legacy.nome_esposo || '',
    profissao: legacy.profissao || '',
    frequenta_celula: Boolean(legacy.frequenta_celula),
    batizado: Boolean(legacy.batizado),
    encontro: Boolean(legacy.encontro),
    escolas: normalizeEscolas(legacy.escolas),
    cargos: Array.isArray(member.cargos)
      ? member.cargos.map((c) => (typeof c === 'string' ? c : c?.cargo)).filter(Boolean)
      : []
  };
};

export const buildPayloadFromForm = (form) => ({
  fullName: form.name,
  preferredName: form.preferredName || null,
  cpf: form.cpf || null,
  rg: form.rg || null,
  birthDate: form.data_nascimento || null,
  gender: form.gender || null,
  maritalStatus: maritalStatusToEnum[form.estado_civil] || null,
  phone: form.telefone || null,
  whatsapp: form.whatsapp || null,
  email: form.email || null,
  zipCode: form.cep || null,
  street: form.endereco || null,
  number: form.numero || null,
  complement: form.complemento || null,
  neighborhood: form.bairro || null,
  city: form.cidade || null,
  state: form.estado || null,
  country: form.country || 'Brasil',
  membershipDate: form.membershipDate || null,
  baptismDate: form.baptismDate || null,
  baptismPlace: form.baptismPlace || null,
  conversionDate: form.conversionDate || null,
  status: form.status || 'MEMBRO',
  statusReason: form.statusReason || null,
  campusId: form.campusId || null,
  spouseMemberId: form.estado_civil === 'Casado' ? (form.spouseMemberId || null) : null,
  liderancaApostolicaMemberId: form.liderancaApostolicaMemberId || null,
  pastorGeracaoMemberId: form.pastorGeracaoMemberId || null,
  pastorCampusMemberId: form.pastorCampusMemberId || null,
  photoUrl: form.photoUrl || null,
  notes: JSON.stringify({
    legacy: {
      escolaridade: form.escolaridade || null,
      nome_esposo: form.estado_civil === 'Casado' ? (form.nome_esposo || null) : null,
      profissao: form.profissao || null,
      frequenta_celula: Boolean(form.frequenta_celula),
      batizado: Boolean(form.batizado),
      encontro: Boolean(form.encontro),
      escolas: form.escolas || []
    }
  })
});

export const isValidCpf = (cpf = '') => {
  if (!cpf) return true;
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
};

export const isValidEmail = (email = '') => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const COMPLETUDE_FIELDS = [
  (m) => m.email,
  (m) => m.phone || m.whatsapp,
  (m) => m.birthDate,
  (m) => m.cpf,
  (m) => m.maritalStatus,
  (m) => m.gender,
  (m) => m.street || m.neighborhood,
  (m) => m.zipCode,
  (m) => m.photoUrl,
  (m) => m.campusId
];

export const calcCompletude = (member) => {
  const filled = COMPLETUDE_FIELDS.filter((fn) => Boolean(fn(member))).length;
  return Math.round((filled / COMPLETUDE_FIELDS.length) * 100);
};

export const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') {
    return `${protocol}//${hostname}:3005`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
