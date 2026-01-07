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
  'app/mia/listas-presenca': 'Listas de Presença',

  // Start
  'app/start': 'Start',
  'app/start/celulas': 'Listagem de Células',
  'app/start/celulas/cadastrar': 'Cadastrar Célula',
  'app/start/celulas/detalhes': 'Detalhes da Célula',
  'app/start/campus': 'Campus',
  'app/start/direcionamentos': 'Apelos Direcionados',
  'app/start/fila-apelos': 'Fila de Apelos',
  'app/start/chatwoot': 'Chat de Atendimento',

  // Administração
  'app/admin': 'Administração',
  'app/admin/perfis': 'Perfis e Permissões',
  'app/admin/usuarios': 'Usuários',
  'app/admin/usuarios/novo': 'Novo Usuário',
  'app/admin/webhooks': 'Webhooks',

  // Perfil
  'app/profile': 'Meu Perfil',

  // Fallback por segmento
  start: 'Start',
  admin: 'Administração',
  mia: 'Ministério MIA',
  celulas: 'Células',
  cadastrar: 'Cadastro',
  detalhes: 'Detalhes',
  campus: 'Campus',
  direcionamentos: 'Apelos Direcionados',
  'fila-apelos': 'Fila de Apelos',
  perfis: 'Perfis e Permissões',
  usuarios: 'Usuários',
  webhooks: 'Webhooks',
  novo: 'Novo Usuário',
  profile: 'Meu Perfil',
  'listas-presenca': 'Listas de Presença',
  chatwoot: 'Chat de Atendimento',
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

  return (
    pageTitles[normalizedRoute]
    || pageTitles[lastSegment]
    || lastSegment.replace(/-/g, ' ')
  );
};

export default pageTitles;
