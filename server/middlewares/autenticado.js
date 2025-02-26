const { verify , decode} = require('jsonwebtoken')
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env'))

module.exports = async (req, res, next) => {
    const token = req.headers['authorization'];
   
    if (!token) {
       return res.status(401).send('Access token nao informado')
    }
    const accessToken = token && token.split(' ')[1]; 
    console.log(accessToken)
    try {

        if(verify(accessToken, env.JWT_SECRET)){
        const { userId, email, id_agendor } = decode(accessToken)
        
        req.usuarioId = userId
        req.usuarioEmail = email
        req.idAgendor = id_agendor
        
        return next()
        }

    } catch (error) {
        res.status(401).send({message: error.message})
    }
}
