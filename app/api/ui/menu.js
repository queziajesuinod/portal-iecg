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
        icon: 'ion-ios-list-box-outline'
      },
      {
        key: 'cadastroMia',
        name: 'Cadastro do MIA',
        link: '/app/mia/cadastrar',
        icon: 'ion-ios-contacts-outline'
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
        icon: 'ion-ios-list-box-outline'
      },
      {
        key: 'cadastroCelulas',
        name: 'Cadastro de Células',
        link: '/app/start/celulas/cadastrar',
        icon: 'ion-ios-contacts-outline'
      }
    ]
  }
];
