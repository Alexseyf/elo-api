import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

router.get("/:professorId/turmas",  async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(req.params.professorId) },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!usuario) {
      return res.status(404).json({ erro: "Professor não encontrado" })
    }

    const isProfessor = usuario.roles.some(ur => ur.role.tipo === "PROFESSOR")
    if (!isProfessor) {
      return res.status(400).json({ erro: "O usuário deve ter a role PROFESSOR" })
    }

    const turmas = await prisma.professorTurma.findMany({
      where: {
        usuarioId: parseInt(req.params.professorId)
      },
      include: {
        turma: {
          include: {
            alunos: true
          }
        }
      }
    })

    res.status(200).json(turmas.map(pt => pt.turma))
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/professor-turma", async (req, res) => {
  try {
    const professores = await prisma.usuario.findMany({
      where: {
        roles: {
          some: {
            role: {
              tipo: "PROFESSOR"
            }
          }
        },
        isAtivo: true
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        turmasLecionadas: {
          include: {
            turma: true
          }
        }
      }
    });

    const professoresComTurmas = professores.map(professor => ({
      id: professor.id,
      nome: professor.nome,
      email: professor.email,
      telefone: professor.telefone,
      turmas: professor.turmasLecionadas.map(pt => ({
        id: pt.turma.id,
        nome: pt.turma.nome
      }))
    }));

    res.status(200).json(professoresComTurmas);
  } catch (error) {
    console.error("Erro ao buscar professores e turmas:", error);
    res.status(500).json({ 
      erro: "Erro ao buscar professores e turmas", 
      detalhes: error instanceof Error ? error.message : "Erro desconhecido" 
    });
  }
});

export default router