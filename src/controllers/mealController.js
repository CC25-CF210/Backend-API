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
        console.log('User daily calorie target:', totalCalories);

        if (!totalCalories || totalCalories <= 0) {
            return h.response({
                status: 'fail',
                message: 'Target kalori harian belum diset atau tidak valid'
            }).code(400);
        }

        let tolerancePercent;
        if (totalCalories <= 2000) {
            tolerancePercent = 0.1;
        } else if (totalCalories <= 2300) {
            tolerancePercent = 0.15;
        } else if (totalCalories <= 2500) {
            tolerancePercent = 0.2;
        } else if (totalCalories <= 2800) {
            tolerancePercent = 0.25;
        } else if (totalCalories <= 3000) {
            tolerancePercent = 0.3;
        } else if (totalCalories <= 3500) {
            tolerancePercent = 0.35;
        } else {
            tolerancePercent = 0.5;
        }

        console.log('Calculated tolerance percent:', tolerancePercent);

        const getMealPlanFromML = async (retryCount = 0) => {
            const maxRetries = 3;
            
            try {
                console.log(`Attempt ${retryCount + 1} - Calling ML service...`);
                
                const mlParams = new URLSearchParams({
                    total_calories: totalCalories.toString(),
                    max_plans: '3', 
                    calorie_tolerance_percent: tolerancePercent.toString()
                });

                const mlEndpoint = `http://35.171.26.192/generate-meal-plan/?${mlParams}`;
                console.log('ML Endpoint:', mlEndpoint);
                
                const response = await axios.get(mlEndpoint, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                console.log('ML Response status:', response.status);
                console.log('ML Response data type:', typeof response.data);

                if (!response.data) {
                    console.log('No data in response');
                    throw new Error('Empty response from ML service');
                }

                let mealPlansData = response.data;
                if (response.data.meal_plans) {
                    mealPlansData = response.data.meal_plans;
                } else if (response.data.data) {
                    mealPlansData = response.data.data;
                }

                if (!Array.isArray(mealPlansData) || mealPlansData.length === 0) {
                    console.log(`Attempt ${retryCount + 1}: No meal plans returned from ML`);
                    
                    if (retryCount < maxRetries) {
                        console.log('Retrying...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return await getMealPlanFromML(retryCount + 1);
                    } else {
                        throw new Error('Maksimal retry tercapai, ML tidak menghasilkan meal plan');
                    }
                }

                console.log(`Success: Got ${mealPlansData.length} meal plans from ML`);
                return mealPlansData;

            } catch (error) {
                console.error(`Attempt ${retryCount + 1} failed:`, error.message);
                
                if (retryCount < maxRetries) {
                    if (error.code === 'ECONNREFUSED' || 
                        error.code === 'ENOTFOUND' || 
                        error.code === 'ECONNABORTED' ||
                        error.message.includes('timeout')) {
                        
                        console.log(`Attempt ${retryCount + 1}: Connection/timeout error, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        return await getMealPlanFromML(retryCount + 1);
                    }
                }
                throw error;
            }
        };

        const processMealData = (meal) => {
            let imageUrl = null;
            if (meal.Image) {
                const images = meal.Image.split(',').map(img => img.trim());
                imageUrl = images[0] || null;
            }

            let ingredients = [];
            if (meal.RecipeIngredientParts && Array.isArray(meal.RecipeIngredientParts)) {
                ingredients = meal.RecipeIngredientParts.flatMap(part => 
                    part.split(',').map(ingredient => ingredient.trim())
                );
            }

            return {
                id: meal.RecipeId?.toString() || null,
                food_name: meal.Name || 'Unknown Recipe',
                calories_per_serving: Math.round(meal.Calories || 0),
                protein_per_serving: parseFloat((meal.ProteinContent || 0).toFixed(2)),
                carbs_per_serving: parseFloat((meal.CarbohydrateContent || 0).toFixed(2)),
                fat_per_serving: parseFloat((meal.FatContent || 0).toFixed(2)),
                serving_size: 1,
                serving_unit: "porsi",
                image_url: imageUrl,
                is_verified: true,
                created_at: new Date().toISOString(),
                recipe_metadata: {
                    original_recipe_id: meal.RecipeId || null,
                    cook_time: meal.CookTime || 0,
                    prep_time: meal.PrepTime || 0,
                    total_time: meal.TotalTime || 0,
                    servings: 1, // Default to 1 serving
                    keywords: meal.Keywords || [],
                    ingredients: ingredients,
                    cuisine: "Other",
                    meal_type: meal.MealType || "Main",
                    diet_type: [],
                    all_images: meal.Image ? meal.Image.split(',').map(img => img.trim()) : [],
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
        };

        const mealPlans = await getMealPlanFromML();

        const processedMealPlans = mealPlans.map(plan => {
            const processedPlan = {
                total_calories: plan.TotalCalories || 0,
                meals: {}
            };

            if (plan.Meals && Array.isArray(plan.Meals)) {
                plan.Meals.forEach(meal => {
                    const mealType = meal.MealType?.toLowerCase() || 'unknown';
                    
                    let standardMealType;
                    switch (mealType) {
                        case 'breakfast':
                            standardMealType = 'breakfast';
                            break;
                        case 'lunch':
                            standardMealType = 'lunch';
                            break;
                        case 'dinner':
                            standardMealType = 'dinner';
                            break;
                        case 'additional meal 1':
                        case 'additional meal 2':
                        case 'snack':
                            standardMealType = 'snack';
                            break;
                        default:
                            standardMealType = 'snack';
                    }

                    if (!processedPlan.meals[standardMealType]) {
                        processedPlan.meals[standardMealType] = [];
                    }

                    processedPlan.meals[standardMealType].push(processMealData(meal));
                });
            }

            return processedPlan;
        });

        const responseData = {
            user_info: {
                daily_calorie_target: totalCalories,
                user_id: userId
            },
            meal_plans: processedMealPlans,
            generated_at: new Date().toISOString()
        };

        console.log('Successfully generated meal plan');
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

        if (axios.isAxiosError(error) && error.response) {
            return h.response({
                status: 'error',
                message: 'Gagal generate meal plan dari layanan ML',
                details: {
                    status: error.response.status,
                    data: error.response.data
                }
            }).code(error.response.status >= 400 && error.response.status < 500 ? 400 : 500);
        }

        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat generate meal plan',
            error_details: {
                message: error.message,
                type: error.constructor.name
            }
        }).code(500);
    }
};

const saveMealPlan = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { meal_plan_data, plan_name } = request.payload;

        if (!meal_plan_data) {
            return h.response({
                status: 'fail',
                message: 'Data meal plan wajib diisi'
            }).code(400);
        }

        const mealPlanId = nanoid(16);
        const savedMealPlan = {
            id: mealPlanId,
            user_id: userId,
            plan_name: plan_name || `Meal Plan ${new Date().toLocaleDateString()}`,
            meal_plan_data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection('saved_meal_plans').doc(mealPlanId).set(savedMealPlan);

        return h.response({
            status: 'success',
            message: 'Meal plan berhasil disimpan',
            data: {
                meal_plan_id: mealPlanId
            }
        }).code(201);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getSavedMealPlans = async (request, h) => {
    try {
        const userId = request.user.uid;

        const snapshot = await db.collection('saved_meal_plans')
            .where('user_id', '==', userId)
            .orderBy('created_at', 'desc')
            .get();

        const mealPlans = snapshot.docs.map(doc => doc.data());

        return h.response({
            status: 'success',
            data: {
                meal_plans: mealPlans
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getMealPlanById = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { mealPlanId } = request.params;

        const mealPlanDoc = await db.collection('saved_meal_plans').doc(mealPlanId).get();

        if (!mealPlanDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'Meal plan tidak ditemukan'
            }).code(404);
        }

        const mealPlanData = mealPlanDoc.data();

        if (mealPlanData.user_id !== userId) {
            return h.response({
                status: 'fail',
                message: 'Akses ditolak'
            }).code(403);
        }

        return h.response({
            status: 'success',
            data: {
                meal_plan: mealPlanData
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getMealFromPlanById = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { mealPlanId, mealType, mealIndex } = request.params;

        const mealPlanDoc = await db.collection('saved_meal_plans').doc(mealPlanId).get();

        if (!mealPlanDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'Meal plan tidak ditemukan'
            }).code(404);
        }

        const mealPlanData = mealPlanDoc.data();

        if (mealPlanData.user_id !== userId) {
            return h.response({
                status: 'fail',
                message: 'Akses ditolak'
            }).code(403);
        }

        const mealPlans = mealPlanData.meal_plan_data.meal_plans;
        if (!mealPlans || mealPlans.length === 0) {
            return h.response({
                status: 'fail',
                message: 'Tidak ada meal plan tersedia'
            }).code(404);
        }

        const selectedPlan = mealPlans[0];
        const mealsOfType = selectedPlan.meals[mealType];

        if (!mealsOfType || !Array.isArray(mealsOfType)) {
            return h.response({
                status: 'fail',
                message: `Meal type '${mealType}' tidak ditemukan`
            }).code(404);
        }

        const mealIndex_int = parseInt(mealIndex);
        if (mealIndex_int < 0 || mealIndex_int >= mealsOfType.length) {
            return h.response({
                status: 'fail',
                message: 'Index meal tidak valid'
            }).code(404);
        }

        const selectedMeal = mealsOfType[mealIndex_int];

        return h.response({
            status: 'success',
            data: {
                meal: selectedMeal,
                meal_plan_info: {
                    plan_id: mealPlanId,
                    plan_name: mealPlanData.plan_name,
                    meal_type: mealType,
                    meal_index: mealIndex_int
                }
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const addMealFromPlanToLog = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { mealPlanId, mealType, mealIndex } = request.params;
        const { log_date, servings = 1 } = request.payload;

        if (!log_date) {
            return h.response({
                status: 'fail',
                message: 'Log date wajib diisi'
            }).code(400);
        }

        const mealPlanDoc = await db.collection('saved_meal_plans').doc(mealPlanId).get();

        if (!mealPlanDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'Meal plan tidak ditemukan'
            }).code(404);
        }

        const mealPlanData = mealPlanDoc.data();

        if (mealPlanData.user_id !== userId) {
            return h.response({
                status: 'fail',
                message: 'Akses ditolak'
            }).code(403);
        }

        const mealPlans = mealPlanData.meal_plan_data.meal_plans;
        const selectedPlan = mealPlans[0];
        const mealsOfType = selectedPlan.meals[mealType];
        const selectedMeal = mealsOfType[parseInt(mealIndex)];

        if (!selectedMeal) {
            return h.response({
                status: 'fail',
                message: 'Meal tidak ditemukan'
            }).code(404);
        }

        const tempFoodId = `temp_${nanoid(16)}`;
        const tempFood = {
            id: tempFoodId,
            food_name: selectedMeal.food_name,
            calories_per_serving: selectedMeal.calories_per_serving,
            protein_per_serving: selectedMeal.protein_per_serving,
            carbs_per_serving: selectedMeal.carbs_per_serving,
            fat_per_serving: selectedMeal.fat_per_serving,
            serving_size: selectedMeal.serving_size,
            serving_unit: selectedMeal.serving_unit,
            image_url: selectedMeal.image_url,
            is_verified: true,
            created_at: new Date().toISOString(),
            recipe_metadata: selectedMeal.recipe_metadata
        };

        await db.collection('temp_food_items').doc(tempFoodId).set(tempFood);

        const servingAmount = parseFloat(servings);
        const calories = Math.round(selectedMeal.calories_per_serving * servingAmount);
        const protein = selectedMeal.protein_per_serving * servingAmount;
        const carbs = selectedMeal.carbs_per_serving * servingAmount;
        const fat = selectedMeal.fat_per_serving * servingAmount;

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
            food_item_id: tempFoodId,
            meal_type: mealType,
            servings: servingAmount,
            calories,
            protein,
            carbs,
            fat,
            consumed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source_meal_plan_id: mealPlanId
        };

        await db.collection('meal_entries').doc(mealEntryId).set(mealEntry);

        return h.response({
            status: 'success',
            message: 'Meal dari meal plan berhasil ditambahkan ke log',
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

module.exports = {
    createMealEntry,
    getMealEntries,
    getDailyLog,
    updateMealEntry,
    deleteMealEntry,
    generateMealPlan,
    saveMealPlan,
    getSavedMealPlans,
    getMealPlanById,
    getMealFromPlanById,
    addMealFromPlanToLog
};