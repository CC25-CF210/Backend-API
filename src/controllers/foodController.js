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
        const { name, verified, page = 1 } = request.query;
        
        const per_page = 10;
        const max_offset = 9; 
        const max_total_data = 100; 
        
        const currentPage = Math.max(1, parseInt(page));
        const offset = (currentPage - 1) % (max_offset + 1); 
        
        if (offset > max_offset) {
            return h.response({
                status: 'fail',
                message: `Offset tidak boleh lebih dari ${max_offset}`
            }).code(400);
        }

        let query = db.collection('food_items');

        if (verified !== undefined) {
            query = query.where('is_verified', '==', verified === '1');
        }

        if (name) {
            query = query.orderBy('food_name');
        } else {
            query = query.orderBy('created_at', 'desc');
        }

        const countQuery = db.collection('food_items');
        let countFilteredQuery = countQuery;
        
        if (verified !== undefined) {
            countFilteredQuery = countFilteredQuery.where('is_verified', '==', verified === '1');
        }

        const countSnapshot = await countFilteredQuery.get();
        const totalFoods = Math.min(countSnapshot.size, max_total_data);
        const totalPages = Math.ceil(totalFoods / per_page);

        query = query.offset(offset * per_page).limit(per_page);
        
        const snapshot = await query.get();
        let foods = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!name || data.food_name.toLowerCase().includes(name.toLowerCase())) {
                foods.push(data);
            }
        });

        const hasNextPage = currentPage < totalPages && offset < max_offset;
        const hasPrevPage = currentPage > 1;
        const nextPage = hasNextPage ? currentPage + 1 : null;
        const prevPage = hasPrevPage ? currentPage - 1 : null;

        return h.response({
            status: 'success',
            data: {
                foods: foods.map(food => ({
                    id: food.id,
                    food_name: food.food_name,
                    calories_per_serving: food.calories_per_serving,
                    serving_size: food.serving_size,
                    serving_unit: food.serving_unit,
                    image_url: food.image_url
                })),
                pagination: {
                    current_page: currentPage,
                    per_page: per_page,
                    total_pages: totalPages,
                    total_foods: totalFoods,
                    current_offset: offset,
                    max_offset: max_offset,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage,
                    next_page: nextPage,
                    prev_page: prevPage,
                    max_total_data: max_total_data
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
        const { page = 1 } = request.query;
        
        const per_page = 10;
        const max_offset = 9;
        
        const currentPage = Math.max(1, parseInt(page));
        const offset = (currentPage - 1) % (max_offset + 1);

        const countSnapshot = await db.collection('user_custom_foods')
            .where('user_id', '==', userId)
            .get();
        
        const totalCustomFoods = Math.min(countSnapshot.size, 100);
        const totalPages = Math.ceil(totalCustomFoods / per_page);

        const snapshot = await db.collection('user_custom_foods')
            .where('user_id', '==', userId)
            .orderBy('created_at', 'desc')
            .offset(offset * per_page)
            .limit(per_page)
            .get();

        const customFoods = [];
        snapshot.forEach(doc => {
            customFoods.push(doc.data());
        });

        const hasNextPage = currentPage < totalPages && offset < max_offset;
        const hasPrevPage = currentPage > 1;

        return h.response({
            status: 'success',
            data: {
                custom_foods: customFoods,
                pagination: {
                    current_page: currentPage,
                    per_page: per_page,
                    total_pages: totalPages,
                    total_custom_foods: totalCustomFoods,
                    current_offset: offset,
                    max_offset: max_offset,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage,
                    next_page: hasNextPage ? currentPage + 1 : null,
                    prev_page: hasPrevPage ? currentPage - 1 : null
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

module.exports = {
    createFood,
    getAllFoods,
    getFoodById,
    updateFood,
    deleteFood,
    createUserCustomFood,
    getUserCustomFoods
};