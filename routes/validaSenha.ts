import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { passwordCheck } from "../utils/passwordUtils";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/", async (req, res) => {
  const { email, code, novaSenha } = req.body;

  if (!email || !code || !novaSenha) {
    return res.status(400).json({
      erro: "Todos os campos devem ser informados",
      codigo: "CAMPOS_OBRIGATORIOS",
    });
  }

  const erros = passwordCheck(novaSenha);
  if (erros.length > 0) {
    return res.status(400).json({
      erro: erros.join("; "),
      codigo: "VALIDACAO_SENHA",
    });
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      email,
    },
  });

  if (usuario) {
    const isSamePassword = await bcrypt.compare(novaSenha, usuario.senha);

    if (!usuario.resetToken) {
      return res.status(400).json({
        erro: "Código inválido ou expirado",
        codigo: "CODIGO_INVALIDO",
      });
    }

    if (isSamePassword) {
      return res.status(400).json({
        erro: "A nova senha deve ser diferente da senha atual",
        codigo: "SENHA_IGUAL",
      });
    }

    const isCodeValid = await bcrypt.compare(code, usuario.resetToken);
    const isTokenExpired = usuario.resetTokenExpires
      ? new Date() > usuario.resetTokenExpires
      : true;

    if (!isCodeValid || isTokenExpired) {
      return res.status(400).json({
        erro: "Código inválido ou expirado",
        codigo: "CODIGO_INVALIDO",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(novaSenha, saltRounds);

    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        senha: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return res.status(200).json({
      mensagem: "Senha alterada com sucesso",
    });
  }
  return res.status(404).json({
    erro: "Email não encontrado",
    codigo: "EMAIL_NAO_ENCONTRADO",
  });
});

export default router;
