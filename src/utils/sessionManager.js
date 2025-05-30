class SessionManager {
    constructor() {
        this.activeSessions = new Map();
    }

    set(token, sessionData) {
        this.activeSessions.set(token, sessionData);
    }

    get(token) {
        return this.activeSessions.get(token);
    }

    has(token) {
        return this.activeSessions.has(token);
    }

    delete(token) {
        return this.activeSessions.delete(token);
    }

    clear() {
        this.activeSessions.clear();
    }

    size() {
        return this.activeSessions.size;
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [token, sessionData] of this.activeSessions.entries()) {
            if (now - sessionData.createdAt > 25 * 60 * 60 * 1000) {
                this.activeSessions.delete(token);
            }
        }
    }
}

module.exports = new SessionManager();