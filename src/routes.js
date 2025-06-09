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
                        'POST /api/auth/register': 'Register new user with profile',
                        'POST /api/auth/login': 'Login existing user',
                        'POST /api/auth/verify-token': 'Verify ID token',
                        'POST /api/auth/logout': 'Logout user and revoke tokens (requires auth)'
                    },
                    users: {
                        'GET /api/users/profile': 'Get user profile (requires auth)',
                        'PUT /api/users/profile': 'Update user profile (requires auth)'
                    },
                    foods: {
                        'GET /api/foods': 'Get all foods',
                        'GET /api/foods/{id}': 'Get food by ID',
                        'POST /api/foods': 'Create food (requires auth)',
                        'PUT /api/foods/{id}': 'Update food (requires auth)',
                        'DELETE /api/foods/{id}': 'Delete food (requires auth)'
                    },
                    customFoods: {
                        'GET /api/users/foods': 'Get user custom foods (requires auth)',
                        'POST /api/users/foods': 'Create user custom food (requires auth)'
                    },
                    meals: {
                        'GET /api/meals': 'Get meal entries (requires auth)',
                        'POST /api/meals': 'Create meal entry (requires auth)',
                        'PUT /api/meals/{id}': 'Update meal entry (requires auth)',
                        'DELETE /api/meals/{id}': 'Delete meal entry (requires auth)',
                        'GET /api/meals/generate-plan': 'Generate meal plan using ML (requires auth)'
                    },
                    logs: {
                        'GET /api/logs/{date}': 'Get daily log (requires auth)'
                    }
                }
            }).code(200);
        }
    }
];

module.exports = routes;