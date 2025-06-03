const { db } = require('../config/firebase');
const { nanoid } = require('nanoid');

const createFood = async (request, h) => {
    try {
        const { 
            food_name, 
            calories_per_serving, 
            protein_per_serving, 
            carbs_per_serving, 
            fat_per_serving, 
            serving_size, 
            serving_unit,
            fatsecret_id,
            image_url
        } = request.payload;

        if (!food_name || !calories_per_serving || !protein_per_serving || !carbs_per_serving || !fat_per_serving || !serving_size || !serving_unit) {
            return h.response({
                status: 'fail',
                message: 'Semua field nutrisi wajib diisi'
            }).code(400);
        }

        const id = nanoid(16);
        const timestamp = new Date().toISOString();

        const foodData = {
            id,
            food_name,
            calories_per_serving: parseInt(calories_per_serving),
            protein_per_serving: parseFloat(protein_per_serving),
            carbs_per_serving: parseFloat(carbs_per_serving),
            fat_per_serving: parseFloat(fat_per_serving),
            serving_size,
            serving_unit,
            fatsecret_id: fatsecret_id || null,
            image_url: image_url || null,
            is_verified: false,
            created_at: timestamp,
            updated_at: timestamp
        };

        await db.collection('food_items').doc(id).set(foodData);

        return h.response({
            status: 'success',
            message: 'Makanan berhasil ditambahkan',
            data: {
                foodId: id
            }
        }).code(201);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getAllFoods = async (request, h) => {
    try {
        const { name, verified, limit, offset = 0 } = request.query;

        let query = db.collection('food_items');

        if (verified !== undefined) {
            query = query.where('is_verified', '==', verified === '1');
        }

        if (name) {
            query = query.orderBy('food_name');
        }

        if (limit) {
            query = query.limit(parseInt(limit));
            if (offset) {
                query = query.offset(parseInt(offset));
            }
        }
        
        const snapshot = await query.get();
        let foods = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            
            if (!name || data.food_name.toLowerCase().includes(name.toLowerCase())) {
                foods.push({
                    id: data.id,
                    food_name: data.food_name,
                    calories_per_serving: data.calories_per_serving,
                    protein_per_serving: data.protein_per_serving,
                    carbs_per_serving: data.carbs_per_serving,
                    fat_per_serving: data.fat_per_serving,
                    serving_size: data.serving_size,
                    serving_unit: data.serving_unit,
                    image_url: data.image_url,
                    is_verified: data.is_verified,
                    fatsecret_id: data.fatsecret_id
                });
            }
        });

        return h.response({
            status: 'success',
            data: {
                foods: foods,
                total: foods.length,
                hasMore: limit ? foods.length === parseInt(limit) : false
            }
        }).code(200);

    } catch (error) {
        console.error('Error getting foods:', error);
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getFoodById = async (request, h) => {
    try {
        const { foodId } = request.params;

        const doc = await db.collection('food_items').doc(foodId).get();

        if (!doc.exists) {
            return h.response({
                status: 'fail',
                message: 'Makanan tidak ditemukan'
            }).code(404);
        }

        return h.response({
            status: 'success',
            data: {
                food: doc.data()
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const updateFood = async (request, h) => {
    try {
        const { foodId } = request.params;
        const updateData = { ...request.payload };

        const doc = await db.collection('food_items').doc(foodId).get();

        if (!doc.exists) {
            return h.response({
                status: 'fail',
                message: 'Makanan tidak ditemukan'
            }).code(404);
        }

        if (updateData.calories_per_serving) updateData.calories_per_serving = parseInt(updateData.calories_per_serving);
        if (updateData.protein_per_serving) updateData.protein_per_serving = parseFloat(updateData.protein_per_serving);
        if (updateData.carbs_per_serving) updateData.carbs_per_serving = parseFloat(updateData.carbs_per_serving);
        if (updateData.fat_per_serving) updateData.fat_per_serving = parseFloat(updateData.fat_per_serving);

        updateData.updated_at = new Date().toISOString();

        await db.collection('food_items').doc(foodId).update(updateData);

        return h.response({
            status: 'success',
            message: 'Makanan berhasil diperbarui'
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const deleteFood = async (request, h) => {
    try {
        const { foodId } = request.params;

        const doc = await db.collection('food_items').doc(foodId).get();

        if (!doc.exists) {
            return h.response({
                status: 'fail',
                message: 'Makanan tidak ditemukan'
            }).code(404);
        }

        await db.collection('food_items').doc(foodId).delete();

        return h.response({
            status: 'success',
            message: 'Makanan berhasil dihapus'
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const createUserCustomFood = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { 
            food_name, 
            calories_per_serving, 
            protein_per_serving, 
            carbs_per_serving, 
            fat_per_serving, 
            serving_size, 
            serving_unit,
            image_url
        } = request.payload;

        if (!food_name || !calories_per_serving || !protein_per_serving || !carbs_per_serving || !fat_per_serving || !serving_size || !serving_unit) {
            return h.response({
                status: 'fail',
                message: 'Semua field nutrisi wajib diisi'
            }).code(400);
        }

        const id = nanoid(16);
        const timestamp = new Date().toISOString();

        const customFoodData = {
            id,
            user_id: userId,
            food_name,
            calories_per_serving: parseInt(calories_per_serving),
            protein_per_serving: parseFloat(protein_per_serving),
            carbs_per_serving: parseFloat(carbs_per_serving),
            fat_per_serving: parseFloat(fat_per_serving),
            serving_size: parseFloat(serving_size),
            serving_unit,
            image_url: image_url || null,
            created_at: timestamp,
            updated_at: timestamp
        };

        await db.collection('user_custom_foods').doc(id).set(customFoodData);

        return h.response({
            status: 'success',
            message: 'Makanan custom berhasil ditambahkan',
            data: {
                customFoodId: id
            }
        }).code(201);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

const getUserCustomFoods = async (request, h) => {
    try {
        const userId = request.user.uid;

        const snapshot = await db.collection('user_custom_foods')
            .where('user_id', '==', userId)
            .get();

        const customFoods = [];
        snapshot.forEach(doc => {
            customFoods.push(doc.data());
        });

        return h.response({
            status: 'success',
            data: {
                custom_foods: customFoods
            }
        }).code(200);

    } catch (error) {
        return h.response({
            status: 'error',
            message: error.message
        }).code(500);
    }
};

module.exports = {
    createFood,
    getAllFoods,
    getFoodById,
    updateFood,
    deleteFood,
    createUserCustomFood,
    getUserCustomFoods
};