const { User,Perfil } = require('../models'); // Importa a partir de models/index.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

async function getTodosUsers() {
    const users = await User.findAll({
        include: [{
            model: Perfil,
            required: true // INNER JOIN com Perfil
        }]
    });
    return users;
}

async function getUserById(id) {
    const user = await User.findByPk(id, {
        include: [{
            model: Perfil,
            required: true
        }]
    });
    return user;
}

async function createUser(body) {
    const { name, email, active, perfilId, password, image,username } = body;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashSHA256WithSalt(password, salt);
    const newUser = await User.create({
        id: uuid.v4(),
        name,
        email,
        active,
        perfilId,
        passwordHash,
        salt,
        image,
        username
    });
    return newUser;
}

function hashSHA256WithSalt(password, salt) {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

module.exports = {
    getTodosUsers,
    createUser,
    getUserById
};
