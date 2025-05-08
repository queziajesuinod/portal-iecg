const axiosEfi = require('axios');
const qs = require('querystring');

class EfiService {
  static async getAccessToken() {
    const auth = Buffer.from(`${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`).toString('base64');
    const res = await axiosEfi.post('https://api.efi.com.br/auth/token',
      qs.stringify({ grant_type: 'client_credentials' }),
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data.access_token;
  }

  static async processPayment({ amount, payerName, payerEmail, payerPhone, returnUrl }) {
    try {
      const token = await EfiService.getAccessToken();
      const response = await axiosEfi.post('https://api.efi.com.br/v1/charge/one-step', {
        items: [{ name: 'Formulário Dinâmico', value: Math.round(amount * 100), amount: 1 }],
        customer: { name: payerName, email: payerEmail, phone_number: payerPhone },
        payment: {
          banking_billet: {
            expire_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            customer: { name: payerName }
          }
        }
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        transactionId: response.data.charge_id,
        checkoutUrl: response.data.banking_billet.link,
        status: 'pending'
      };
    } catch (err) {
      console.error('Erro ao processar pagamento Efi:', err.response?.data || err.message);
      return { success: false, status: 'failed', error: err.message };
    }
  }
}

module.exports = EfiService;