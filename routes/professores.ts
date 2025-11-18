import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

router.get("/:professorId/turmas", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req, res) => {
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

router.delete("/:professorId/turma/:turmaId", async (req, res) => {
  try {
    const professorId = parseInt(req.params.professorId);
    const turmaId = parseInt(req.params.turmaId);

    if (isNaN(professorId) || isNaN(turmaId)) {
      return res.status(400).json({ 
        erro: "IDs inválidos", 
        detalhes: "Os IDs do professor e da turma devem ser números" 
      });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: professorId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Professor não encontrado" });
    }

    const isProfessor = usuario.roles.some(ur => ur.role.tipo === "PROFESSOR");
    if (!isProfessor) {
      return res.status(400).json({ erro: "O usuário não tem a role PROFESSOR" });
    }

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turma) {
      return res.status(404).json({ erro: "Turma não encontrada" });
    }

    const professorTurma = await prisma.professorTurma.findFirst({
      where: {
        usuarioId: professorId,
        turmaId: turmaId
      }
    });

    if (!professorTurma) {
      return res.status(404).json({ 
        erro: "Vínculo não encontrado", 
        detalhes: "O professor não está vinculado a esta turma" 
      });
    }

    await prisma.professorTurma.delete({
      where: {
        id: professorTurma.id
      }
    });

    return res.status(200).json({ 
      mensagem: "Professor desvinculado da turma com sucesso",
      professor: {
        id: usuario.id,
        nome: usuario.nome
      },
      turma: {
        id: turma.id,
        nome: turma.nome
      }
    });

  } catch (error) {
    console.error("Erro ao desvincular professor da turma:", error);
    return res.status(500).json({ 
      erro: "Erro ao desvincular professor da turma", 
      detalhes: error instanceof Error ? error.message : "Erro desconhecido" 
    });
  }
});

export default router