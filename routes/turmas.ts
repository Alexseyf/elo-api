import { PrismaClient, TURMA } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

const turmaSchema = z.object({
  nome: z.nativeEnum(TURMA)
})

router.post("/", async (req, res) => {
  const valida = turmaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const turma = await prisma.turma.create({
      data: valida.data
    })
    res.status(201).json(turma)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/", async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany({
      include: {
        professores: {
          include: {
            usuario: true
          }
        },
        alunos: true
      }
    })
    res.status(200).json(turmas)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post("/:usuarioId/professor", async (req, res) => {
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
    const isProfessor = usuario.roles.some(ur => ur.role.tipo === "PROFESSOR")
    if (!isProfessor) {
      return res.status(400).json({ erro: "O usuário deve ter a role PROFESSOR" })
    }
    if (!req.body.turmaId) {
      return res.status(400).json({ erro: "O ID da turma é obrigatório" })
    }

    const professorTurma = await prisma.professorTurma.create({
      data: {
        usuarioId,
        turmaId: req.body.turmaId
      }
    })
    res.status(201).json(professorTurma)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/:turmaId/alunos", async (req, res) => {
  try {
    const turma = await prisma.turma.findUnique({
      where: { id: parseInt(req.params.turmaId) },
      include: {
        alunos: {
          include: {
            responsaveis: {
              include: {
                usuario: true
              }
            }
          }
        }
      }
    })

    if (!turma) {
      return res.status(404).json({ erro: "Turma não encontrada" })
    }

    res.status(200).json(turma.alunos)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router