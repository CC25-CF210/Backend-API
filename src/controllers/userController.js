const { db } = require('../config/firebase');

const getUserProfile = async (request, h) => {
    try {
        const userId = request.user.uid;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'User tidak ditemukan'
            }).code(404);
        }

        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', userId)
            .get();
        
        if (profileQuery.empty) {
            return h.response({
                status: 'fail',
                message: 'Profile tidak ditemukan'
            }).code(404);
        }

        const profileDoc = profileQuery.docs[0];

        return h.response({
            status: 'success',
            message: 'Profile berhasil diambil',
            data: {
                user: userDoc.data(),
                profile: profileDoc.data()
            }
        }).code(200);

    } catch (error) {
        console.error('Get user profile error:', error);
        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil profile'
        }).code(500);
    }
};

const updateUserProfile = async (request, h) => {
    try {
        const userId = request.user.uid;
        const { 
            name, 
            weight, 
            height, 
            target_weight, 
            fitness_level,
            daily_protein_target, 
            daily_carbs_target, 
            daily_fat_target 
        } = request.payload;

        if (fitness_level) {
            const validFitnessLevels = ['never', 'rarely', 'occasionally', 'regularly', 'daily'];
            if (!validFitnessLevels.includes(fitness_level)) {
                return h.response({
                    status: 'fail',
                    message: 'Fitness level harus salah satu dari: never, rarely, occasionally, regularly, daily'
                }).code(400);
            }
        }

        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', userId)
            .get();
        
        if (profileQuery.empty) {
            return h.response({
                status: 'fail',
                message: 'Profile tidak ditemukan'
            }).code(404);
        }

        const profileDoc = profileQuery.docs[0];
        const currentProfile = profileDoc.data();

        const updatedProfile = {
            ...currentProfile,
            updated_at: new Date().toISOString()
        };

        if (name) updatedProfile.name = name;
        if (weight) updatedProfile.weight = parseInt(weight);
        if (height) updatedProfile.height = parseInt(height);
        if (target_weight) updatedProfile.target_weight = parseInt(target_weight);
        if (fitness_level) updatedProfile.fitness_level = fitness_level;
        if (daily_protein_target) updatedProfile.daily_protein_target = parseInt(daily_protein_target);
        if (daily_carbs_target) updatedProfile.daily_carbs_target = parseInt(daily_carbs_target);
        if (daily_fat_target) updatedProfile.daily_fat_target = parseInt(daily_fat_target);

        if (weight || height || fitness_level) {
            const { gender, age } = currentProfile;
            const newWeight = weight ? parseInt(weight) : currentProfile.weight;
            const newHeight = height ? parseInt(height) : currentProfile.height;
            const newFitnessLevel = fitness_level || currentProfile.fitness_level;
            
            let bmr;
            if (gender === 'male') {
                bmr = (10 * newWeight) + (6.25 * newHeight) - (5 * age) + 5;
            } else {
                bmr = (10 * newWeight) + (6.25 * newHeight) - (5 * age) - 161;
            }

            const activityMultipliers = {
                'never': 1.2,
                'rarely': 1.375,
                'occasionally': 1.55,
                'regularly': 1.725,
                'daily': 1.9
            };
            
            updatedProfile.bmr = bmr;
            updatedProfile.daily_calorie_target = Math.round(bmr * activityMultipliers[newFitnessLevel]);
        }

        await db.collection('user_profiles').doc(profileDoc.id).update(updatedProfile);

        return h.response({
            status: 'success',
            message: 'Profile berhasil diperbarui',
            data: {
                profile: updatedProfile
            }
        }).code(200);

    } catch (error) {
        console.error('Update user profile error:', error);
        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat memperbarui profile'
        }).code(500);
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile
};