const { auth } = require('../firebaseConfig');

const authStrategy = {
    name: 'firebase-auth',
    scheme: 'bearer-access-token',
    register: async (server, options) => {
        server.auth.scheme('bearer-access-token', () => {
            return {
                authenticate: async (request, h) => {
                    const authorization = request.headers.authorization;
                    
                    if (!authorization || !authorization.startsWith('Bearer ')) {
                        throw h.unauthenticated();
                    }
                    
                    const token = authorization.replace('Bearer ', '');
                    
                    try {
                        const decodedToken = await auth.verifyIdToken(token);
                        return h.authenticated({ 
                            credentials: { 
                                uid: decodedToken.uid,
                                email: decodedToken.email,
                                token: decodedToken
                            } 
                        });
                    } catch (error) {
                        console.error('Token verification failed:', error);
                        throw h.unauthenticated();
                    }
                }
            };
        });
        
        server.auth.strategy('firebase', 'bearer-access-token');
        server.auth.default('firebase');
    }
};

module.exports = authStrategy;