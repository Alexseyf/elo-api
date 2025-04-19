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

export default router;
