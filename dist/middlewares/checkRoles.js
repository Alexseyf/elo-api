"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoles = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const checkRoles = (allowedRoles) => {
    return (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return res.status(401).json({ erro: "Token não fornecido" });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_KEY);
            const hasRequiredRole = decoded.roles.some(role => allowedRoles.includes(role));
            if (!hasRequiredRole) {
                return res.status(403).json({
                    erro: "Acesso negado. Você não tem permissão para acessar este recurso."
                });
            }
            req.user = {
                id: decoded.userLogadoId,
                nome: decoded.userLogadoNome,
                roles: decoded.roles
            };
            next();
        }
        catch (error) {
            return res.status(401).json({ erro: "Token inválido" });
        }
    };
};
exports.checkRoles = checkRoles;
