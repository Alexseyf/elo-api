"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificaAdmin = verificaAdmin;
const client_1 = require("@prisma/client");
function verificaAdmin(req, res, next) {
    if (req.tipoUsuario !== client_1.TIPO_USUARIO.ADMIN) {
        return res.status(403).json({ erro: "Acesso negado. Apenas administradores podem acessar." });
    }
    next();
}
