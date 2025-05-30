const Hapi = require('@hapi/hapi');
require('dotenv').config();

const userController = require('../src/controllers/userController');
const foodController = require('../src/controllers/foodController');
const mealController = require('../src/controllers/mealController');
const authController = require('../src/controllers/authController');
const authMiddleware = require('../src/middleware/auth');

const routes = [
    // === AUTH ROUTES ===
    {
        method: 'POST',
        path: '/api/auth/register',
        handler: authController.register
    },
    {
        method: 'POST',
        path: '/api/auth/login',
        handler: authController.login
    },
    {
        method: 'POST',
        path: '/api/auth/verify-token',
        handler: authController.verifyToken
    },
    {
        method: 'POST',
        path: '/api/auth/logout',
        handler: authController.logout,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === USER PROFILE ROUTES ===
    {
        method: 'GET',
        path: '/api/users/profile',
        handler: userController.getUserProfile,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'PUT',
        path: '/api/users/profile',
        handler: userController.updateUserProfile,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === FOOD ROUTES ===
    {
        method: 'POST',
        path: '/api/foods',
        handler: foodController.createFood,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'GET',
        path: '/api/foods',
        handler: foodController.getAllFoods
    },
    {
        method: 'GET',
        path: '/api/foods/{foodId}',
        handler: foodController.getFoodById
    },
    {
        method: 'PUT',
        path: '/api/foods/{foodId}',
        handler: foodController.updateFood,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'DELETE',
        path: '/api/foods/{foodId}',
        handler: foodController.deleteFood,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === USER CUSTOM FOOD ROUTES ===
    {
        method: 'POST',
        path: '/api/users/foods',
        handler: foodController.createUserCustomFood,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'GET',
        path: '/api/users/foods',
        handler: foodController.getUserCustomFoods,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === MEAL ROUTES ===
    {
        method: 'POST',
        path: '/api/meals',
        handler: mealController.createMealEntry,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'GET',
        path: '/api/meals',
        handler: mealController.getMealEntries,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'PUT',
        path: '/api/meals/{mealEntryId}',
        handler: mealController.updateMealEntry,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'DELETE',
        path: '/api/meals/{mealEntryId}',
        handler: mealController.deleteMealEntry,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === DAILY LOG ROUTES ===
    {
        method: 'GET',
        path: '/api/logs/{log_date}',
        handler: mealController.getDailyLog,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === HEALTH CHECK ===
    {
        method: 'GET',
        path: '/api/health',
        handler: (request, h) => {
            return h.response({
                status: 'success',
                message: 'Kalkulori API is running',
                timestamp: new Date().toISOString()
            }).code(200);
        }
    }
];

let server;

const createServer = async () => {
    if (server) {
        return server;
    }

    server = Hapi.server({
        port: 3000,
        host: '0.0.0.0',
        routes: {
            cors: {
                origin: ['*'],
                headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
                credentials: true
            }
        }
    });

    server.route(routes);

    server.ext('onPreResponse', (request, h) => {
        const response = request.response;
        
        if (response.isBoom) {
            const statusCode = response.output.statusCode;
            
            if (statusCode === 401) {
                return h.response({
                    status: 'fail',
                    message: 'Token tidak valid atau sudah expired'
                }).code(401);
            }
            
            if (statusCode === 403) {
                return h.response({
                    status: 'fail',
                    message: 'Akses ditolak'
                }).code(403);
            }

            if (statusCode === 404) {
                return h.response({
                    status: 'fail',
                    message: 'Resource tidak ditemukan'
                }).code(404);
            }
            
            console.error('Server Error:', response);
            return h.response({
                status: 'error',
                message: 'Terjadi kesalahan pada server'
            }).code(500);
        }
        
        return h.continue;
    });

    await server.initialize();
    return server;
};

module.exports = async (req, res) => {
    try {
        const server = await createServer();
        
        const hapiRequest = {
            method: req.method.toLowerCase(),
            url: req.url,
            headers: req.headers,
            payload: req.body || undefined
        };

        const response = await server.inject(hapiRequest);
        
        if (response.headers) {
            Object.keys(response.headers).forEach(key => {
                res.setHeader(key, response.headers[key]);
            });
        }
        
        res.status(response.statusCode);
        
        if (response.result) {
            res.json(response.result);
        } else {
            res.end();
        }
        
    } catch (error) {
        console.error('Vercel Handler Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};