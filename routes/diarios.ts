import { PrismaClient, DISPOSICAO, EVACUACAO, REFEICAO, TIPO_USUARIO, ITEM_PROVIDENCIA } from "@prisma/client"
import { Router, Request, Response } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"

const prisma = new PrismaClient()
const router = Router()

const periodoSonoSchema = z.object({
  horaDormiu: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  horaAcordou: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  tempoTotal: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM")
})

const itemProvidenciaSchema = z.nativeEnum(ITEM_PROVIDENCIA)

const diarioSchema = z.object({
  data: z.string().datetime(),
  observacoes: z.string().max(500),
  alunoId: z.number().int().positive(),
  disposicao: z.nativeEnum(DISPOSICAO).optional(),
  lancheManha: z.nativeEnum(REFEICAO).optional(),
  almoco: z.nativeEnum(REFEICAO).optional(),
  lancheTarde: z.nativeEnum(REFEICAO).optional(),
  leite: z.nativeEnum(REFEICAO).optional(),
  evacuacao: z.nativeEnum(EVACUACAO).optional(),
  periodosSono: z.array(periodoSonoSchema).optional(),
  itensProvidencia: z.array(itemProvidenciaSchema).optional()
})

router.post("/", async (req: Request, res: Response) => {
  const valida = diarioSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const diarioExistente = await prisma.diario.findFirst({
      where: {
        alunoId: valida.data.alunoId,
        data: new Date(valida.data.data)
      }
    })

    if (diarioExistente) {
      return res.status(400).json({ erro: "Já existe um diário para este aluno nesta data" })
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: valida.data.alunoId }
    })

    if (!aluno) {
      return res.status(404).json({ erro: "Aluno não encontrado" })
    }

    const { periodosSono, itensProvidencia, ...diarioData } = valida.data

    let itensProvidenciaIds: { id: number }[] = [];
    if (itensProvidencia && itensProvidencia.length > 0) {
      const itensEncontrados = await prisma.itemProvidencia.findMany({
        where: {
          nome: {
            in: itensProvidencia
          }
        },
        select: {
          id: true
        }
      });
      itensProvidenciaIds = itensEncontrados;
    }

    const diario = await prisma.diario.create({
      data: {
        ...diarioData,
        data: new Date(diarioData.data),
        periodosSono: periodosSono ? {
          create: periodosSono.map(periodo => ({
            horaDormiu: periodo.horaDormiu,
            horaAcordou: periodo.horaAcordou,
            tempoTotal: periodo.tempoTotal
          }))
        } : undefined,
        itensProvidencia: itensProvidenciaIds.length > 0 ? {
          create: itensProvidenciaIds.map(item => ({
            itemProvidenciaId: item.id
          }))
        } : undefined
      },
      include: {
        aluno: true,
        periodosSono: true,
        itensProvidencia: {
          include: {
            itemProvidencia: true
          }
        }
      }
    });

    res.status(201).json(diario);
  } catch (error) {
    console.error("Erro ao criar diário:", error);
    res.status(400).json({ erro: "Erro ao criar diário", detalhes: error });
  }
});

router.get("/aluno/:alunoId", async (req: Request, res: Response) => {
  try {
    const alunoId = parseInt(req.params.alunoId);
    
    if (isNaN(alunoId)) {
      return res.status(400).json({ erro: "ID de aluno inválido" });
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId }
    });

    if (!aluno) {
      return res.status(404).json({ erro: "Aluno não encontrado" });
    }

    if (req.user?.roles.includes(TIPO_USUARIO.RESPONSAVEL)) {
      const temAcesso = await prisma.responsavelAluno.findFirst({
        where: {
          alunoId,
          usuarioId: req.user.id
        }
      });

      if (!temAcesso) {
        return res.status(403).json({ 
          erro: "Acesso negado. Você não é responsável por este aluno."
        });
      }
    }

    const diarios = await prisma.diario.findMany({
      where: { alunoId },
      orderBy: { data: 'desc' },
      include: {
        periodosSono: true,
        itensProvidencia: {
          include: {
            itemProvidencia: true
          }
        }
      }
    });

    res.status(200).json(diarios);
  } catch (error) {
    console.error("Erro ao buscar diários:", error);
    res.status(400).json({ erro: "Erro ao buscar diários", detalhes: error });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const diarioId = parseInt(req.params.id);
    
    if (isNaN(diarioId)) {
      return res.status(400).json({ erro: "ID de diário inválido" });
    }

    const diario = await prisma.diario.findUnique({
      where: { id: diarioId },
      include: {
        aluno: true,
        periodosSono: true,
        itensProvidencia: {
          include: {
            itemProvidencia: true
          }
        }
      }
    });

    if (!diario) {
      return res.status(404).json({ erro: "Diário não encontrado" });
    }

    if (req.user?.roles.includes(TIPO_USUARIO.RESPONSAVEL)) {
      const temAcesso = await prisma.responsavelAluno.findFirst({
        where: {
          alunoId: diario.alunoId,
          usuarioId: req.user.id
        }
      });

      if (!temAcesso) {
        return res.status(403).json({ 
          erro: "Acesso negado. Você não é responsável por este aluno."
        });
      }
    }

    res.status(200).json(diario);
  } catch (error) {
    console.error("Erro ao buscar diário:", error);
    res.status(400).json({ erro: "Erro ao buscar diário", detalhes: error });
  }
});

export default router