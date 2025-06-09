const { db } = require('../config/firebase');
const { nanoid } = require('nanoid');
const axios = require('axios');

const createMealEntry = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { 
            food_item_id, 
            meal_type, 
            servings, 
            log_date 
        } = request.payload;

        if (!food_item_id || !meal_type || !servings || !log_date) {
            return h.response({
                status: 'fail',
                message: 'Semua field wajib diisi'
            }).code(400);
        }

        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
            return h.response({
                status: 'fail',
                message: 'Meal type harus salah satu dari: breakfast, lunch, dinner, snack'
            }).code(400);
        }

        let foodDoc = await db.collection('food_items').doc(food_item_id).get();
        let foodData = null;

        if (!foodDoc.exists) {
            const customFoodSnapshot = await db.collection('user_custom_foods')
                .where('id', '==', food_item_id)
                .where('user_id', '==', userId)
                .get();

            if (customFoodSnapshot.empty) {
                return h.response({
                    status: 'fail',
                    message: 'Makanan tidak ditemukan'
                }).code(404);
            }

            foodData = customFoodSnapshot.docs[0].data();
        } else {
            foodData = foodDoc.data();
        }

        const servingAmount = parseFloat(servings);
        const calories = Math.round(foodData.calories_per_serving * servingAmount);
        const protein = foodData.protein_per_serving * servingAmount;
        const carbs = foodData.carbs_per_serving * servingAmount;
        const fat = foodData.fat_per_serving * servingAmount;

        const logQuery = await db.collection('user_daily_logs')
            .where('user_id', '==', userId)
            .where('log_date', '==', log_date)
            .get();

        let dailyLogId;
        let currentLog = null;

        if (logQuery.empty) {
            dailyLogId = nanoid(16);
            const newLog = {
                id: dailyLogId,
                user_id: userId,
                log_date,
                total_calories_consumed: calories,
                total_protein_consumed: protein,
                total_carbs_consumed: carbs,
                total_fat_consumed: fat,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(dailyLogId).set(newLog);
            currentLog = newLog;
        } else {
            const logDoc = logQuery.docs[0];
            currentLog = logDoc.data();
            dailyLogId = currentLog.id;

            const updatedLog = {
                total_calories_consumed: (currentLog.total_calories_consumed || 0) + calories,
                total_protein_consumed: (currentLog.total_protein_consumed || 0) + protein,
                total_carbs_consumed: (currentLog.total_carbs_consumed || 0) + carbs,
                total_fat_consumed: (currentLog.total_fat_consumed || 0) + fat,
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(dailyLogId).update(updatedLog);
        }

        const mealEntryId = nanoid(16);
        const mealEntry = {
            id: mealEntryId,
            user_id: userId,
            daily_log_id: dailyLogId,
            food_item_id,
            meal_type,
            servings: servingAmount,
            calories,
            protein,
            carbs,
            fat,
            consumed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection('meal_entries').doc(mealEntryId).set(mealEntry);

        return h.response({
            status: 'success',
            message: 'Meal entry berhasil ditambahkan',
            data: {
                mealEntryId,
                dailyLogId
            }
        }).code(201);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getMealEntries = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { log_date, meal_type } = request.query;

        let query = db.collection('meal_entries').where('user_id', '==', userId);

        if (log_date) {
            const logQuery = await db.collection('user_daily_logs')
                .where('user_id', '==', userId)
                .where('log_date', '==', log_date)
                .get();

            if (!logQuery.empty) {
                const dailyLogId = logQuery.docs[0].data().id;
                query = query.where('daily_log_id', '==', dailyLogId);
            } else {
                return h.response({
                    status: 'success',
                    data: {
                        meal_entries: []
                    }
                }).code(200);
            }
        }

        if (meal_type) {
            query = query.where('meal_type', '==', meal_type);
        }

        const snapshot = await query.get();
        const mealEntries = [];

        for (const doc of snapshot.docs) {
            const mealData = doc.data();
            
            let foodDoc = await db.collection('food_items').doc(mealData.food_item_id).get();
            let foodData = null;

            if (!foodDoc.exists) {
                const customFoodSnapshot = await db.collection('user_custom_foods')
                    .where('id', '==', mealData.food_item_id)
                    .get();
                
                if (!customFoodSnapshot.empty) {
                    foodData = customFoodSnapshot.docs[0].data();
                }
            } else {
                foodData = foodDoc.data();
            }

            mealEntries.push({
                ...mealData,
                food_details: foodData
            });
        }

        mealEntries.sort((a, b) => new Date(b.consumed_at) - new Date(a.consumed_at));

        return h.response({
            status: 'success',
            data: {
                meal_entries: mealEntries
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getDailyLog = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { log_date } = request.params;

        const logQuery = await db.collection('user_daily_logs')
            .where('user_id', '==', userId)
            .where('log_date', '==', log_date)
            .get();

        if (logQuery.empty) {
            return h.response({
                status: 'fail',
                message: 'Log tidak ditemukan untuk tanggal tersebut'
            }).code(404);
        }

        const dailyLog = logQuery.docs[0].data();

        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', userId)
            .get();

        let remaining_calories = null;
        if (!profileQuery.empty) {
            const profile = profileQuery.docs[0].data();
            remaining_calories = profile.daily_calorie_target - (dailyLog.total_calories_consumed || 0);
        }

        const mealEntriesSnapshot = await db.collection('meal_entries')
            .where('daily_log_id', '==', dailyLog.id)
            .get();

        const mealEntries = [];
        for (const doc of mealEntriesSnapshot.docs) {
            const mealData = doc.data();
            
            let foodDoc = await db.collection('food_items').doc(mealData.food_item_id).get();
            let foodData = null;

            if (!foodDoc.exists) {
                const customFoodSnapshot = await db.collection('user_custom_foods')
                    .where('id', '==', mealData.food_item_id)
                    .get();
                
                if (!customFoodSnapshot.empty) {
                    foodData = customFoodSnapshot.docs[0].data();
                }
            } else {
                foodData = foodDoc.data();
            }

            mealEntries.push({
                ...mealData,
                food_details: foodData
            });
        }

        mealEntries.sort((a, b) => new Date(a.consumed_at) - new Date(b.consumed_at));

        return h.response({
            status: 'success',
            data: {
                daily_log: {
                    ...dailyLog,
                    remaining_calories
                },
                meal_entries: mealEntries
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const updateMealEntry = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { mealEntryId } = request.params;
        const { servings } = request.payload;

        if (!servings) {
            return h.response({
                status: 'fail',
                message: 'Servings wajib diisi'
            }).code(400);
        }

        const mealDoc = await db.collection('meal_entries').doc(mealEntryId).get();

        if (!mealDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'Meal entry tidak ditemukan'
            }).code(404);
        }

        const mealData = mealDoc.data();

        if (mealData.user_id !== userId) {
            return h.response({
                status: 'fail',
                message: 'Akses ditolak'
            }).code(403);
        }

        let foodDoc = await db.collection('food_items').doc(mealData.food_item_id).get();
        let foodData = null;

        if (!foodDoc.exists) {
            const customFoodSnapshot = await db.collection('user_custom_foods')
                .where('id', '==', mealData.food_item_id)
                .get();
                
            if (!customFoodSnapshot.empty) {
                foodData = customFoodSnapshot.docs[0].data();
            }
        } else {
            foodData = foodDoc.data();
        }

        if (!foodData) {
            return h.response({
                status: 'fail',
                message: 'Food item tidak ditemukan'
            }).code(404);
        }

        const newServings = parseFloat(servings);
        const oldCalories = mealData.calories;
        const oldProtein = mealData.protein;
        const oldCarbs = mealData.carbs;
        const oldFat = mealData.fat;

        const newCalories = Math.round(foodData.calories_per_serving * newServings);
        const newProtein = foodData.protein_per_serving * newServings;
        const newCarbs = foodData.carbs_per_serving * newServings;
        const newFat = foodData.fat_per_serving * newServings;

        const updatedMealEntry = {
            servings: newServings,
            calories: newCalories,
            protein: newProtein,
            carbs: newCarbs,
            fat: newFat,
            updated_at: new Date().toISOString()
        };

        await db.collection('meal_entries').doc(mealEntryId).update(updatedMealEntry);

        const dailyLogDoc = await db.collection('user_daily_logs').doc(mealData.daily_log_id).get();
        
        if (dailyLogDoc.exists) {
            const dailyLogData = dailyLogDoc.data();
            
            const updatedDailyLog = {
                total_calories_consumed: (dailyLogData.total_calories_consumed || 0) - oldCalories + newCalories,
                total_protein_consumed: (dailyLogData.total_protein_consumed || 0) - oldProtein + newProtein,
                total_carbs_consumed: (dailyLogData.total_carbs_consumed || 0) - oldCarbs + newCarbs,
                total_fat_consumed: (dailyLogData.total_fat_consumed || 0) - oldFat + newFat,
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(mealData.daily_log_id).update(updatedDailyLog);
        }

        return h.response({
            status: 'success',
            message: 'Meal entry berhasil diperbarui'
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const deleteMealEntry = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { mealEntryId } = request.params;

        const mealDoc = await db.collection('meal_entries').doc(mealEntryId).get();

        if (!mealDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'Meal entry tidak ditemukan'
            }).code(404);
        }

        const mealData = mealDoc.data();

        if (mealData.user_id !== userId) {
            return h.response({
                status: 'fail',
                message: 'Akses ditolak'
            }).code(403);
        }

        const dailyLogDoc = await db.collection('user_daily_logs').doc(mealData.daily_log_id).get();
        
        if (dailyLogDoc.exists) {
            const dailyLogData = dailyLogDoc.data();
            
            const updatedDailyLog = {
                total_calories_consumed: Math.max(0, (dailyLogData.total_calories_consumed || 0) - mealData.calories),
                total_protein_consumed: Math.max(0, (dailyLogData.total_protein_consumed || 0) - mealData.protein),
                total_carbs_consumed: Math.max(0, (dailyLogData.total_carbs_consumed || 0) - mealData.carbs),
                total_fat_consumed: Math.max(0, (dailyLogData.total_fat_consumed || 0) - mealData.fat),
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(mealData.daily_log_id).update(updatedDailyLog);
        }

        await db.collection('meal_entries').doc(mealEntryId).delete();

        return h.response({
            status: 'success',
            message: 'Meal entry berhasil dihapus'
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const generateMealPlan = async (request, h) => {
    try {
        const userId = request.user.uid;
        console.log('Starting meal plan generation for user:', userId);

        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', userId)
            .get();

        if (profileQuery.empty) {
            return h.response({
                status: 'fail',
                message: 'Profil pengguna tidak ditemukan'
            }).code(404);
        }

        const userProfile = profileQuery.docs[0].data();
        const totalCalories = userProfile.daily_calorie_target;

        if (!totalCalories || totalCalories <= 0) {
            return h.response({
                status: 'fail',
                message: 'Target kalori harian belum diset atau tidak valid'
            }).code(400);
        }

        let tolerancePercent;
        if (totalCalories <= 3800) {
            tolerancePercent = 0.1;
        } else {
            tolerancePercent = 0.15;
        }

        const getFirstImageUrl = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return null;
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            
            const firstUrl = imageUrls[0];
            if (firstUrl && firstUrl.trim()) {
                return firstUrl.trim().replace(/^"|"$/g, '');
            }
            
            return null;
        };

        const getMealPlanFromML = async (retryCount = 0) => {
            const maxRetries = 3;
            
            try {
                const mlParams = new URLSearchParams({
                    total_calories: totalCalories.toString(),
                    max_plans: '3', 
                    calorie_tolerance_percent: tolerancePercent.toString()
                });

                const mlEndpoint = `http://35.171.26.192/generate-meal-plan/?${mlParams}`;
                
                const response = await axios.get(mlEndpoint, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.data) {
                    throw new Error('Empty response from ML service');
                }

                let mealPlansData = response.data;
                if (response.data.meal_plans) {
                    mealPlansData = response.data.meal_plans;
                } else if (response.data.data) {
                    mealPlansData = response.data.data;
                }

                if (!Array.isArray(mealPlansData) || mealPlansData.length === 0) {
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return await getMealPlanFromML(retryCount + 1);
                    } else {
                        throw new Error('Maksimal retry tercapai, ML tidak menghasilkan meal plan');
                    }
                }

                return mealPlansData;

            } catch (error) {
                if (retryCount < maxRetries) {
                    if (error.code === 'ECONNREFUSED' || 
                        error.code === 'ENOTFOUND' || 
                        error.code === 'ECONNABORTED' ||
                        error.message.includes('timeout')) {
                        
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        return await getMealPlanFromML(retryCount + 1);
                    }
                }
                throw error;
            }
        };

        const mealPlans = await getMealPlanFromML();

        const simplifiedMealPlans = mealPlans.map(plan => {
            const simplifiedPlan = {};
            
            if (plan.Meals && Array.isArray(plan.Meals)) {
                plan.Meals.forEach(meal => {
                    const mealType = meal.MealType;
                    simplifiedPlan[mealType] = {
                        RecipeId: meal.RecipeId,
                        Name: meal.Name,
                        Calories: Math.round(meal.Calories || 0),
                        Image: getFirstImageUrl(meal.Image)
                    };
                });
            }
            
            simplifiedPlan.TotalCalories = plan.TotalCalories || 0;
            return simplifiedPlan;
        });

        const responseData = {
            user_info: {
                daily_calorie_target: totalCalories,
                user_id: userId
            },
            meal_plans: simplifiedMealPlans,
            generated_at: new Date().toISOString()
        };

        return h.response({
            status: 'success',
            message: 'Meal plan berhasil di-generate',
            data: responseData
        }).code(200);

    } catch (error) {
        console.error('Generate meal plan error:', error);

        if (error.code === 'ECONNREFUSED') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak dapat diakses (Connection refused)'
            }).code(503);
        }

        if (error.code === 'ENOTFOUND') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak ditemukan (Host not found)'
            }).code(503);
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return h.response({
                status: 'error',
                message: 'Request timeout - layanan ML membutuhkan waktu terlalu lama'
            }).code(504);
        }

        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat generate meal plan'
        }).code(500);
    }
};

const getMealDetailsByRecipeId = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { recipeId } = request.params;

        if (!recipeId) {
            return h.response({
                status: 'fail',
                message: 'Recipe ID wajib diisi'
            }).code(400);
        }

        const getFirstImageUrl = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return null;
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            
            const firstUrl = imageUrls[0];
            if (firstUrl && firstUrl.trim()) {
                return firstUrl.trim().replace(/^"|"$/g, '');
            }
            
            return null;
        };

        const getAllImageUrls = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return [];
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            
            return imageUrls
                .map(url => url.trim().replace(/^"|"$/g, ''))
                .filter(url => url && url.startsWith('http'));
        };

        const formatImgUrls = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return null;
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            
            const formattedUrls = imageUrls.map(url => url.trim().replace(/^"|"$/g, ''));
            
            const result = [];
            formattedUrls.forEach((url, index) => {
                if (url && url.startsWith('http')) {
                    result.push(`[Index ${index}] "${url}"`);
                }
            });
            
            return result.length > 0 ? result : null;
        };

        const mlEndpoint = `http://3.24.217.142:8000/recipe_detail/${recipeId}`;
        
        const response = await axios.get(mlEndpoint, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.data) {
            return h.response({
                status: 'fail',
                message: 'Meal tidak ditemukan'
            }).code(404);
        }

        const meal = response.data;
        
        const imageUrl = getFirstImageUrl(meal.Image);
        const allImages = getAllImageUrls(meal.Image);
        const formattedImages = formatImgUrls(meal.Image);

        let ingredients = [];
        if (meal.RecipeIngredientParts && Array.isArray(meal.RecipeIngredientParts)) {
            ingredients = meal.RecipeIngredientParts;
        }

        const detailedMeal = {
            id: meal.RecipeId?.toString() || null,
            food_name: meal.Name || 'Unknown Recipe',
            calories_per_serving: Math.round(meal.Calories || 0),
            protein_per_serving: parseFloat((meal.ProteinContent || 0).toFixed(2)),
            carbs_per_serving: parseFloat((meal.CarbohydrateContent || 0).toFixed(2)),
            fat_per_serving: parseFloat((meal.FatContent || 0).toFixed(2)),
            serving_size: meal.ServingSize || 1,
            serving_unit: meal.ServingUnit || "Porsi",
            image_url: imageUrl,
            is_verified: true,
            created_at: new Date().toISOString(),
            recipe_metadata: {
                original_recipe_id: meal.RecipeId || null,
                cook_time: meal.CookTime || 0,
                prep_time: meal.PrepTime || 0,
                total_time: meal.TotalTime || 0,
                servings: meal.ServingSize || 1,
                keywords: meal.Keywords || [],
                ingredients: ingredients,
                cuisine: "Other",
                meal_type: "Main",
                diet_type: [],
                all_images: allImages,
                total_nutrition: {
                    calories: Math.round(meal.Calories || 0),
                    protein: Math.round(meal.ProteinContent || 0),
                    carbs: Math.round(meal.CarbohydrateContent || 0),
                    fat: Math.round(meal.FatContent || 0),
                    saturated_fat: Math.round(meal.SaturatedFatContent || 0),
                    cholesterol: Math.round(meal.CholesterolContent || 0),
                    sodium: Math.round(meal.SodiumContent || 0),
                    fiber: Math.round(meal.FiberContent || 0),
                    sugar: Math.round(meal.SugarContent || 0)
                }
            }
        };

        return h.response({
            status: 'success',
            message: 'Detail meal berhasil ditemukan',
            data: {
                meal: detailedMeal
            }
        }).code(200);

    } catch (error) {
        console.error('Get meal details error:', error);
        
        if (error.response) {
            if (error.response.status === 404) {
                return h.response({
                    status: 'fail',
                    message: 'Recipe tidak ditemukan'
                }).code(404);
            }
            
            if (error.response.status >= 500) {
                return h.response({
                    status: 'error',
                    message: 'Layanan ML mengalami gangguan'
                }).code(503);
            }
        }
        
        if (error.code === 'ECONNREFUSED') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak dapat diakses'
            }).code(503);
        }

        if (error.code === 'ENOTFOUND') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak ditemukan'
            }).code(503);
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return h.response({
                status: 'error',
                message: 'Request timeout - layanan ML membutuhkan waktu terlalu lama'
            }).code(504);
        }

        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil detail meal'
        }).code(500);
    }
};

const getMealSuggestions = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { keywords } = request.query;

        if (!keywords) {
            return h.response({
                status: 'fail',
                message: 'Keywords wajib diisi'
            }).code(400);
        }

        let keywordList = [];
        if (typeof keywords === 'string') {
            keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
        } else if (Array.isArray(keywords)) {
            keywordList = keywords.filter(k => typeof k === 'string' && k.trim().length > 0);
        }

        if (keywordList.length === 0) {
            return h.response({
                status: 'fail',
                message: 'Minimal 1 keyword harus diisi'
            }).code(400);
        }

        if (keywordList.length > 6) {
            return h.response({
                status: 'fail',
                message: 'Maksimal 6 keywords yang diizinkan'
            }).code(400);
        }

        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', userId)
            .get();

        if (profileQuery.empty) {
            return h.response({
                status: 'fail',
                message: 'Profil pengguna tidak ditemukan. Silakan lengkapi profil terlebih dahulu.'
            }).code(404);
        }

        const userProfile = profileQuery.docs[0].data();
        const targetCalories = userProfile.daily_calorie_target;

        if (!targetCalories || targetCalories <= 0) {
            return h.response({
                status: 'fail',
                message: 'Target kalori harian belum diset dalam profil. Silakan set target kalori terlebih dahulu.'
            }).code(400);
        }

        const keywordsParam = keywordList.join(',');
        const mlParams = new URLSearchParams({
            keywords: keywordsParam,
            target_calories: targetCalories.toString(),
            top_n: '10'
        });

        const mlEndpoint = `http://3.24.217.142:8000/recommend_recipes?${mlParams}`;

        const getMealSuggestionsFromML = async (retryCount = 0) => {
            const maxRetries = 3;
            
            try {
                console.log(`Calling ML API: ${mlEndpoint}`);
                
                const response = await axios.get(mlEndpoint, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.data) {
                    throw new Error('Empty response from ML service');
                }

                let recommendationsData = response.data.recommendations || [];
                
                if (!Array.isArray(recommendationsData) || recommendationsData.length === 0) {
                    if (retryCount < maxRetries) {
                        console.log(`Retry attempt ${retryCount + 1} for ML API call`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return await getMealSuggestionsFromML(retryCount + 1);
                    } else {
                        return [];
                    }
                }

                return recommendationsData;

            } catch (error) {
                console.error(`ML API error (attempt ${retryCount + 1}):`, error.message);
                
                if (retryCount < maxRetries) {
                    if (error.code === 'ECONNREFUSED' || 
                        error.code === 'ENOTFOUND' || 
                        error.code === 'ECONNABORTED' ||
                        error.message.includes('timeout')) {
                        
                        console.log(`Retrying ML API call in 3 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        return await getMealSuggestionsFromML(retryCount + 1);
                    }
                }
                throw error;
            }
        };

        const getFirstImageUrl = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return null;
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            const firstUrl = imageUrls[0];
            
            if (firstUrl && firstUrl.trim()) {
                return firstUrl.trim().replace(/^"|"$/g, '');
            }
            
            return null;
        };

        const recommendations = await getMealSuggestionsFromML();

        const formattedSuggestions = recommendations.map(recipe => ({
            recipe_id: recipe.RecipeId?.toString() || null,
            name: recipe.Name || 'Unknown Recipe',
            calories: Math.round(recipe.Calories || 0),
            protein: parseFloat((recipe.ProteinContent || 0).toFixed(2)),
            carbohydrate: parseFloat((recipe.CarbohydrateContent || 0).toFixed(2)),
            fat: parseFloat((recipe.FatContent || 0).toFixed(2)),
            serving_size: recipe.ServingSize || 1,
            serving_unit: recipe.ServingUnit || 'Porsi',
            image_url: getFirstImageUrl(recipe.Image),
            calories_difference: Math.abs(targetCalories - (recipe.Calories || 0))
        }));

        formattedSuggestions.sort((a, b) => a.calories_difference - b.calories_difference);

        const responseData = {
            user_info: {
                user_id: userId,
                daily_calorie_target: targetCalories
            },
            search_criteria: {
                keywords: keywordList,
                target_calories: targetCalories,
                total_results: formattedSuggestions.length
            },
            suggestions: formattedSuggestions,
            generated_at: new Date().toISOString()
        };

        return h.response({
            status: 'success',
            message: 'Meal suggestions berhasil ditemukan',
            data: responseData
        }).code(200);

    } catch (error) {
        console.error('Get meal suggestions error:', error);

        if (error.response) {
            if (error.response.status === 404) {
                return h.response({
                    status: 'fail',
                    message: 'Tidak ada rekomendasi meal yang ditemukan untuk kriteria tersebut'
                }).code(404);
            }
            
            if (error.response.status >= 500) {
                return h.response({
                    status: 'error',
                    message: 'Layanan ML mengalami gangguan'
                }).code(503);
            }
        }

        if (error.code === 'ECONNREFUSED') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak dapat diakses (Connection refused)'
            }).code(503);
        }

        if (error.code === 'ENOTFOUND') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak ditemukan (Host not found)'
            }).code(503);
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return h.response({
                status: 'error',
                message: 'Request timeout - layanan ML membutuhkan waktu terlalu lama'
            }).code(504);
        }

        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil meal suggestions'
        }).code(500);
    }
};

const addMealFromPlan = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { 
            recipe_id,
            meal_type, 
            servings = 1,
            log_date 
        } = request.payload;

        if (!recipe_id || !meal_type || !log_date) {
            return h.response({
                status: 'fail',
                message: 'Recipe ID, meal type, dan log date wajib diisi'
            }).code(400);
        }

        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
            return h.response({
                status: 'fail',
                message: 'Meal type harus salah satu dari: breakfast, lunch, dinner, snack'
            }).code(400);
        }

        const getFirstImageUrl = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return null;
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            const firstUrl = imageUrls[0];
            
            if (firstUrl && firstUrl.trim()) {
                return firstUrl.trim().replace(/^"|"$/g, '');
            }
            
            return null;
        };

        const mlEndpoint = `http://3.24.217.142:8000/recipe_detail/${recipe_id}`;
        
        let mealData;
        try {
            const response = await axios.get(mlEndpoint, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.data) {
                return h.response({
                    status: 'fail',
                    message: 'Recipe tidak ditemukan'
                }).code(404);
            }

            mealData = response.data;
        } catch (error) {
            console.error('Error fetching recipe details:', error);
            return h.response({
                status: 'error',
                message: 'Gagal mengambil detail recipe dari layanan ML'
            }).code(503);
        }

        const virtualFoodItem = {
            id: `recipe_${recipe_id}`,
            food_name: mealData.Name || 'Unknown Recipe',
            calories_per_serving: Math.round(mealData.Calories || 0),
            protein_per_serving: parseFloat((mealData.ProteinContent || 0).toFixed(2)),
            carbs_per_serving: parseFloat((mealData.CarbohydrateContent || 0).toFixed(2)),
            fat_per_serving: parseFloat((mealData.FatContent || 0).toFixed(2)),
            serving_size: mealData.ServingSize || 1,
            serving_unit: mealData.ServingUnit || "Porsi",
            image_url: getFirstImageUrl(mealData.Image),
            is_recipe: true,
            recipe_id: recipe_id,
            created_at: new Date().toISOString()
        };

        const servingAmount = parseFloat(servings);
        const calories = Math.round(virtualFoodItem.calories_per_serving * servingAmount);
        const protein = virtualFoodItem.protein_per_serving * servingAmount;
        const carbs = virtualFoodItem.carbs_per_serving * servingAmount;
        const fat = virtualFoodItem.fat_per_serving * servingAmount;

        const logQuery = await db.collection('user_daily_logs')
            .where('user_id', '==', userId)
            .where('log_date', '==', log_date)
            .get();

        let dailyLogId;
        let currentLog = null;

        if (logQuery.empty) {
            dailyLogId = nanoid(16);
            const newLog = {
                id: dailyLogId,
                user_id: userId,
                log_date,
                total_calories_consumed: calories,
                total_protein_consumed: protein,
                total_carbs_consumed: carbs,
                total_fat_consumed: fat,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(dailyLogId).set(newLog);
            currentLog = newLog;
        } else {
            const logDoc = logQuery.docs[0];
            currentLog = logDoc.data();
            dailyLogId = currentLog.id;

            const updatedLog = {
                total_calories_consumed: (currentLog.total_calories_consumed || 0) + calories,
                total_protein_consumed: (currentLog.total_protein_consumed || 0) + protein,
                total_carbs_consumed: (currentLog.total_carbs_consumed || 0) + carbs,
                total_fat_consumed: (currentLog.total_fat_consumed || 0) + fat,
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(dailyLogId).update(updatedLog);
        }

        const mealEntryId = nanoid(16);
        const mealEntry = {
            id: mealEntryId,
            user_id: userId,
            daily_log_id: dailyLogId,
            food_item_id: virtualFoodItem.id,
            meal_type,
            servings: servingAmount,
            calories,
            protein,
            carbs,
            fat,
            is_from_recipe: true,
            recipe_id: recipe_id,
            consumed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection('meal_entries').doc(mealEntryId).set(mealEntry);

        return h.response({
            status: 'success',
            message: 'Meal dari meal plan berhasil ditambahkan',
            data: {
                mealEntryId,
                dailyLogId,
                food_details: virtualFoodItem
            }
        }).code(201);

    } catch (error) {
        console.error('Add meal from plan error:', error);
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const addFullMealPlan = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { 
            meal_plan,
            log_date 
        } = request.payload;

        if (!meal_plan || !log_date) {
            return h.response({
                status: 'fail',
                message: 'Meal plan dan log date wajib diisi'
            }).code(400);
        }

        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const missingMeals = mealTypes.filter(type => !meal_plan[type]);
        
        if (missingMeals.length > 0) {
            return h.response({
                status: 'fail',
                message: `Meal plan tidak lengkap. Missing: ${missingMeals.join(', ')}`
            }).code(400);
        }

        const results = [];
        let totalPlanCalories = 0;
        let totalPlanProtein = 0;
        let totalPlanCarbs = 0;
        let totalPlanFat = 0;

        const getFirstImageUrl = (inputString) => {
            if (!inputString || typeof inputString !== 'string') {
                return null;
            }
            
            const cleanInput = inputString.replace(/\\\//g, '/');
            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
            const firstUrl = imageUrls[0];
            
            if (firstUrl && firstUrl.trim()) {
                return firstUrl.trim().replace(/^"|"$/g, '');
            }
            
            return null;
        };

        for (const mealType of mealTypes) {
            const meal = meal_plan[mealType];
            
            try {
                const mlEndpoint = `http://3.24.217.142:8000/recipe_detail/${meal.RecipeId}`;
                const response = await axios.get(mlEndpoint, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.data) {
                    results.push({
                        meal_type: mealType,
                        status: 'failed',
                        message: 'Recipe tidak ditemukan'
                    });
                    continue;
                }

                const mealData = response.data;

                const virtualFoodItem = {
                    id: `recipe_${meal.RecipeId}`,
                    food_name: mealData.Name || meal.Name || 'Unknown Recipe',
                    calories_per_serving: Math.round(mealData.Calories || meal.Calories || 0),
                    protein_per_serving: parseFloat((mealData.ProteinContent || 0).toFixed(2)),
                    carbs_per_serving: parseFloat((mealData.CarbohydrateContent || 0).toFixed(2)),
                    fat_per_serving: parseFloat((mealData.FatContent || 0).toFixed(2)),
                    serving_size: mealData.ServingSize || 1,
                    serving_unit: mealData.ServingUnit || "Porsi",
                    image_url: getFirstImageUrl(mealData.Image) || meal.Image,
                    is_recipe: true,
                    recipe_id: meal.RecipeId,
                    created_at: new Date().toISOString()
                };

                const servings = 1;
                const calories = virtualFoodItem.calories_per_serving * servings;
                const protein = virtualFoodItem.protein_per_serving * servings;
                const carbs = virtualFoodItem.carbs_per_serving * servings;
                const fat = virtualFoodItem.fat_per_serving * servings;

                totalPlanCalories += calories;
                totalPlanProtein += protein;
                totalPlanCarbs += carbs;
                totalPlanFat += fat;

                results.push({
                    meal_type: mealType,
                    status: 'success',
                    recipe_id: meal.RecipeId,
                    food_details: virtualFoodItem,
                    nutrition: { calories, protein, carbs, fat }
                });

            } catch (error) {
                console.error(`Error processing ${mealType}:`, error);
                results.push({
                    meal_type: mealType,
                    status: 'failed',
                    message: 'Gagal mengambil detail recipe'
                });
            }
        }

        const successfulMeals = results.filter(r => r.status === 'success');
        if (successfulMeals.length === 0) {
            return h.response({
                status: 'fail',
                message: 'Tidak ada meal yang berhasil diproses'
            }).code(400);
        }

        const logQuery = await db.collection('user_daily_logs')
            .where('user_id', '==', userId)
            .where('log_date', '==', log_date)
            .get();

        let dailyLogId;

        if (logQuery.empty) {
            dailyLogId = nanoid(16);
            const newLog = {
                id: dailyLogId,
                user_id: userId,
                log_date,
                total_calories_consumed: totalPlanCalories,
                total_protein_consumed: totalPlanProtein,
                total_carbs_consumed: totalPlanCarbs,
                total_fat_consumed: totalPlanFat,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(dailyLogId).set(newLog);
        } else {
            const logDoc = logQuery.docs[0];
            const currentLog = logDoc.data();
            dailyLogId = currentLog.id;

            const updatedLog = {
                total_calories_consumed: (currentLog.total_calories_consumed || 0) + totalPlanCalories,
                total_protein_consumed: (currentLog.total_protein_consumed || 0) + totalPlanProtein,
                total_carbs_consumed: (currentLog.total_carbs_consumed || 0) + totalPlanCarbs,
                total_fat_consumed: (currentLog.total_fat_consumed || 0) + totalPlanFat,
                updated_at: new Date().toISOString()
            };

            await db.collection('user_daily_logs').doc(dailyLogId).update(updatedLog);
        }

        const mealEntryIds = [];
        for (const meal of successfulMeals) {
            const mealEntryId = nanoid(16);
            const mealEntry = {
                id: mealEntryId,
                user_id: userId,
                daily_log_id: dailyLogId,
                food_item_id: meal.food_details.id,
                meal_type: meal.meal_type,
                servings: 1,
                calories: Math.round(meal.nutrition.calories),
                protein: meal.nutrition.protein,
                carbs: meal.nutrition.carbs,
                fat: meal.nutrition.fat,
                is_from_recipe: true,
                recipe_id: meal.recipe_id,
                is_from_meal_plan: true,
                consumed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await db.collection('meal_entries').doc(mealEntryId).set(mealEntry);
            mealEntryIds.push(mealEntryId);
        }

        return h.response({
            status: 'success',
            message: `Meal plan berhasil ditambahkan. ${successfulMeals.length} dari ${mealTypes.length} meal berhasil diproses.`,
            data: {
                dailyLogId,
                mealEntryIds,
                processed_meals: results,
                total_nutrition: {
                    calories: Math.round(totalPlanCalories),
                    protein: parseFloat(totalPlanProtein.toFixed(2)),
                    carbs: parseFloat(totalPlanCarbs.toFixed(2)),
                    fat: parseFloat(totalPlanFat.toFixed(2))
                }
            }
        }).code(201);

    } catch (error) {
        console.error('Add full meal plan error:', error);
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const addMealFromSuggestion = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { 
            recipe_id,
            meal_type, 
            servings = 1,
            log_date 
        } = request.payload;

        if (!recipe_id || !meal_type || !log_date) {
            return h.response({
                status: 'fail',
                message: 'Recipe ID, meal type, dan log date wajib diisi'
            }).code(400);
        }

        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
            return h.response({
                status: 'fail',
                message: 'Meal type harus salah satu dari: breakfast, lunch, dinner, snack'
            }).code(400);
        }

        const tempRequest = {
            ...request,
            payload: {
                recipe_id,
                meal_type,
                servings,
                log_date
            }
        };

        return await addMealFromPlan(tempRequest, h);

    } catch (error) {
        console.error('Add meal from suggestion error:', error);
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getMealEntriesUpdated = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { log_date, meal_type } = request.query;

        let query = db.collection('meal_entries').where('user_id', '==', userId);

        if (log_date) {
            const logQuery = await db.collection('user_daily_logs')
                .where('user_id', '==', userId)
                .where('log_date', '==', log_date)
                .get();

            if (!logQuery.empty) {
                const dailyLogId = logQuery.docs[0].data().id;
                query = query.where('daily_log_id', '==', dailyLogId);
            } else {
                return h.response({
                    status: 'success',
                    data: {
                        meal_entries: []
                    }
                }).code(200);
            }
        }

        if (meal_type) {
            query = query.where('meal_type', '==', meal_type);
        }

        const snapshot = await query.get();
        const mealEntries = [];

        for (const doc of snapshot.docs) {
            const mealData = doc.data();
            let foodData = null;

            if (mealData.is_from_recipe && mealData.recipe_id) {
                try {
                    const mlEndpoint = `http://3.24.217.142:8000/recipe_detail/${mealData.recipe_id}`;
                    const response = await axios.get(mlEndpoint, {
                        timeout: 10000,
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });

                    if (response.data) {
                        const recipeData = response.data;
                        const getFirstImageUrl = (inputString) => {
                            if (!inputString || typeof inputString !== 'string') {
                                return null;
                            }
                            
                            const cleanInput = inputString.replace(/\\\//g, '/');
                            const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
                            const firstUrl = imageUrls[0];
                            
                            if (firstUrl && firstUrl.trim()) {
                                return firstUrl.trim().replace(/^"|"$/g, '');
                            }
                            
                            return null;
                        };

                        foodData = {
                            id: `recipe_${mealData.recipe_id}`,
                            food_name: recipeData.Name || 'Unknown Recipe',
                            calories_per_serving: Math.round(recipeData.Calories || 0),
                            protein_per_serving: parseFloat((recipeData.ProteinContent || 0).toFixed(2)),
                            carbs_per_serving: parseFloat((recipeData.CarbohydrateContent || 0).toFixed(2)),
                            fat_per_serving: parseFloat((recipeData.FatContent || 0).toFixed(2)),
                            serving_size: recipeData.ServingSize || 1,
                            serving_unit: recipeData.ServingUnit || "Porsi",
                            image_url: getFirstImageUrl(recipeData.Image),
                            is_recipe: true,
                            recipe_id: mealData.recipe_id
                        };
                    }
                } catch (error) {
                    console.error('Error fetching recipe details for meal entry:', error);
                    foodData = {
                        id: mealData.food_item_id,
                        food_name: 'Recipe (Detail tidak dapat dimuat)',
                        calories_per_serving: Math.round(mealData.calories / mealData.servings),
                        protein_per_serving: parseFloat((mealData.protein / mealData.servings).toFixed(2)),
                        carbs_per_serving: parseFloat((mealData.carbs / mealData.servings).toFixed(2)),
                        fat_per_serving: parseFloat((mealData.fat / mealData.servings).toFixed(2)),
                        serving_size: 1,
                        serving_unit: "Porsi",
                        image_url: null,
                        is_recipe: true,
                        recipe_id: mealData.recipe_id
                    };
                }
            } else {
                let foodDoc = await db.collection('food_items').doc(mealData.food_item_id).get();

                if (!foodDoc.exists) {
                    const customFoodSnapshot = await db.collection('user_custom_foods')
                        .where('id', '==', mealData.food_item_id)
                        .get();
                    
                    if (!customFoodSnapshot.empty) {
                        foodData = customFoodSnapshot.docs[0].data();
                    }
                } else {
                    foodData = foodDoc.data();
                }
            }

            mealEntries.push({
                ...mealData,
                food_details: foodData
            });
        }

        mealEntries.sort((a, b) => new Date(b.consumed_at) - new Date(a.consumed_at));

        return h.response({
            status: 'success',
            data: {
                meal_entries: mealEntries
            }
        }).code(200);

    } catch (error) {
        console.error('Get meal entries error:', error);
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

module.exports = {
    createMealEntry,
    getMealEntries,
    getDailyLog,
    updateMealEntry,
    deleteMealEntry,
    generateMealPlan,
    getMealDetailsByRecipeId,
    getMealSuggestions,
    addMealFromPlan,
    addFullMealPlan,
    addMealFromSuggestion,
    getMealEntriesUpdated
};