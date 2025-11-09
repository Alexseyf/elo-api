import { PrismaClient, TURMA, GRUPO_POR_CAMPO } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

const getTurmaGrupo = async (turma: TURMA): Promise<number> => {
  const grupoNome = (() => {
    switch (turma) {
      case "BERCARIO2":
        return "BEBES";
      case "MATERNAL1":
      case "MATERNAL2":
        return "CRIANCAS_BEM_PEQUENAS";
      case "PRE1":
      case "PRE2":
        return "CRIANCAS_PEQUENAS";
      case "TURNOINVERSO":
        return "CRIANCAS_MAIORES";
    }
  })() as GRUPO_POR_CAMPO;

  const grupo = await prisma.grupoPorCampo.findUnique({
    where: { nome: grupoNome }
  });

  if (!grupo) {
    throw new Error(`Grupo ${grupoNome} não encontrado`);
  }

  return grupo.id;
}

const turmaSchema = z.object({
  nome: z.nativeEnum(TURMA)
})

router.post("/", checkToken, checkRoles(["ADMIN"]), async (req, res) => {
  const valida = turmaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const grupoId = await getTurmaGrupo(valida.data.nome);
    const turma = await prisma.turma.create({
      data: {
        nome: valida.data.nome,
        grupoId: grupoId
      }
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

router.get("/totalAlunosTurma", async (req, res) => {
  try {
    const turmasComTotalAlunos = await prisma.turma.findMany({
      include: {
        _count: {
          select: {
            alunos: {
              where: {
                isAtivo: true
              }
            }
          }
        }
      }
    })

    const resultado = turmasComTotalAlunos.map(turma => ({
      id: turma.id,
      nome: turma.nome,
      totalAlunosAtivos: turma._count.alunos
    }))

    res.status(200).json(resultado)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router