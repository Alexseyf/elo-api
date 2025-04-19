"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passwordUtils_1 = require("../utils/passwordUtils");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const usuarioSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(60),
    email: zod_1.z.string().email().max(40),
    senha: zod_1.z.string().min(6).max(60),
    telefone: zod_1.z.string().min(10).max(20),
    roles: zod_1.z.array((0, zod_1.nativeEnum)(client_1.TIPO_USUARIO)).min(1)
});
router.post("/", async (req, res) => {
    const valida = usuarioSchema.safeParse(req.body);
    if (!valida.success) {
        res.status(400).json({ erro: valida.error });
        return;
    }
    const erros = (0, passwordUtils_1.passwordCheck)(valida.data.senha);
    if (erros.length > 0) {
        res.status(400).json({ erro: erros.join("; ") });
        return;
    }
    const salt = bcrypt_1.default.genSaltSync(12);
    const hash = bcrypt_1.default.hashSync(valida.data.senha, salt);
    try {
        const usuario = await prisma.usuario.create({
            data: {
                nome: valida.data.nome,
                email: valida.data.email,
                senha: hash,
                telefone: valida.data.telefone,
                roles: {
                    create: valida.data.roles.map(role => ({
                        role: {
                            connectOrCreate: {
                                where: { tipo: role },
                                create: { tipo: role }
                            }
                        }
                    }))
                }
            }
        });
        res.status(201).json(usuario);
    }
    catch (error) {
        res.status(400).json(error);
    }
});
router.get("/", async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        const usuariosComRoles = usuarios.map(usuario => ({
            ...usuario,
            roles: usuario.roles.map(ur => ur.role.tipo)
        }));
        res.status(200).json(usuariosComRoles);
    }
    catch (error) {
        res.status(400).json(error);
    }
});
exports.default = router;
