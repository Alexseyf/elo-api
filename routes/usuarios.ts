import { passwordCheck } from '../utils/passwordUtils'
import { PrismaClient, TIPO_USUARIO } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import { nativeEnum, z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"
import { Turma } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

const usuarioSchema = z.object({
  nome: z.string().min(3).max(60),
  email: z.string().email().max(40),
  senha: z.string().min(6).max(60),
  telefone: z.string().min(10).max(20),
  roles: z.array(nativeEnum(TIPO_USUARIO)).min(1)
})

router.post("/", async (req, res) => {
      const valida = usuarioSchema.safeParse(req.body)
      if (!valida.success) {
        res.status(400).json({ erro: valida.error })
        return
      }
    
      const erros = passwordCheck(valida.data.senha)
      if (erros.length > 0) {
        res.status(400).json({ erro: erros.join("; ") })
        return
      }
    
      const salt = bcrypt.genSaltSync(12)
      const hash = bcrypt.hashSync(valida.data.senha, salt)
    
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
        })
        res.status(201).json(usuario)
      } catch (error) {
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