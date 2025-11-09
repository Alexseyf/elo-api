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

export default router
