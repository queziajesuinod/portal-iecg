const { compare } = require('bcrypt')
const { sign } = require('jsonwebtoken')
const { User } = require('../models'); // Importa a partir de models/index.js
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env'));
class AuthService {
    async login(dto) {

        const usuario = await User.findOne({
            attributes: ['name', 'image','username', 'passwordHash','salt'],
            where: {
                email: dto.email
            }
        })

        if (!usuario) {
            throw new Error('Usuario não cadastrado')
        }
        const passwordHash = hashSHA256WithSalt(dto.password, usuario.salt);
        

        const senhaIguais = compare(passwordHash, usuario.passwordHash)

        if (!senhaIguais) {
            throw new Error('Usuario ou senha invalido')
        }

        const accessToken = sign({ userId: usuario.id, email: usuario.email, username: usuario.username, avatar: usuario.image, nome: usuario.name }, env.JWT_SECRET, { expiresIn: '10h' });
        return { accessToken }
    }




}

function hashSHA256WithSalt(password, salt) {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}
module.exports = AuthService