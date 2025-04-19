import { passwordCheck, generateDefaultPassword } from '../utils/passwordUtils'
import { PrismaClient, TIPO_USUARIO } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import { nativeEnum, z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"
import { Turma } from '@prisma/client'
import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

const prisma = new PrismaClient()
const router = Router()


const usuarioSchema = z.object({
  nome: z.string().min(3).max(60),
  email: z.string().email().max(40),
  senha: z.string().min(6).max(60).optional(),
  telefone: z.string().min(10).max(20),
  roles: z.array(nativeEnum(TIPO_USUARIO)).min(1)
})


async function enviarEmailSenhaPadrao(email: string, nome: string, senhaPadrao: string) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "seu-email@exemplo.com",
    to: email,
    subject: "Bem-vindo(a) ao Sistema Escolar - Sua senha de acesso",
    text: `Olá ${nome},
    
Bem-vindo(a) ao Elo, seu app escolar!

Sua conta foi criada com sucesso. Para o seu primeiro acesso, utilize a senha temporária abaixo:

Senha: ${senhaPadrao}

Importante: Ao fazer login, você será solicitado a alterar esta senha. Por motivos de segurança, escolha uma senha forte e diferente da senha temporária.

Atenciosamente,
Equipe do Sistema Escolar`,
    html: `<h2>Olá ${nome},</h2>
    <p>Bem-vindo(a) ao Sistema Escolar!</p>
    <p>Sua conta foi criada com sucesso. Para o seu primeiro acesso, utilize a senha temporária abaixo:</p>
    <p><strong>Senha: ${senhaPadrao}</strong></p>
    <p><em>Importante: Ao fazer login, você será solicitado a alterar esta senha. Por motivos de segurança, escolha uma senha forte e diferente da senha temporária.</em></p>
    <br>
    <p>Atenciosamente,<br>Equipe do Sistema Escolar</p>`
  };

  await transporter.sendMail(mailOptions);
}

router.post("/", async (req, res) => {
  const valida = usuarioSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const senhaParaUsar = valida.data.senha || generateDefaultPassword(valida.data.email)
    
    const erros = passwordCheck(senhaParaUsar)
    if (erros.length > 0) {
      res.status(400).json({ erro: erros.join("; ") })
      return
    }
    
    const salt = bcrypt.genSaltSync(12)
    const hash = bcrypt.hashSync(senhaParaUsar, salt)
    
    const usuario = await prisma.usuario.create({
      data: {
        nome: valida.data.nome,
        email: valida.data.email,
        senha: hash,
        telefone: valida.data.telefone,
        senhaAlterada: !!valida.data.senha, // Se a senha foi fornecida, marca como alterada
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
    })

    // Remove o hash da senha da resposta
    const { senha, ...usuarioSemSenha } = usuario
    
    // Enviar senha por email se for uma senha padrão (primeiro acesso)
    if (!valida.data.senha) {
      await enviarEmailSenhaPadrao(usuario.email, usuario.nome, senhaParaUsar);
      
      res.status(201).json({ 
        ...usuarioSemSenha, 
        mensagem: "Usuário criado com sucesso. Uma senha temporária foi enviada para o email cadastrado." 
      });
    } else {
      res.status(201).json(usuarioSemSenha);
    }
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(400).json(error)
  }
})

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
    })

    const usuariosComRoles = usuarios.map(usuario => ({
      ...usuario,
      roles: usuario.roles.map(ur => ur.role.tipo)
    }))

    res.status(200).json(usuariosComRoles)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router