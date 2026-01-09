module.exports = [
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
      }
    ]
  }
];
