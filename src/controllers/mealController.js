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

        if (!totalCalories) {
            return h.response({
                status: 'fail',
                message: 'Target kalori harian belum diset'
            }).code(400);
        }

        const mlParams = new URLSearchParams({
            total_calories: totalCalories,
            max_plans: 3, 
            calorie_tolerance_percent: 0.25
        });

        const mlEndpoint = `http://13.220.198.84/generate-meal-plan/?${mlParams}`;
        
        const response = await axios.get(mlEndpoint, {
            timeout: 30000 
        });

        const responseData = {
            user_info: {
                daily_calorie_target: totalCalories,
                user_id: userId
            },
            meal_plans: response.data,
            generated_at: new Date().toISOString()
        };

        return h.response({
            status: 'success',
            message: 'Meal plan berhasil di-generate',
            data: responseData
        }).code(200);

    } catch (error) {
        console.error('Generate meal plan error:', error);

        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return h.response({
                status: 'error',
                message: 'Layanan ML tidak tersedia saat ini'
            }).code(503);
        }

        if (error.code === 'ECONNABORTED') {
            return h.response({
                status: 'error',
                message: 'Request timeout - layanan ML membutuhkan waktu terlalu lama'
            }).code(504);
        }

        if (error.response) {
            return h.response({
                status: 'error',
                message: 'Gagal generate meal plan dari layanan ML',
                details: error.response.data
            }).code(error.response.status || 500);
        }

        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat generate meal plan'
        }).code(500);
    }
};

module.exports = {
    createMealEntry,
    getMealEntries,
    getDailyLog,
    updateMealEntry,
    deleteMealEntry,
    generateMealPlan
}