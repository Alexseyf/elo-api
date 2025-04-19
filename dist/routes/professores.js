"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
router.get("/:professorId/turmas", async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: parseInt(req.params.professorId) },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        if (!usuario) {
            return res.status(404).json({ erro: "Professor não encontrado" });
        }
        const isProfessor = usuario.roles.some(ur => ur.role.tipo === "PROFESSOR");
        if (!isProfessor) {
            return res.status(400).json({ erro: "O usuário deve ter a role PROFESSOR" });
        }
        const turmas = await prisma.professorTurma.findMany({
            where: {
                usuarioId: parseInt(req.params.professorId)
            },
            include: {
                turma: {
                    include: {
                        alunos: true
                    }
                }
            }
        });
        res.status(200).json(turmas.map(pt => pt.turma));
    }
    catch (error) {
        res.status(400).json(error);
    }
});
exports.default = router;
