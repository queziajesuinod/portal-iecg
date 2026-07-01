module.exports = [
  {
    key: 'biblia',
    name: 'Bíblia',
    link: '/app/biblia',
    icon: 'ion-ios-book-outline',
    permission: 'BIBLE',
  },
  {
    key: 'perguntasAoVivo',
    name: 'Perguntas ao Vivo',
    link: '/app/perguntas-ao-vivo',
    icon: 'ion-ios-chatbubbles-outline',
    permission: ['PERGUNTAS_AO_VIVO_GERENCIAR', 'PERGUNTAS_AO_VIVO_MODERAR']
  },
  {
    key: 'reports',
    name: 'Relatórios',
    icon: 'ion-ios-stats-outline',
    child: [
      {
        key: 'reportsHome',
        name: 'Visão Geral',
        link: '/app/relatorios',
        icon: 'ion-ios-grid-outline',
        permission: 'RELATORIOS'
      },
      {
        key: 'reportsMembros',
        name: 'Membros',
        link: '/app/relatorios/membros',
        icon: 'ion-ios-people-outline',
        permission: 'RELATORIOS'
      },
      {
        key: 'reportsEventosFinanceiro',
        name: 'Eventos e Finanças',
        link: '/app/relatorios/eventos-financeiro',
        icon: 'ion-ios-cash-outline',
        permission: 'RELATORIOS'
      },
      {
        key: 'reportsCultos',
        name: 'Saúde dos Cultos',
        link: '/app/relatorios/cultos',
        icon: 'ion-ios-analytics-outline',
        permission: 'RELATORIOS'
      }
    ]
  },
  {
    key: 'mia',
    name: 'Ministério Mia',
    icon: 'ion-ios-contacts-outline',
    child: [
      {
        key: 'listagemMia',
        name: 'Listagem de MIA',
        link: '/app/mia',
        icon: 'ion-ios-list-box-outline',
        permission: 'MIA_LISTAR'
      },
      {
        key: 'listasPresencaMia',
        name: 'Listas de Presença',
        link: '/app/mia/listas-presenca',
        icon: 'ion-ios-checkbox-outline',
        permission: 'MIA_LISTAR'
      }
    ]
  },
  {
    key: 'start',
    name: 'Start',
    icon: 'ion-ios-play-outline',
    child: [
      {
        key: 'listagemCelulas',
        name: 'Células',
        link: '/app/start/celulas',
        icon: 'ion-ios-list-box-outline',
        permission: 'CELULA_LISTAR'
      },
      {
        key: 'listagemMembros',
        name: 'Membros',
        link: '/app/start/membros',
        icon: 'ion-ios-people',
        permission: 'CELULA_LISTAR'
      },
      {
        key: 'minhaCelula',
        name: 'Minha Célula',
        link: '/app/minha-celula',
        icon: 'ion-ios-home-outline',
        permission: 'LIDER_CELULA_PRESENCA'
      },
      {
        key: 'minhaJornada',
        name: 'Minha Jornada',
        link: '/app/minha-jornada',
        icon: 'ion-ios-pulse'
      },
      {
        key: 'apelosDirecionados',
        name: 'Apelos Direcionados',
        link: '/app/start/direcionamentos',
        icon: 'ion-ios-git-compare',
        permission: 'APELOS_LISTAR'
      },
      {
        key: 'listagemCampus',
        name: 'Campus',
        link: '/app/start/campus',
        icon: 'ion-ios-world-outline',
        permission: 'CELULA_LISTAR'
      },
    ]
  },
  {
    key: 'videos',
    name: 'Vídeos',
    icon: 'ion-logo-youtube',
    linkParent: '/app/videos',
    permission: ['VIDEOS_VIEW', 'VIDEOS_ADMIN'],
  },
  {
    key: 'eventos',
    name: 'Eventos',
    icon: 'ion-ios-calendar-outline',
    child: [
      {
        key: 'listagemEventos',
        name: 'Gerenciar Eventos',
        link: '/app/events',
        icon: 'ion-ios-list-box-outline',
        permission: 'EVENTS_ACESS'
      },
      {
        key: 'cuponsEventos',
        name: 'Cupons de Desconto',
        link: '/app/cupons',
        icon: 'ion-ios-pricetag-outline',
        permission: 'EVENTS_ACESS'
      },
      {
        key: 'financeiroEventos',
        name: 'Financeiro',
        link: '/app/financeiro',
        icon: 'ion-cash',
        permission: 'EVENTS_ACESS'
      }
    ]
  },
  {
    key: 'cultos',
    name: 'Saúde dos Cultos',
    icon: 'ion-ios-microphone-outline',
    child: [
      {
        key: 'cultosDashboard',
        name: 'Dashboard',
        link: '/app/cultos/dashboard',
        icon: 'ion-ios-analytics-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosRelatorioFluxo',
        name: 'Relatorio de Fluxo',
        link: '/app/cultos/relatorio-fluxo',
        icon: 'ion-ios-paper-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosRegistros',
        name: 'Registros de Culto',
        link: '/app/cultos/registros',
        icon: 'ion-ios-list-box-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosMinisterios',
        name: 'Ministérios',
        link: '/app/cultos/admin/ministerios',
        icon: 'ion-ios-people-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosTiposEvento',
        name: 'Tipos de Evento',
        link: '/app/cultos/admin/tipos-evento',
        icon: 'ion-ios-pricetag-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosCampusMinisterios',
        name: 'Campus × Ministérios',
        link: '/app/cultos/admin/campus-ministerios',
        icon: 'ion-ios-git-network-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosMinistros',
        name: 'Ministros',
        link: '/app/cultos/admin/ministros',
        icon: 'ion-ios-mic-outline',
        permission: 'SAUDE_CULTOS'
      },
      {
        key: 'cultosValidacao',
        name: 'Validação de Cultos',
        link: '/app/cultos/validacao',
        icon: 'ion-ios-checkmark-circle-outline',
        permission: 'SAUDE_CULTOS'
      }
    ]
  },
  {
    key: 'diarioBordo',
    name: 'Diário de Bordo',
    icon: 'ion-ios-book-outline',
    child: [
      {
        key: 'meuDiarioBordo',
        name: 'Meu Diário',
        link: '/app/diario-bordo',
        icon: 'ion-ios-compose-outline',

      },
      {
        key: 'gestaoDiarioBordo',
        name: 'Gestão de Diários',
        link: '/app/admin/diario-bordo',
        icon: 'ion-ios-settings',
        permission: ['DIARIO_BORDO_ADMIN', 'DIARIO_BORDO_MANAGER']
      }
    ]
  },
  {
    key: 'cfm',
    name: 'CFM',
    icon: 'ion-ios-school-outline',
    permission: 'CFM_ADMIN',
    child: [
      {
        key: 'cfmTurmas',
        name: 'Turmas',
        link: '/app/cfm/turmas',
        icon: 'ion-ios-list-box-outline',
        permission: 'CFM_ADMIN',
      },
      {
        key: 'cfmConfig',
        name: 'Escolas & Matérias',
        link: '/app/cfm/configuracao',
        icon: 'ion-ios-settings-outline',
        permission: 'CFM_ADMIN',
      },
    ],
  },
  {
    key: 'voluntariado',
    name: 'Voluntariado',
    icon: 'ion-ios-heart-outline',
    child: [
      {
        key: 'voluntariadoLista',
        name: 'Voluntários',
        link: '/app/voluntariado',
        icon: 'ion-ios-people-outline',
        permission: 'VOLUNTARIADO'
      },
      {
        key: 'voluntariadoAreas',
        name: 'Áreas de Voluntariado',
        link: '/app/voluntariado/areas',
        icon: 'ion-ios-list-box-outline',
        permission: 'VOLUNTARIADO'
      }
    ]
  },
  {
    key: 'notificacoes',
    name: 'Notificações',
    icon: 'ion-ios-chatbubbles-outline',
    permission: 'NOTIFICACOES_VIEW',
    child: [
      {
        key: 'notificacoesGrupos',
        name: 'Grupos de Audiência',
        link: '/app/notificacoes/grupos',
        icon: 'ion-ios-people-outline',
        permission: 'NOTIFICACOES_VIEW'
      },
      {
        key: 'notificacoesTemplates',
        name: 'Templates',
        link: '/app/notificacoes/templates',
        icon: 'ion-ios-paper-outline',
        permission: 'NOTIFICACOES_VIEW'
      },
      {
        key: 'notificacoesCampanhas',
        name: 'Campanhas',
        link: '/app/notificacoes/campanhas',
        icon: 'ion-ios-send',
        permission: 'NOTIFICACOES_VIEW'
      },
      {
        key: 'notificacoesSequencias',
        name: 'Sequências',
        link: '/app/notificacoes/sequencias',
        icon: 'ion-ios-list-box-outline',
        permission: 'NOTIFICACOES_VIEW'
      }
    ]
  },
  {
    key: 'admin',
    name: 'Administração',
    icon: 'ion-ios-settings-outline',
    child: [
      {
        key: 'perfisPermissoes',
        name: 'Perfis e Permissões',
        link: '/app/admin/perfis',
        icon: 'ion-ios-locked-outline',
        permission: 'ADMIN_PERFIS'
      },
      {
        key: 'novoUsuario',
        name: 'Cadastrar Usuário',
        link: '/app/admin/usuarios/novo',
        icon: 'ion-ios-personadd-outline',
        permission: 'ADMIN_USUARIOS'
      },
      {
        key: 'listagemUsuarios',
        name: 'Usuários',
        link: '/app/admin/usuarios',
        icon: 'ion-ios-people',
        permission: 'ADMIN_USUARIOS'
      },
      {
        key: 'webhooks',
        name: 'Webhooks',
        link: '/app/admin/webhooks',
        icon: 'ion-ios-git-compare',
        permission: 'WEBHOOKS_VIEW'
      },
      {
        key: 'videosCanais',
        name: 'Vídeos do YouTube',
        link: '/app/admin/videos/canais',
        icon: 'ion-logo-youtube',
        permission: 'VIDEOS_ADMIN'
      },
      {
        key: 'videosTranscricoes',
        name: 'Transcrições',
        link: '/app/admin/videos/transcricoes',
        icon: 'ion-ios-paper-outline',
        permission: 'VIDEOS_ADMIN'
      }
    ]
  }
];
