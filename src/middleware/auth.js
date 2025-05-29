const { auth } = require('../config/firebase');

const authMiddleware = async (request, h) => {
    try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return h.response({
                status: 'fail',
                message: 'Token tidak ditemukan'
            }).code(401).takeover();
        }

        const decodedToken = await auth.verifyIdToken(token);
        request.user = decodedToken;
        
        return h.continue;
    } catch (error) {
        return h.response({
            status: 'fail',
            message: 'Token tidak valid'
        }).code(401).takeover();
    }
};

module.exports = authMiddleware;