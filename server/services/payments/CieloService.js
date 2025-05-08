const axios = require('axios');
  
  class CieloService {
    static async processPayment({ amount, payerName, payerEmail, returnUrl }) {
      try {
        const response = await axios.post('https://cieloecommerce.cielo.com.br/api/public/v1/checkout', {
          merchant_id: process.env.CIELO_MERCHANT_ID,
          amount: Math.round(amount * 100),
          name: payerName,
          email: payerEmail,
          return_url: returnUrl
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CIELO_TOKEN}`
          }
        });
  
        return {
          success: true,
          transactionId: response.data.id,
          checkoutUrl: response.data._links.checkout.href,
          status: 'pending'
        };
      } catch (err) {
        console.error('Erro ao processar pagamento Cielo:', err.response?.data || err.message);
        return { success: false, status: 'failed', error: err.message };
      }
    }
  }
  
  module.exports = CieloService;
