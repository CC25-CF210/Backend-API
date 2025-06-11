const userController = require('./controllers/userController');
const foodController = require('./controllers/foodController');
const mealController = require('./controllers/mealController');
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/auth');

const routes = [
    // === AUTH ROUTES ===
    // Register new user with profile
    {
        method: 'POST',
        path: '/api/auth/register',
        handler: authController.register
    },
    // Login existing user
    {
        method: 'POST',
        path: '/api/auth/login',
        handler: authController.login
    },
    // Verify ID token
    {
        method: 'POST',
        path: '/api/auth/verify-token',
        handler: authController.verifyToken
    },
    // Logout user (revoke tokens)
    {
        method: 'POST',
        path: '/api/auth/logout',
        handler: authController.logout,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === USER PROFILE ROUTES ===
    // Get user profile
    {
        method: 'GET',
        path: '/api/users/profile',
        handler: userController.getUserProfile,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    // Update user profile
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
        method: 'GET',
        path: '/api/search',
        handler: foodController.searchFoods
    },
    {
        method: 'POST',
        path: '/api/search/add',
        handler: foodController.addFoodFromSearch,
        options: {
            pre: [{ method: authMiddleware }]
        }
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
        method: 'GET',
        path: '/api/meals/suggestion',
        handler: mealController.getMealSuggestions,
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
    {
        method: 'GET',
        path: '/api/meal-plans/generate',
        handler: mealController.generateMealPlan,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'GET',
        path: '/api/meals/{recipeId}/details',
        handler: mealController.getMealDetailsByRecipeId,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === NEW MEAL PLAN ROUTES ===
    {
        method: 'POST',
        path: '/api/meal-plans/add-meal',
        handler: mealController.addMealFromPlan,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'POST',
        path: '/api/meal-plans/add-full-plan',
        handler: mealController.addFullMealPlan,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },
    {
        method: 'POST',
        path: '/api/meals/suggestion/add',
        handler: mealController.addMealFromSuggestion,
        options: {
            pre: [{ method: authMiddleware }]
        }
    },

    // === UPDATED MEAL ENTRIES ROUTE ===
    {
        method: 'GET',
        path: '/api/meals/updated',
        handler: mealController.getMealEntriesUpdated,
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
    },

    // === API DOCUMENTATION ===
    {
        method: 'GET',
        path: '/api',
        handler: (request, h) => {
            return h.response({
                status: 'success',
                message: 'Kalkulori API Documentation',
                endpoints: {
                    auth: {
                        'POST /api/auth/register': 'Registrasi pengguna baru',
                        'POST /api/auth/login': 'Login pengguna',
                        'POST /api/auth/verify-token': 'Verifikasi token',
                        'POST /api/auth/logout': 'Logout pengguna (requires auth)'
                    },
                    users: {
                        'GET /api/users/profile': 'Ambil profil pengguna (requires auth)',
                        'PUT /api/users/profile': 'Update profil pengguna (requires auth)'
                    },
                    foods: {
                        'GET /api/foods': 'Daftar makanan dengan limitation dan pagination',
                        'GET /api/foods/{id}': 'Detail makanan berdasarkan ID',
                        'POST /api/foods': 'Tambah makanan baru (admin only) (requires auth)',
                        'GET /api/search': 'Pencarian makanan',
                        'DELETE /api/foods/{id}': 'Tambah makanan ke daily log dari hasil pencarian (requires auth)'
                    },
                    meals: {
                        'GET /api/meals': 'Daftar makanan pengguna (requires auth)',
                        'POST /api/meals': 'Tambah makanan ke daily log dari add-page (requires auth)',
                        'DELETE /api/meals/{id}': 'Hapus meal entry (requires auth)',
                    },
                    recommendplan: {
                        'GET /api/meals/suggestion': 'Saran makanan berdasarkan tipe makanan user (requires auth)',
                        'POST /api/meals/suggestion/add': 'Tambah makanan ke daily log dari saran (requires auth)',
                        'GET /api/meal-plans/generate': 'Generate meal plan (requires auth)',
                        'GET /api/meal-plans/add-meal': 'Tambah makanan dari meal plan (requires auth)',
                        'POST /api/meal-plans/add-full-plan': 'Tambah full meal plan (requires auth)',
                        'GET /api/meals/{recipeId}/details': 'Detail makanan (requires auth)',
                    },
                    logs: {
                        'GET /api/logs': 'Log user (requires auth)',
                        'GET /api/logs/{date}': 'Log harian berdasarkan tanggal (requires auth)'
                    },
                    customFoods: {
                        'GET /api/users/foods': 'Daftar makanan kustom pengguna (SOON)',
                        'POST /api/users/foods': 'Tambah makanan kustom baru (SOON)'
                    },
                }
            }).code(200);
        }
    }
];

module.exports = routes;