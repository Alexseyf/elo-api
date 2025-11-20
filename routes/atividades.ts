import { PrismaClient, TIPO_USUARIO, CAMPO_EXPERIENCIA, SEMESTRE } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"
import { checkToken } from "../middlewares/checkToken"
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

const atividadeSchema = z.object({
  ano: z.number().int().positive(),
  periodo: z.nativeEnum(SEMESTRE),
  quantHora: z.number().int().positive(),
  descricao: z.string().min(1).max(500),
  data: z.string().datetime(),
  turmaId: z.number().int().positive(),
  campoExperiencia: z.nativeEnum(CAMPO_EXPERIENCIA),
  objetivoId: z.number().int().positive(),
  isAtivo: z.boolean().optional()
})

router.post("/", checkToken, checkRoles([TIPO_USUARIO.PROFESSOR]), async (req, res) => {
  const valida = atividadeSchema.safeParse(req.body)
  
  if (!valida.success) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error })
  }

  try {
    const professor = await prisma.usuario.findUnique({
      where: { id: req.user?.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!professor) {
      return res.status(404).json({ erro: "Professor não encontrado" })
    }

    const isProfessor = professor.roles.some(ur => ur.role.tipo === "PROFESSOR")
    if (!isProfessor) {
      return res.status(403).json({ erro: "Acesso negado. Apenas professores podem cadastrar atividades" })
    }

    const turma = await prisma.turma.findUnique({
      where: { id: valida.data.turmaId }
    })

    if (!turma) {
      return res.status(404).json({ erro: "Turma não encontrada" })
    }

    const objetivo = await prisma.objetivo.findUnique({
      where: { id: valida.data.objetivoId }
    })

    if (!objetivo) {
      return res.status(404).json({ erro: "Objetivo não encontrado" })
    }

    const atividade = await prisma.atividade.create({
      data: {
        ...valida.data,
        data: new Date(valida.data.data),
        professorId: req.user!.id,
        isAtivo: valida.data.isAtivo !== undefined ? valida.data.isAtivo : true
      },
      include: {
        professor: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        turma: {
          select: {
            id: true,
            nome: true
          }
        },
        objetivo: {
          select: {
            id: true,
            codigo: true,
            descricao: true
          }
        }
      }
    })

    return res.status(201).json({
      mensagem: "Atividade cadastrada com sucesso",
      atividade
    })
  } catch (error) {
    console.error("Erro ao cadastrar atividade:", error)
    return res.status(500).json({
      erro: "Erro ao cadastrar atividade",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
})

router.get("/", checkToken, checkRoles([TIPO_USUARIO.ADMIN]), async (req, res) => {
  try {
    const atividades = await prisma.atividade.findMany({
      select: {
        id: true,
        ano: true,
        periodo: true,
        quantHora: true,
        data: true,
        campoExperiencia: true,
        turma: {
          select: {
            id: true,
            nome: true
          }
        }
      },
      orderBy: {
        data: 'desc'
      }
    })

    return res.status(200).json({
      total: atividades.length,
      atividades
    })
  } catch (error) {
    console.error("Erro ao listar atividades:", error)
    return res.status(500).json({
      erro: "Erro ao listar atividades",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
})

router.get("/:id", checkToken, checkRoles([TIPO_USUARIO.ADMIN]), async (req, res) => {
  try {
    const atividadeId = parseInt(req.params.id)

    if (isNaN(atividadeId)) {
      return res.status(400).json({ erro: "ID de atividade inválido" })
    }

    const atividade = await prisma.atividade.findUnique({
      where: { id: atividadeId },
      include: {
        professor: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true
          }
        },
        turma: {
          select: {
            id: true,
            nome: true
          }
        },
        objetivo: {
          select: {
            id: true,
            codigo: true,
            descricao: true
          }
        }
      }
    })

    if (!atividade) {
      return res.status(404).json({ erro: "Atividade não encontrada" })
    }

    return res.status(200).json(atividade)
  } catch (error) {
    console.error("Erro ao buscar atividade:", error)
    return res.status(500).json({
      erro: "Erro ao buscar atividade",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
})

export default router
