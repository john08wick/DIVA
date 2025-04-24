const logger = {
    info: (message, meta = {}) => {
        console.log(`[INFO] ${message}`, meta);
    },
    error: (message, meta = {}) => {
        console.error(`[ERROR] ${message}`, meta);
    },
    debug: (message, meta = {}) => {
        if (process.env.DEBUG) {
            console.debug(`[DEBUG] ${message}`, meta);
        }
    },
    warn: (message, meta = {}) => {
        console.warn(`[WARN] ${message}`, meta);
    }
};

module.exports = logger; 