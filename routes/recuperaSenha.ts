import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config();

const prisma = new PrismaClient();
const router = Router();

router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email deve ser informado");
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();

  const saltRounds = 10;
  const hashedCode = await bcrypt.hash(code, saltRounds);

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

async function enviarEmail(email: string, nome: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"ELO Escola" <${process.env.EMAIL_FROM || "noreply@eloapp.com"}>`,
    to: email,
    subject: "ELO Escola - Recuperação de senha",
    priority: "high" as const,
    headers: {
      'X-Priority': '1',
      'Importance': 'high',
      'X-MSMail-Priority': 'High',
      'X-Mailer': 'ELO App System Mailer'
    },
    text: `Olá ${nome},

Você solicitou a recuperação de senha para sua conta no ELO Escola.

Seu código de verificação é:

Código: ${code}

Este código é válido por 5 minutos. Se você não solicitou a recuperação de senha, por favor, ignore este email.

Atenciosamente,
Equipe ELO Escola`,
    html: `<h2>Olá ${nome},</h2>
    <p>Você solicitou a recuperação de senha para sua conta no ELO Escola.</p>
    <p>Seu código de verificação é:</p>
    <p><strong>Código: ${code}</strong></p>
    <p><em>Este código é válido por 5 minutos. Se você não solicitou a recuperação de senha, por favor, ignore este email.</em></p>
    <br>
    <p>Atenciosamente,<br>Equipe ELO Escola</p>`
  };

  await transporter.sendMail(mailOptions);
}

export default router;
