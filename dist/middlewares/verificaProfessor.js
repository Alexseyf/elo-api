"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificaProfessor = verificaProfessor;
const client_1 = require("@prisma/client");
function verificaProfessor(req, res, next) {
    if (req.tipoUsuario !== client_1.TIPO_USUARIO.PROFESSOR) {
        return res.status(403).json({ erro: "Acesso negado. Apenas professores podem acessar." });
    }
    next();
}
