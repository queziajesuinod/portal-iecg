/**
 * Mapeamento centralizado de títulos personalizados para rotas
 *
 * Use este arquivo para definir títulos customizados que serão
 * exibidos no pageTitle e no breadcrumb.
 */

const pageTitles = {
  // Raiz do app
  app: 'Portal IECG',

  // MIA
  'app/mia': 'Listagem Ministério MIA',
  'app/mia/cadastrar': 'Cadastro do MIA',
  'app/mia/detalhes': 'Detalhes do MIA',
  'app/mia/listas-presenca/': 'Listas de Presença',
  'app/mia/listas-presenca/<id>': 'Detalhes da Listas de Presença',

  // Start
  'app/start': 'Start',
  'app/start/celulas': 'Listagem de Células',
  'app/start/celulas/cadastrar': 'Cadastrar Célula',
  'app/start/celulas/detalhes': 'Detalhes da Célula',
  'app/start/campus': 'Campus',
  'app/start/direcionamentos': 'Apelos Direcionados',
  'app/start/fila-apelos': 'Fila de Apelos',
  'app/start/membros': 'Membros',
  'app/start/membros/detalhes': 'Detalhes do Membro',

  // Administração
  'app/admin': 'Administração',
  'app/admin/perfis': 'Perfis e Permissões',
  'app/admin/usuarios': 'Usuários',
  'app/admin/usuarios/novo': 'Novo Usuário',
  'app/admin/webhooks': 'Webhooks',
  'app/events': 'Eventos',
  'app/events/novo': 'Novo Evento',
  'app/events/formulario': 'Configurar Formulário do Evento',
  'app/events/<id>/lotes': 'Configurar Lotes do Evento',
  'app/events/registrations': 'Detalhes da Inscrição',
  'app/financeiro': 'Financeiro',
  'app/cupons': 'Cupons de Desconto',
  // Perfil
  'app/profile': 'Meu Perfil',

  // Fallback por segmento
  start: 'Start',
  events: 'Eventos',
  admin: 'Administração',
  mia: 'Ministério MIA',
  celulas: 'Células',
  cadastrar: 'Cadastro',
  detalhes: 'Detalhes',
  campus: 'Campus',
  direcionamentos: 'Apelos Direcionados',
  'fila-apelos': 'Fila de Apelos',
  membros: 'Membros',
  perfis: 'Perfis e Permissões',
  usuarios: 'Usuários',
  webhooks: 'Webhooks',
  novo: 'Novo Usuário',
  profile: 'Meu Perfil',
  'listas-presenca': 'Listas de Presença',
};

/**
 * Obtém o título personalizado de uma rota ou segmento
 * @param {string} routeName - Caminho ou segmento (ex: 'app/start/celulas')
 * @returns {string} - Título personalizado ou nome formatado
 */
export const getPageTitle = (routeName) => {
  if (!routeName) return '';

  const normalizedRoute = routeName.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalizedRoute) return pageTitles.app;

  const lastSegment = normalizedRoute.split('/').pop();

  const buildCandidates = (value) => {
    const segments = value.split('/');
    const candidates = [];
    const seen = new Set();
    for (let len = segments.length; len > 0; len -= 1) {
      const prefix = segments.slice(0, len);
      const prefixPath = prefix.join('/');
      if (!seen.has(prefixPath)) {
        candidates.push(prefixPath);
        seen.add(prefixPath);
      }

      for (let i = 0; i < len; i += 1) {
        const dynamic = [...prefix];
        dynamic[i] = '<id>';
        const dynamicPath = dynamic.join('/');
        if (!seen.has(dynamicPath)) {
          candidates.push(dynamicPath);
          seen.add(dynamicPath);
        }
      }
    }

    return candidates;
  };

  const resolveRouteTitle = (value) => {
    const candidates = buildCandidates(value);
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (pageTitles[candidate]) return pageTitles[candidate];
    }
    return null;
  };

  return (
    resolveRouteTitle(normalizedRoute)
    || pageTitles[lastSegment]
    || lastSegment.replace(/-/g, ' ')
  );
};

export default pageTitles;
