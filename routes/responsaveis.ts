import { PrismaClient, TIPO_USUARIO } from "@prisma/client"
import { Router } from "express"
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

router.get("/:responsavelId/alunos", checkToken, async (req, res) => {
  try {
    const responsavelId = parseInt(req.params.responsavelId)
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: responsavelId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!usuario) {
      return res.status(404).json({ erro: "Responsável não encontrado" })
    }

    const isResponsavel = usuario.roles.some(ur => ur.role.tipo === "RESPONSAVEL")
    if (!isResponsavel) {
      return res.status(400).json({ erro: "O usuário deve ter a role RESPONSAVEL" })
    }

    const alunosDoResponsavel = await prisma.responsavelAluno.findMany({
      where: {
        usuarioId: responsavelId
      },
      include: {
        aluno: {
          include: {
            turma: true
          }
        }
      }
    })

    const alunos = alunosDoResponsavel.map(ra => ra.aluno)
    
    res.status(200).json(alunos)
  } catch (error) {
    console.error("Erro ao buscar alunos do responsável:", error)
    res.status(500).json({ erro: "Erro ao buscar alunos do responsável" })
  }
})

router.get("/meus-alunos", checkToken, checkRoles([TIPO_USUARIO.RESPONSAVEL]), async (req, res) => {
  try {
    const responsavelId = req.user?.id

    if (!responsavelId) {
      return res.status(401).json({ erro: "Usuário não autenticado corretamente" })
    }

    const alunosDoResponsavel = await prisma.responsavelAluno.findMany({
      where: {
        usuarioId: responsavelId
      },
      include: {
        aluno: {
          include: {
            turma: true
          }
        }
      }
    })

    const alunos = alunosDoResponsavel.map(ra => ra.aluno)
    
    res.status(200).json(alunos)
  } catch (error) {
    console.error("Erro ao buscar alunos do responsável logado:", error)
    res.status(500).json({ erro: "Erro ao buscar alunos do responsável logado" })
  }
})

export default router
