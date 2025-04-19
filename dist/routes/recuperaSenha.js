"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).send("Email deve ser informado");
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const saltRounds = 10;
    const hashedCode = await bcrypt_1.default.hash(code, saltRounds);
    const usuario = await prisma.usuario.findFirst({
        where: {
            email,
        },
    });
    if (usuario) {
        await prisma.usuario.update({
            where: {
                id: usuario.id,
            },
            data: {
                resetToken: hashedCode,
                resetTokenExpires: new Date(Date.now() + 300000),
            },
        });
        await enviarEmail(email, usuario.nome, code);
        return res.status(200).send("Código de recuperação enviado para o email");
    }
});
async function enviarEmail(email, nome, code) {
    const transporter = nodemailer_1.default.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 587,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: "your-email@example.com",
        to: email,
        subject: "Recuperação de senha",
        text: `${nome}, seu código de verificação é: ${code}`,
    };
    await transporter.sendMail(mailOptions);
}
exports.default = router;
