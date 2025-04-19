"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificaResponsavel = verificaResponsavel;
const client_1 = require("@prisma/client");
function verificaResponsavel(req, res, next) {
    if (req.tipoUsuario !== client_1.TIPO_USUARIO.RESPONSAVEL) {
        return res.status(403).json({ erro: "Acesso negado. Apenas responsáveis podem acessar." });
    }
    next();
}
