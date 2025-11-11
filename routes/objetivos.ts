import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

const objetivoSchema = z.object({
  codigo: z.string().max(10),
  descricao: z.string().max(500),
  grupoId: z.number().int().positive(),
  campoExperienciaId: z.number().int().positive()
})

router.post("/", checkToken, checkRoles(["ADMIN"]), async (req, res) => {
  const valida = objetivoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: "Dados inválidos", details: valida.error })
    return
  }

  try {
    const grupo = await prisma.grupoPorCampo.findUnique({
      where: { id: valida.data.grupoId }
    })
    if (!grupo) {
      return res.status(400).json({ erro: "Grupo não encontrado" })
    }

    const campo = await prisma.camposDeExperiencia.findUnique({
      where: { id: valida.data.campoExperienciaId }
    })
    if (!campo) {
      return res.status(400).json({ erro: "Campo de experiência não encontrado" })
    }

    const existingObjetivo = await prisma.objetivo.findUnique({
      where: { codigo: valida.data.codigo }
    })
    if (existingObjetivo) {
      return res.status(400).json({ erro: "Já existe um objetivo com este código" })
    }

    const objetivo = await prisma.objetivo.create({
      data: valida.data,
      include: {
        grupo: true,
        campoExperiencia: true
      }
    })

    res.status(201).json(objetivo)
  } catch (error) {
    console.error('Erro ao criar objetivo:', error)
    res.status(400).json({ 
      erro: "Erro ao criar objetivo",
      details: error instanceof Error ? error.message : "Erro interno do servidor"
    })
  }
})

router.get("/turma/:turmaId", checkToken, async (req, res) => {
  const turmaId = Number(req.params.turmaId)
  if (isNaN(turmaId) || turmaId <= 0) {
    return res.status(400).json({ erro: "turmaId inválido" })
  }

  try {
    const objetivos = await prisma.objetivo.findMany({
      where: {
        grupo: {
          turmas: {
            some: { id: turmaId }
          }
        }
      },
      include: {
        grupo: true,
        campoExperiencia: true
      }
    })
    res.json(objetivos)
  } catch (error) {
    console.error('Erro ao buscar objetivos da turma:', error)
    res.status(500).json({ erro: "Erro ao buscar objetivos da turma" })
  }
})

router.get("/grupo-campo", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req, res) => {
  const { grupo, campo } = req.query

  if (!grupo || !campo) {
    return res.status(400).json({ 
      erro: "Parâmetros inválidos",
      details: "Os parâmetros 'grupo' e 'campo' são obrigatórios. Exemplo: /objetivos/grupo-campo?grupo=BEBES&campo=EU_OUTRO_NOS"
    })
  }

  try {
    const objetivos = await prisma.objetivo.findMany({
      where: {
        grupo: {
          nome: String(grupo) as any
        },
        campoExperiencia: {
          campoExperiencia: String(campo) as any
        }
      },
      include: {
        grupo: true,
        campoExperiencia: true
      }
    })
    res.status(200).json(objetivos)
  } catch (error) {
    console.error('Erro ao buscar objetivos por grupo e campo:', error)
    res.status(400).json({ 
      erro: "Erro ao buscar objetivos",
      details: error instanceof Error ? error.message : "Erro interno do servidor"
    })
  }
})

router.get("/", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req, res) => {
  try {
    const objetivos = await prisma.objetivo.findMany({
      include: {
        grupo: true,
        campoExperiencia: true
      }
    })
    res.status(200).json(objetivos)
  } catch (error) {
    console.error('Erro ao listar objetivos:', error)
    res.status(400).json({ 
      erro: "Erro ao listar objetivos",
      details: error instanceof Error ? error.message : "Erro interno do servidor"
    })
  }
})




export default router
