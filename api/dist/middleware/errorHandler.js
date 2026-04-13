"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFound = notFound;
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err.message, err.stack);
    if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ error: 'File too large. Maximum 20MB.' });
    if (err.type === 'entity.too.large')
        return res.status(400).json({ error: 'Request too large.' });
    return res.status(500).json({ error: 'Internal server error' });
}
function notFound(req, res) {
    res.status(404).json({ error: 'Route not found' });
}
