import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

const router = Router()

router.post("/", async (req, res) => {
  const { email, senha } = req.body

  const msg = "Login ou senha incorretos"

  if (!email || !senha) {
    res.status(400).json({ erro: msg })
    return
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { email },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (usuario && bcrypt.compareSync(senha, usuario.senha)) {
      const roles = usuario.roles.map(ur => ur.role.tipo)

      const token = jwt.sign(
        {
          userLogadoId: usuario.id,
          userLogadoNome: usuario.nome,
          roles: roles,
        },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" },
      )

      // Verificar se é o primeiro acesso do usuário
      const primeiroAcesso = !usuario.senhaAlterada
      
      // Incluir status de primeiro acesso na resposta
      const resposta = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        roles: roles,
        token,
        primeiroAcesso, // Flag que indica se o usuário precisa alterar a senha
      }

      res.status(200).json(resposta)

      await prisma.log.create({
        data: {
          descricao: "Login Realizado",
          complemento: `Usuário: ${usuario.email}`,
          usuarioId: usuario.id,
        },
      })
      return
    }

    res.status(400).json({ erro: msg })
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router
