const { db, auth } = require('../config/firebase');
const { nanoid } = require('nanoid');

const register = async (request, h) => {
    try {
        const { 
            email, 
            password, 
            name, 
            weight, 
            height, 
            gender, 
            age, 
            fitness_level 
        } = request.payload;

        if (!email || !password || !name || !weight || !height || !gender || !age || !fitness_level) {
            return h.response({
                status: 'fail',
                message: 'Semua field wajib diisi'
            }).code(400);
        }

        const validFitnessLevels = ['never', 'rarely', 'occasionally', 'regularly', 'daily'];
        if (!validFitnessLevels.includes(fitness_level)) {
            return h.response({
                status: 'fail',
                message: 'Fitness level harus salah satu dari: never, rarely, occasionally, regularly, daily'
            }).code(400);
        }

        if (!['male', 'female'].includes(gender)) {
            return h.response({
                status: 'fail',
                message: 'Gender harus male atau female'
            }).code(400);
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name
        });

        let bmr;
        if (gender === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }

        const activityMultipliers = {
            'never': 1.2,
            'rarely': 1.375,
            'occasionally': 1.55,
            'regularly': 1.725,
            'daily': 1.9
        };
        
        const daily_calorie_target = Math.round(bmr * activityMultipliers[fitness_level]);

        const timestamp = new Date().toISOString();

        const userData = {
            id: userRecord.uid,
            email,
            is_verified: false,
            role: 'user',
            created_at: timestamp,
            updated_at: timestamp
        };

        const userProfileData = {
            id: nanoid(16),
            user_id: userRecord.uid,
            name,
            weight: parseInt(weight),
            height: parseInt(height),
            gender,
            age: parseInt(age),
            fitness_level,
            daily_calorie_target,
            bmr,
            bmr_calculation_type: 'mifflin_st_jeor',
            created_at: timestamp,
            updated_at: timestamp
        };

        await db.collection('users').doc(userRecord.uid).set(userData);
        await db.collection('user_profiles').doc(userProfileData.id).set(userProfileData);

        const customToken = await auth.createCustomToken(userRecord.uid);

        return h.response({
            status: 'success',
            message: 'Registrasi berhasil',
            data: {
                userId: userRecord.uid,
                email: userData.email,
                profile: userProfileData,
                customToken: customToken,
                instructions: 'Gunakan customToken untuk sign in dengan Firebase Client SDK dan dapatkan ID token'
            }
        }).code(201);

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            return h.response({
                status: 'fail',
                message: 'Email sudah terdaftar'
            }).code(400);
        } else if (error.code === 'auth/invalid-email') {
            return h.response({
                status: 'fail',
                message: 'Format email tidak valid'
            }).code(400);
        } else if (error.code === 'auth/weak-password') {
            return h.response({
                status: 'fail',
                message: 'Password terlalu lemah (minimal 6 karakter)'
            }).code(400);
        }

        console.error('Registration error:', error);
        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat registrasi'
        }).code(500);
    }
};

const login = async (request, h) => {
    try {
        const { email, password } = request.payload;

        if (!email || !password) {
            return h.response({
                status: 'fail',
                message: 'Email dan password wajib diisi'
            }).code(400);
        }

        const userRecord = await auth.getUserByEmail(email);
        
        const customToken = await auth.createCustomToken(userRecord.uid);

        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', userRecord.uid)
            .get();

        let userData = null;
        let profileData = null;

        if (userDoc.exists) {
            userData = userDoc.data();
        }

        if (!profileQuery.empty) {
            profileData = profileQuery.docs[0].data();
        }

        return h.response({
            status: 'success',
            message: 'Login berhasil',
            data: {
                userId: userRecord.uid,
                email: userRecord.email,
                customToken: customToken,
                user: userData,
                profile: profileData,
                instructions: 'Gunakan customToken untuk sign in dengan Firebase Client SDK dan dapatkan ID token'
            }
        }).code(200);

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            return h.response({
                status: 'fail',
                message: 'Email tidak terdaftar'
            }).code(404);
        } else if (error.code === 'auth/invalid-email') {
            return h.response({
                status: 'fail',
                message: 'Format email tidak valid'
            }).code(400);
        }

        console.error('Login error:', error);
        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat login'
        }).code(500);
    }
};

const verifyToken = async (request, h) => {
    try {
        const { idToken } = request.payload;

        if (!idToken) {
            return h.response({
                status: 'fail',
                message: 'ID token wajib diisi'
            }).code(400);
        }

        const decodedToken = await auth.verifyIdToken(idToken);

        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const profileQuery = await db.collection('user_profiles')
            .where('user_id', '==', decodedToken.uid)
            .get();

        let userData = null;
        let profileData = null;

        if (userDoc.exists) {
            userData = userDoc.data();
        }

        if (!profileQuery.empty) {
            profileData = profileQuery.docs[0].data();
        }

        return h.response({
            status: 'success',
            message: 'Token valid',
            data: {
                tokenInfo: {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    emailVerified: decodedToken.email_verified,
                    iat: decodedToken.iat,
                    exp: decodedToken.exp
                },
                user: userData,
                profile: profileData
            }
        }).code(200);

    } catch (error) {
        if (error.code === 'auth/id-token-expired') {
            return h.response({
                status: 'fail',
                message: 'Token sudah expired'
            }).code(401);
        } else if (error.code === 'auth/id-token-revoked') {
            return h.response({
                status: 'fail',
                message: 'Token sudah dicabut'
            }).code(401);
        } else if (error.code === 'auth/argument-error') {
            return h.response({
                status: 'fail',
                message: 'Format token tidak valid'
            }).code(400);
        }

        console.error('Token verification error:', error);
        return h.response({
            status: 'fail',
            message: 'Token tidak valid'
        }).code(401);
    }
};

const logout = async (request, h) => {
    try {
        const userId = request.user.uid;

        await auth.revokeRefreshTokens(userId);

        return h.response({
            status: 'success',
            message: 'Logout berhasil, semua token telah dicabut'
        }).code(200);

    } catch (error) {
        console.error('Logout error:', error);
        return h.response({
            status: 'error',
            message: 'Terjadi kesalahan saat logout'
        }).code(500);
    }
};

module.exports = {
    register,
    login,
    verifyToken,
    logout
};