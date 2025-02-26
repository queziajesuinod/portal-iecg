const AuthService = require("../services/auth")

const authService = new AuthService()
class AuthController{

    static async login (req, res){
        const { email, password } = req.body

        try {
            const user = await authService.login({email, password})

            res.status(200).send(user)
        }catch (error) {
            res.status(401).send({ message: error.message})
        }
    }

}

module.exports = AuthController