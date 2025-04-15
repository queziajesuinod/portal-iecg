// services/menuService.js

const axios = require('axios');

async function getMenuByPerfil(perfilId, token) {
  try {
    const response = await axios.get(`https://portal.iecg.com.br/perfil/${perfilId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const perfilData = response.data;

    // Usa a descrição como chave do menu
    const perfilKey = perfilData.descricao?.toLowerCase().replace(/\s/g, '') || '';

    const menus = {
      administrador: [
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
      ],
      lider: [
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
            }
          ]
        }
      ],
      mia: [
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
        }
      ]
    };

    const result = menus[perfilKey];
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Erro ao buscar perfil na API:', error.message);
    return [];
  }
}

module.exports = {
  getMenuByPerfil
};