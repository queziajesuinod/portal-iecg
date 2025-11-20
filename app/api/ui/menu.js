module.exports = [
  {
    key: 'mia',
    name: 'Ministério Mia',
    icon: 'ion-ios-contacts-outline',
    child: [
      {
        key: 'listagemMia',
        name: 'Listagem do MIA',
        link: '/app/mia',
        icon: 'ion-ios-list-box-outline',
        permission: 'MIA_LISTAR'
      },
      {
        key: 'cadastroMia',
        name: 'Cadastro do MIA',
        link: '/app/mia/cadastrar',
        icon: 'ion-ios-contacts-outline',
        permission: 'MIA_CADASTRAR'
      },
      {
        key: 'listasPresencaMia',
        name: 'Listas de presença',
        link: '/app/mia/listas-presenca',
        icon: 'ion-ios-checkbox-outline',
        permission: 'MIA_LISTAR'
      }
    ]
  },
  {
    key: 'start',
    name: 'Start',
    icon: 'ion-ios-contacts-outline',
    child: [
      {
        key: 'listagemCelulas',
        name: 'Listagem de Células',
        link: '/app/start/celulas',
        icon: 'ion-ios-list-box-outline',
        permission: 'CELULA_LISTAR'
      },
      {
        key: 'cadastroCelulas',
        name: 'Cadastro de Células',
        link: '/app/start/celulas/cadastrar',
        icon: 'ion-ios-contacts-outline',
        permission: 'CELULA_CADASTRAR'
      },
      {
        key: 'listagemCampus',
        name: 'Listagem de Campus',
        link: '/app/start/campus',
        icon: 'ion-ios-world-outline',
        permission: 'CELULA_LISTAR'
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
      }
    ]
  }
];
