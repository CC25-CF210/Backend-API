const { auth } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const sessionManager = require('../utils/sessionManager');
require('dotenv').config();

const authMiddleware = async (request, h) => {
    try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return h.response({
                status: 'fail',
                message: 'Token tidak ditemukan'
            }).code(401).takeover();
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET tidak ditemukan di environment variables');
            return h.response({
                status: 'error',
                message: 'Konfigurasi server tidak lengkap'
            }).code(500).takeover();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!sessionManager.has(token)) {
            return h.response({
                status: 'fail',
                message: 'Session tidak valid'
            }).code(401).takeover();
        }

        request.user = decoded;
        return h.continue;
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return h.response({
                status: 'fail',
                message: 'Token sudah expired'
            }).code(401).takeover();
        } else if (error.name === 'JsonWebTokenError') {
            return h.response({
                status: 'fail',
                message: 'Format token tidak valid'
            }).code(401).takeover();
        }
        
        return h.response({
            status: 'fail',
            message: 'Token tidak valid'
        }).code(401).takeover();
    }
};

module.exports = authMiddleware;