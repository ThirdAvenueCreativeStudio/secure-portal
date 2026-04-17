"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const documents_1 = __importDefault(require("./routes/documents"));
const applications_1 = __importDefault(require("./routes/applications"));
const officer_1 = __importDefault(require("./routes/officer"));
const admin_1 = __importDefault(require("./routes/admin"));
const bankadmin_1 = __importDefault(require("./routes/bankadmin"));
const errorHandler_1 = require("./middleware/errorHandler");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Sentry = __importStar(require("@sentry/node"));
dotenv_1.default.config({ path: '../../.env.local' });
// Sentry error monitoring
if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Global rate limit — 100 requests per minute per IP
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
});
// Strict limit for upload endpoint — 20 per 10 min per IP
const uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: { error: 'Too many uploads, please try again later.' },
});
// Officer doc view limit — 60 per hour per IP (prevents bulk exfiltration)
const viewLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: { error: 'Too many document views, please try again later.' },
});
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(globalLimiter);
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/documents/upload', uploadLimiter);
app.use('/api/v1/officer/documents', viewLimiter);
app.use('/api/v1/documents', documents_1.default);
app.use('/api/v1/applications', applications_1.default);
app.use('/api/v1/officer', officer_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use('/api/v1/bank-admin', bankadmin_1.default);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use(errorHandler_1.notFound);
if (process.env.SENTRY_DSN)
    Sentry.setupExpressErrorHandler(app);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => console.log('API running on port ' + PORT));
