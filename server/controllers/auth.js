const AuthService = require('../services/auth');

const authService = new AuthService();
class AuthController {
  static async login(req, res) {
    const { email, password } = req.body;

    try {
      const user = await authService.login({ email, password });

      res.status(200).send(user);
    } catch (error) {
      res.status(401).send({ message: error.message });
    }
  }

  static async forgotPassword(req, res) {
    const { email } = req.body;
    try {
      const result = await authService.forgotPassword(email);
      res.status(200).send(result);
    } catch (error) {
      console.error('Erro no forgot-password:', error.message);
      // Resposta genérica mesmo em erro interno (não revela detalhes/enumeração)
      res.status(200).send({ message: 'Se o e-mail estiver cadastrado, enviaremos uma nova senha em instantes.' });
    }
  }
}

module.exports = AuthController;
