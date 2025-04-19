import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

const alunoSchema = z.object({
  nome: z.string().min(3).max(60),
  dataNasc: z.string().datetime(),
  turmaId: z.number().int().positive(),
  isAtivo: z.boolean().optional()
})

router.post("/", async (req, res) => {
  const valida = alunoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const aluno = await prisma.aluno.create({
      data: {
        ...valida.data,
        dataNasc: new Date(valida.data.dataNasc)
      }
    })
    res.status(201).json(aluno)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      include: {
        turma: true,
        responsaveis: {
          include: {
            usuario: true
          }
        }
      }
    })
    res.status(200).json(alunos)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post("/:usuarioId/responsavel", async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.usuarioId)
    
    if (isNaN(usuarioId)) {
      return res.status(400).json({ erro: "ID de usuário inválido" })
    }
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const isResponsavel = usuario.roles.some(ur => ur.role.tipo === "RESPONSAVEL")
    if (!isResponsavel) {
      return res.status(400).json({ erro: "O usuário deve ter a role RESPONSAVEL" })
    }

    if (!req.body.alunoId) {
      return res.status(400).json({ erro: "O ID do aluno é obrigatório" })
    }

    const responsavelAluno = await prisma.responsavelAluno.create({
      data: {
        alunoId: req.body.alunoId,
        usuarioId
      }
    })
    res.status(201).json(responsavelAluno)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router