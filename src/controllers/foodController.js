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
        const { name, verified, limit = 10, cursor, direction = 'next' } = request.query;
        
        const pageLimit = Math.min(parseInt(limit), 10);
        
        console.log('Query params:', { name, verified, limit, cursor, direction });
        
        let query = db.collection('food_items');

        let orderByField, orderDirection;
        if (name) {
            orderByField = 'food_name';
            orderDirection = 'asc';
            query = query.orderBy('food_name', 'asc');
        } else {
            orderByField = 'created_at';
            orderDirection = 'desc';
            query = query.orderBy('created_at', 'desc');
        }

        query = query.orderBy('id', orderDirection === 'desc' ? 'desc' : 'asc');

        if (cursor) {
            try {
                const cursorDoc = await db.collection('food_items').doc(cursor).get();
                
                if (cursorDoc.exists) {
                    const cursorData = cursorDoc.data();
                    if (direction === 'prev') {
                        if (orderDirection === 'desc') {
                            query = query.startAfter(cursorData[orderByField], cursorData.id);
                        } else {
                            query = query.endBefore(cursorData[orderByField], cursorData.id);
                        }
                    } else {
                        query = query.startAfter(cursorData[orderByField], cursorData.id);
                    }
                }
            } catch (cursorError) {
                console.error('Cursor error:', cursorError);
                return h.response({
                    status: 'fail',
                    message: 'Invalid cursor'
                }).code(400);
            }
        }

        query = query.limit(pageLimit + 1);
        
        console.log('Executing query...');
        const snapshot = await query.get();
        console.log('Query result count:', snapshot.size);
        
        let foods = [];
        let hasMore = false;

        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Document ${index}:`, { id: data.id, food_name: data.food_name });
            
            if (index < pageLimit) {
                let shouldInclude = true;
                
                if (name && !data.food_name.toLowerCase().includes(name.toLowerCase())) {
                    shouldInclude = false;
                }
                
                if (verified !== undefined) {
                    const isVerified = verified === '1' || verified === 'true' || verified === true;
                    if (data.is_verified !== isVerified) {
                        shouldInclude = false;
                    }
                }
                
                if (shouldInclude) {
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
                        created_at: data.created_at
                    });
                }
            } else {
                hasMore = true;
            }
        });

        if (direction === 'prev') {
            foods.reverse();
        }

        let nextCursor = null;
        let prevCursor = null;

        if (foods.length > 0) {
            if (hasMore && direction !== 'prev') {
                nextCursor = foods[foods.length - 1].id;
            }
            if (cursor || direction === 'prev') {
                prevCursor = foods[0].id;
            }
        }

        console.log('Final result:', { foods_count: foods.length, hasMore });

        return h.response({
            status: 'success',
            data: {
                foods,
                pagination: {
                    limit: pageLimit,
                    has_next_page: hasMore && direction !== 'prev',
                    has_prev_page: !!cursor || direction === 'prev',
                    next_cursor: nextCursor,
                    prev_cursor: prevCursor,
                    current_cursor: cursor || null
                }
            }
        }).code(200);

    } catch (error) {
        console.error('getAllFoods error:', error);
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
        const { limit = 10, cursor, direction = 'next' } = request.query;
        
        const pageLimit = Math.min(parseInt(limit), 10);
        
        let query = db.collection('user_custom_foods')
            .where('user_id', '==', userId)
            .orderBy('created_at', 'desc')
            .orderBy('id', 'desc'); 

        if (cursor) {
            try {
                const cursorDoc = await db.collection('user_custom_foods').doc(cursor).get();
                
                if (cursorDoc.exists && cursorDoc.data().user_id === userId) {
                    const cursorData = cursorDoc.data();
                    if (direction === 'prev') {
                        query = query.endBefore(cursorData.created_at, cursorData.id);
                    } else {
                        query = query.startAfter(cursorData.created_at, cursorData.id);
                    }
                }
            } catch (cursorError) {
                return h.response({
                    status: 'fail',
                    message: 'Invalid cursor'
                }).code(400);
            }
        }

        query = query.limit(pageLimit + 1);
        
        const snapshot = await query.get();
        let customFoods = [];
        let hasMore = false;

        snapshot.forEach((doc, index) => {
            if (index < pageLimit) {
                customFoods.push(doc.data());
            } else {
                hasMore = true; 
            }
        });

        if (direction === 'prev') {
            customFoods.reverse();
        }

        let nextCursor = null;
        let prevCursor = null;

        if (customFoods.length > 0) {
            if (hasMore && direction !== 'prev') {
                nextCursor = customFoods[customFoods.length - 1].id;
            }
            if (cursor || direction === 'prev') {
                prevCursor = customFoods[0].id;
            }
        }

        return h.response({
            status: 'success',
            data: {
                custom_foods: customFoods,
                pagination: {
                    limit: pageLimit,
                    has_next_page: hasMore && direction !== 'prev',
                    has_prev_page: !!cursor || direction === 'prev',
                    next_cursor: nextCursor,
                    prev_cursor: prevCursor,
                    current_cursor: cursor || null
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