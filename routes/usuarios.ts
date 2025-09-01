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
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"ELO App" <${process.env.EMAIL_FROM || "noreply@eloapp.com"}>`,
    to: email,
    subject: "Bem-vindo(a) ao ELO - Sua senha de acesso",
    priority: "high" as const,
    headers: {
      'X-Priority': '1',
      'Importance': 'high',
      'X-MSMail-Priority': 'High',
      'X-Mailer': 'ELO App System Mailer'
    },
    text: `Olá ${nome},
    
Bem-vindo(a) ao Elo, seu app escolar!

Sua conta foi criada com sucesso. Para o seu primeiro acesso, utilize a senha temporária abaixo:

Senha: ${senhaPadrao}

Importante: Ao fazer login, você será solicitado a alterar esta senha. Por motivos de segurança, escolha uma senha forte e diferente da senha temporária.

Atenciosamente,
Equipe ELO`,
    html: `<h2>Olá ${nome},</h2>
    <p>Bem-vindo(a) ao Sistema Escolar!</p>
    <p>Sua conta foi criada com sucesso. Para o seu primeiro acesso, utilize a senha temporária abaixo:</p>
    <p><strong>Senha: ${senhaPadrao}</strong></p>
    <p><em>Importante: Ao fazer login, você será solicitado a alterar esta senha. Por motivos de segurança, escolha uma senha forte e diferente da senha temporária.</em></p>
    <p>Ela deve ter:</p>
    <ul>
      <li>8 caracteres ou mais</li>
      <li>1 letra maiúscula</li>
      <li>1 letra minúscula</li>
      <li>1 número</li>
      <li>1 caractere especial (ex: @, #, $, etc.)</li>
    </ul>
    <br>
    <p>Atenciosamente,<br>Equipe ELO</p>`
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
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: valida.data.email }
    })

    if (emailExistente) {
      return res.status(409).json({ 
        erro: "Email já cadastrado no sistema. Por favor, utilize outro email." 
      })
    }

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
        senhaAlterada: !!valida.data.senha,
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

    const { senha, ...usuarioSemSenha } = usuario
    
    if (!valida.data.senha) {
      await enviarEmailSenhaPadrao(usuario.email, usuario.nome, senhaParaUsar);
        res.status(201).json({ 
        ...usuarioSemSenha, 
        mensagem: "Usuário criado com sucesso. Uma senha temporária foi enviada para o email cadastrado." 
      });
    } else {
      res.status(201).json(usuarioSemSenha);
    }
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);

    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ 
        erro: "Email já cadastrado no sistema. Por favor, utilize outro email." 
      });
    }
    
    res.status(400).json(error);
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

router.get("/ativos", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { isAtivo: true },
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

router.get("/usuario-logado", checkToken, async (req: Request | any, res) => {
  try {
    const userId = req.userLogadoId;
    
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: userId
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const { senha, ...usuarioSemSenha } = usuario;

    const usuarioFormatado = {
      ...usuarioSemSenha,
      roles: usuario.roles.map(ur => ur.role.tipo)
    };

    res.status(200).json(usuarioFormatado);
  } catch (error) {
    console.error("Erro ao buscar usuário logado:", error);
    res.status(500).json({ erro: "Erro ao buscar dados do usuário" });
  }
});

router.get("/roles-por-email", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ erro: "Email não fornecido ou em formato inválido" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        email: email
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const roles = usuario.roles.map(ur => ur.role.tipo);

    res.status(200).json({ email: usuario.email, roles });
  } catch (error) {
    console.error("Erro ao buscar roles do usuário:", error);
    res.status(500).json({ erro: "Erro ao buscar roles do usuário" });
  }
});

export default router