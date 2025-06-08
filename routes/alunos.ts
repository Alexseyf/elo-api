import { PrismaClient, TIPO_USUARIO } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"
import normalizarData from "../utils/normalizaData"

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

router.get("/:alunoId/possui-registro-diario", async (req, res) => {
  try {
    const alunoId = parseInt(req.params.alunoId)
    
    if (isNaN(alunoId)) {
      return res.status(400).json({ erro: "ID de aluno inválido" })
    }
    
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId }
    })

    if (!aluno) {
      return res.status(404).json({ erro: "Aluno não encontrado" })
    }

    const dataConsulta = req.query.data ? req.query.data.toString() : new Date().toISOString()
    const dataFormatada = normalizarData(dataConsulta)
    const dataInicio = new Date(`${dataFormatada}T00:00:00.000Z`)
    const dataFim = new Date(`${dataFormatada}T23:59:59.999Z`)
    
    const diario = await prisma.diario.findFirst({
      where: { 
        alunoId,
        data: {
          gte: dataInicio,
          lte: dataFim
        }
      }
    })

    res.status(200).json({ 
      alunoId, 
      data: dataFormatada,
      temDiario: !!diario,
      diario: diario ? { id: diario.id } : null
    })
  } catch (error) {
    console.error("Erro ao verificar diário:", error)
    res.status(400).json({ erro: "Erro ao verificar diário", detalhes: error })
  }
})

router.get("/ativos", checkToken, checkRoles([TIPO_USUARIO.ADMIN]), async (req, res) => {
  try {
    const alunosAtivos = await prisma.aluno.findMany({
      where: {
        isAtivo: true
      },
      include: {
        turma: true,
        responsaveis: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    })
    
    res.status(200).json(alunosAtivos)
  } catch (error) {
    console.error("Erro ao buscar alunos ativos:", error)
    res.status(500).json({ erro: "Erro ao buscar alunos ativos" })
  }
})

router.get("/:id", checkToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    if (isNaN(id)) {
      return res.status(400).json({ erro: "ID de aluno inválido" })
    }
    
    const aluno = await prisma.aluno.findUnique({
      where: { id },
      include: {
        turma: true,
        responsaveis: {
          include: {
            usuario: true
          }
        },
        diario: {
          orderBy: {
            data: 'desc'
          },
          include: {
            periodosSono: true,
            itensProvidencia: {
              include: {
                itemProvidencia: true
              }
            }
          }
        }
      }
    })

    if (!aluno) {
      return res.status(404).json({ erro: "Aluno não encontrado" })
    }

    res.status(200).json(aluno)
  } catch (error) {
    console.error("Erro ao buscar informações do aluno:", error)
    res.status(500).json({ erro: "Erro ao buscar informações do aluno", detalhes: error })
  }
})

export default router