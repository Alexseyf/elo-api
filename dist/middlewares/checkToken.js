"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkToken = checkToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function checkToken(req, res, next) {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({
            error: "Token não informado",
            // headers: req.headers
        });
    }
    const token = authorization.split(" ")[1];
    try {
        const decode = jsonwebtoken_1.default.verify(token, process.env.JWT_KEY);
        const { userLogadoId, userLogadoNome, tipoUsuario } = decode;
        req.userLogadoId = userLogadoId;
        req.userLogadoNome = userLogadoNome;
        req.tipoUsuario = tipoUsuario;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: "Token inválido",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
