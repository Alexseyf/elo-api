import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

router.get("/", checkToken, checkRoles(["ADMIN"]), async (req, res) => {
  try {
    const grupos = await prisma.grupoPorCampo.findMany({
      include: {
        _count: {
          select: {
            turmas: true,
            objetivos: true
          }
        }
      }
    })

    const gruposFormatados = grupos.map(grupo => ({
      id: grupo.id,
      nome: grupo.nome,
      totalTurmas: grupo._count.turmas,
      totalObjetivos: grupo._count.objetivos
    }))

    res.status(200).json(gruposFormatados)
  } catch (error) {
    console.error('Erro ao listar grupos:', error)
    res.status(400).json({ 
      erro: "Erro ao listar grupos",
      details: error instanceof Error ? error.message : "Erro interno do servidor"
    })
  }
})

export default router
