const { db } = require('../config/firebase');
const { nanoid } = require('nanoid');
const axios = require('axios');

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

const isValidImageUrl = (url) => {
    if (!url) return false;
    
    try {
        new URL(url);
    } catch {
        return false;
    }
    
    const validDomains = ['sndimg.com', 'imgur.com', 'cloudinary.com'];
    const isValidDomain = validDomains.some(domain => url.includes(domain));
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG'];
    const hasValidExtension = imageExtensions.some(ext => url.endsWith(ext));
    
    const hasInvalidChars = url.includes('(.jpg') || url.includes('(.jpeg') || url.includes('(.png') || 
                           url.includes('(.gif') || url.includes('(.webp') || url.includes('(.JPG') || 
                           url.includes('(.JPEG') || url.includes('(.PNG');
    
    const openParenCount = (url.match(/\(/g) || []).length;
    const closeParenCount = (url.match(/\)/g) || []).length;
    const hasBalancedParens = openParenCount === closeParenCount;
    
    return isValidDomain && hasValidExtension && !hasInvalidChars && hasBalancedParens;
};

const getAllFoods = async (request, h) => {
    try {
        const { name, verified, limit = 12, cursor, direction = 'next' } = request.query;
        
        const pageLimit = Math.min(parseInt(limit), 60);
        
        console.log('Query params:', { name, verified, limit, cursor, direction });
        
        let query = db.collection('food_items');

        if (verified !== undefined) {
            const isVerified = verified === '1' || verified === 'true' || verified === true;
            query = query.where('is_verified', '==', isVerified);
        }

        query = query.orderBy('created_at', 'desc');

        if (cursor) {
            try {
                const cursorDoc = await db.collection('food_items').doc(cursor).get();
                
                if (cursorDoc.exists) {
                    const cursorData = cursorDoc.data();
                    if (direction === 'prev') {
                        query = query.endBefore(cursorData.created_at);
                    } else {
                        query = query.startAfter(cursorData.created_at);
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

        const queryLimit = name ? pageLimit * 5 : pageLimit * 3;
        query = query.limit(queryLimit);
        
        console.log('Executing query...');
        const snapshot = await query.get();
        console.log('Query result count:', snapshot.size);
        
        let foods = [];
        let hasMore = false;
        let processedCount = 0;
        let validImageCount = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`Processing document:`, { id: data.id, food_name: data.food_name });
            
            let shouldInclude = true;
            if (name && !data.food_name.toLowerCase().includes(name.toLowerCase())) {
                shouldInclude = false;
            }

            if (shouldInclude && !isValidImageUrl(data.image_url)) {
                console.log(`Invalid image URL for ${data.food_name}: ${data.image_url}`);
                shouldInclude = false;
            }
            
            if (shouldInclude && foods.length < pageLimit) {
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
                validImageCount++;
            }
            
            processedCount++;
        });

        if (name) {
            hasMore = snapshot.size === queryLimit && foods.length === pageLimit;
        } else {
            hasMore = snapshot.size > pageLimit;
        }

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

        console.log('Final result:', { 
            foods_count: foods.length, 
            validImageCount,
            hasMore, 
            processedCount,
            totalDocs: snapshot.size 
        });

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

const searchFoods = async (request, h) => {
    try {
        const { name } = request.query;

        if (!name || name.trim() === '') {
            return h.response({
                status: 'fail',
                message: 'Parameter name wajib diisi'
            }).code(400);
        }

        const searchTerm = name.trim();
        
        const getSearchFromML = async (retryCount = 0) => {
            const maxRetries = 3;
            
            try {
                const mlParams = new URLSearchParams({
                    name: searchTerm,
                    top_n: '12'
                });

                const mlEndpoint = `http://34.238.249.136/search?${mlParams}`;
                
                console.log('Calling ML search endpoint:', mlEndpoint);
                
                const response = await axios.get(mlEndpoint, {
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.data) {
                    throw new Error('Empty response from ML search service');
                }

                let searchResults = response.data;
                if (response.data.recommendations) {
                    searchResults = response.data.recommendations;
                } else if (response.data.data) {
                    searchResults = response.data.data;
                }

                if (!Array.isArray(searchResults)) {
                    if (retryCount < maxRetries) {
                        console.log(`Invalid search results format, retrying... (${retryCount + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return await getSearchFromML(retryCount + 1);
                    } else {
                        throw new Error('Format hasil search tidak valid dari ML service');
                    }
                }

                return searchResults;

            } catch (error) {
                console.error(`ML search error (attempt ${retryCount + 1}):`, error.message);
                
                if (retryCount < maxRetries) {
                    if (error.code === 'ECONNREFUSED' || 
                        error.code === 'ENOTFOUND' || 
                        error.code === 'ECONNABORTED' ||
                        error.message.includes('timeout')) {
                        
                        console.log(`Retrying ML search... (${retryCount + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return await getSearchFromML(retryCount + 1);
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

        const mlSearchResults = await getSearchFromML();

        const transformedResults = mlSearchResults.map(item => ({
            id: item.RecipeId?.toString() || null,
            recipe_id: item.RecipeId || null,
            food_name: item.Name || '',
            calories_per_serving: Math.round(item.Calories) || 0,
            protein_per_serving: parseFloat(item.ProteinContent) || 0,
            carbs_per_serving: parseFloat(item.CarbohydrateContent) || 0,
            fat_per_serving: parseFloat(item.FatContent) || 0,
            serving_size: item.ServingSize || 1,
            serving_unit: item.ServingUnit || 'Porsi',
            image_url: getFirstImageUrl(item.Image),
        }));

        const responseData = {
            search_query: searchTerm,
            total_results: transformedResults.length,
            foods: transformedResults,
            searched_at: new Date().toISOString()
        };

        return h.response({
            status: 'success',
            message: `Ditemukan ${transformedResults.length} hasil untuk "${searchTerm}"`,
            data: responseData
        }).code(200);

    } catch (error) {
        console.error('Search foods error:', error);

        if (error.code === 'ECONNREFUSED') {
            return h.response({
                status: 'error',
                message: 'Layanan pencarian ML tidak dapat diakses'
            }).code(503);
        }

        if (error.code === 'ENOTFOUND') {
            return h.response({
                status: 'error',
                message: 'Layanan pencarian ML tidak ditemukan'
            }).code(503);
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return h.response({
                status: 'error',
                message: 'Request timeout - layanan pencarian membutuhkan waktu terlalu lama'
            }).code(504);
        }

        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat mencari makanan'
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
    getUserCustomFoods,
    searchFoods
};