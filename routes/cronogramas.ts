import { PrismaClient, TIPO_EVENTO } from "@prisma/client"
import { Router, Request, Response } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"
import normalizarData from "../utils/normalizaData"

const prisma = new PrismaClient()
const router = Router()

const cronogramaSchema = z.object({
  titulo: z.string().max(100),
  descricao: z.string().max(500),
  data: z.string().datetime(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  tipoEvento: z.nativeEnum(TIPO_EVENTO),
  isAtivo: z.boolean().default(true),
  criadorId: z.number().int().positive()
})

const cronogramaPatchSchema = z.object({
  titulo: z.string().max(100).optional(),
  descricao: z.string().max(500).optional(),
  data: z.string().datetime().optional(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM").optional(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM").optional(),
  tipoEvento: z.nativeEnum(TIPO_EVENTO).optional(),
  isAtivo: z.boolean().optional(),
  criadorId: z.number().int().positive().optional()
})

// Rota para cadastrar um novo evento/cronograma
router.post("/", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  const valida = cronogramaSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const dataFormatada = normalizarData(valida.data.data);

    const cronograma = await prisma.cronograma.create({
      data: {
        ...valida.data,
        data: new Date(dataFormatada)
      }
    })

    return res.status(201).json(cronograma)
  } catch (error) {
    console.error("Erro ao criar cronograma:", error)
    return res.status(500).json({ erro: "Erro ao criar cronograma" })
  }
})

// Rota para listar todo o cronograma
router.get("/", checkToken, async (req: Request, res: Response) => {
  try {
    const { data, tipoEvento, isAtivo } = req.query;

    let filtro: any = {};
    
    if (data) {
      const dataFormatada = normalizarData(data as string);
      filtro.data = new Date(dataFormatada);
    }
    
    if (tipoEvento) {
      filtro.tipoEvento = tipoEvento;
    }
    
    if (isAtivo !== undefined) {
      filtro.isAtivo = isAtivo === 'true';
    }

    const cronogramas = await prisma.cronograma.findMany({
      where: filtro,
      include: {
        criador: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: {
        data: 'asc'
      }
    })

    return res.status(200).json(cronogramas)
  } catch (error) {
    console.error("Erro ao listar cronogramas:", error)
    return res.status(500).json({ erro: "Erro ao listar cronogramas" })
  }
})

// Rota para buscar um evento/cronograma por ID
router.get("/:id", checkToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    
    const cronograma = await prisma.cronograma.findUnique({
      where: { id },
      include: {
        criador: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    })

    if (!cronograma) {
      return res.status(404).json({ erro: "Cronograma não encontrado" })
    }

    return res.status(200).json(cronograma)
  } catch (error) {
    console.error("Erro ao buscar cronograma:", error)
    return res.status(500).json({ erro: "Erro ao buscar cronograma" })
  }
})

// Rota para atualizar um cronograma
router.put("/:id", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  const valida = cronogramaSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const id = parseInt(req.params.id)
    const dataFormatada = normalizarData(valida.data.data);
    
    const cronogramaExistente = await prisma.cronograma.findUnique({
      where: { id }
    })

    if (!cronogramaExistente) {
      return res.status(404).json({ erro: "Cronograma não encontrado" })
    }

    const cronograma = await prisma.cronograma.update({
      where: { id },
      data: {
        ...valida.data,
        data: new Date(dataFormatada)
      }
    })

    return res.status(200).json(cronograma)
  } catch (error) {
    console.error("Erro ao atualizar cronograma:", error)
    return res.status(500).json({ erro: "Erro ao atualizar cronograma" })
  }
})

// Rota para atualização parcial de um evento/cronograma
router.patch("/:id", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  const valida = cronogramaPatchSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const id = parseInt(req.params.id)

    const cronogramaExistente = await prisma.cronograma.findUnique({
      where: { id }
    })

    if (!cronogramaExistente) {
      return res.status(404).json({ erro: "Cronograma não encontrado" })
    }

    let dadosAtualizacao: any = { ...valida.data };
    
    if (valida.data.data) {
      const dataFormatada = normalizarData(valida.data.data);
      dadosAtualizacao.data = new Date(dataFormatada);
    }

    const cronograma = await prisma.cronograma.update({
      where: { id },
      data: dadosAtualizacao
    })

    return res.status(200).json(cronograma)
  } catch (error) {
    console.error("Erro ao atualizar cronograma:", error)
    return res.status(500).json({ erro: "Erro ao atualizar parcialmente o cronograma" })
  }
})

// Rota para desativar um evento/cronograma
router.delete("/:id", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)

    const cronogramaExistente = await prisma.cronograma.findUnique({
      where: { id }
    })

    if (!cronogramaExistente) {
      return res.status(404).json({ erro: "Cronograma não encontrado" })
    }

    const cronograma = await prisma.cronograma.update({
      where: { id },
      data: {
        isAtivo: false
      }
    })

    return res.status(200).json({ mensagem: "Cronograma desativado com sucesso" })
  } catch (error) {
    console.error("Erro ao desativar cronograma:", error)
    return res.status(500).json({ erro: "Erro ao desativar cronograma" })
  }
})

export default router
