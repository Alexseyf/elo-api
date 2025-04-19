"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const usuarios_2 = __importDefault(require("./routes/usuarios"));
const turmas_1 = __importDefault(require("./routes/turmas"));
const alunos_1 = __importDefault(require("./routes/alunos"));
const professores_1 = __importDefault(require("./routes/professores"));
const login_1 = __importDefault(require("./routes/login"));
const recuperaSenha_1 = __importDefault(require("./routes/recuperaSenha"));
const validaSenha_1 = __importDefault(require("./routes/validaSenha"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("./swagger.json"));
const app = (0, express_1.default)();
const port = 3000;
app.use((req, res, next) => {
    next();
});
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    exposedHeaders: ['Authorization', 'Access-Control-Allow-Origin'],
}));
app.use(express_1.default.json());
app.use((req, res, next) => {
    next();
});
app.use("/usuarios", usuarios_1.default);
app.use('/usuarios', usuarios_2.default);
app.use('/turmas', turmas_1.default);
app.use('/alunos', alunos_1.default);
app.use('/professores', professores_1.default);
app.use("/login", login_1.default);
app.use("/recupera-senha", recuperaSenha_1.default);
app.use("/valida-senha", validaSenha_1.default);
app.get('/', (req, res) => {
    res.send('API - Escola Educação Infantil');
});
app.use((err, req, res, next) => {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
        error: 'Algo deu errado!',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => {
        console.log('Servidor rodando na porta 3000');
    });
}
exports.default = app;
