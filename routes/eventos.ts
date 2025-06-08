import { PrismaClient, TIPO_EVENTO } from "@prisma/client"
import { Router, Request, Response } from "express"
import { z } from 'zod'
import { checkToken } from '../middlewares/checkToken'
import { checkRoles } from "../middlewares/checkRoles"
import normalizarData from "../utils/normalizaData"

const prisma = new PrismaClient()
const router = Router()

const eventoSchema = z.object({
  titulo: z.string().max(100),
  descricao: z.string().max(500),
  data: z.string().datetime(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  tipoEvento: z.nativeEnum(TIPO_EVENTO),
  isAtivo: z.boolean().default(true),
  turmaId: z.number().int().positive(),
  criadorId: z.number().int().positive()
})

const eventoPatchSchema = z.object({
  titulo: z.string().max(100).optional(),
  descricao: z.string().max(500).optional(),
  data: z.string().datetime().optional(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM").optional(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM").optional(),
  tipoEvento: z.nativeEnum(TIPO_EVENTO).optional(),
  isAtivo: z.boolean().optional(),
  turmaId: z.number().int().positive().optional(),
  criadorId: z.number().int().positive().optional()
})

// Rota para cadastrar um novo evento
router.post("/", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  const valida = eventoSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const dataFormatada = normalizarData(valida.data.data);

    const turmaExistente = await prisma.turma.findUnique({
      where: { id: valida.data.turmaId }
    })

    if (!turmaExistente) {
      return res.status(404).json({ erro: "Turma não encontrada" })
    }

    const evento = await prisma.evento.create({
      data: {
        ...valida.data,
        data: new Date(dataFormatada)
      }
    })

    return res.status(201).json(evento)
  } catch (error) {
    console.error("Erro ao criar evento:", error)
    return res.status(500).json({ erro: "Erro ao criar evento" })
  }
})

// Rota para listar todos os eventos
router.get("/", checkToken, async (req: Request, res: Response) => {
  try {
    const { data, tipoEvento, turmaId, isAtivo } = req.query;

    let filtro: any = {};
    
    if (data) {
      const dataFormatada = normalizarData(data as string);
      filtro.data = new Date(dataFormatada);
    }
    
    if (tipoEvento) {
      filtro.tipoEvento = tipoEvento;
    }
    
    if (turmaId) {
      filtro.turmaId = parseInt(turmaId as string);
    }
    
    if (isAtivo !== undefined) {
      filtro.isAtivo = isAtivo === 'true';
    }

    const eventos = await prisma.evento.findMany({
      where: filtro,
      include: {
        turma: true,
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

    return res.status(200).json(eventos)
  } catch (error) {
    console.error("Erro ao listar eventos:", error)
    return res.status(500).json({ erro: "Erro ao listar eventos" })
  }
})

// Rota para buscar eventos por turma
router.get("/turma/:turmaId", checkToken, async (req: Request, res: Response) => {
  try {
    const turmaId = parseInt(req.params.turmaId)

    const turmaExistente = await prisma.turma.findUnique({
      where: { id: turmaId }
    })

    if (!turmaExistente) {
      return res.status(404).json({ erro: "Turma não encontrada" })
    }

    const eventos = await prisma.evento.findMany({
      where: { 
        turmaId,
        isAtivo: true
      },
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

    return res.status(200).json(eventos)
  } catch (error) {
    console.error("Erro ao buscar eventos da turma:", error)
    return res.status(500).json({ erro: "Erro ao buscar eventos da turma" })
  }
})

// Rota para buscar um evento por ID
router.get("/:id", checkToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    
    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        turma: true,
        criador: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    })

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }

    return res.status(200).json(evento)
  } catch (error) {
    console.error("Erro ao buscar evento:", error)
    return res.status(500).json({ erro: "Erro ao buscar evento" })
  }
})

// Rota para atualizar um evento
router.put("/:id", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  const valida = eventoSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const id = parseInt(req.params.id)
    const dataFormatada = normalizarData(valida.data.data);

    const eventoExistente = await prisma.evento.findUnique({
      where: { id }
    })

    if (!eventoExistente) {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }

    const turmaExistente = await prisma.turma.findUnique({
      where: { id: valida.data.turmaId }
    })

    if (!turmaExistente) {
      return res.status(404).json({ erro: "Turma não encontrada" })
    }

    const evento = await prisma.evento.update({
      where: { id },
      data: {
        ...valida.data,
        data: new Date(dataFormatada)
      }
    })

    return res.status(200).json(evento)
  } catch (error) {
    console.error("Erro ao atualizar evento:", error)
    return res.status(500).json({ erro: "Erro ao atualizar evento" })
  }
})

// Rota para atualização parcial de um evento
router.patch("/:id", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  const valida = eventoPatchSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  try {
    const id = parseInt(req.params.id)
    
    const eventoExistente = await prisma.evento.findUnique({
      where: { id }
    })

    if (!eventoExistente) {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }

    if (valida.data.turmaId) {
      const turmaExistente = await prisma.turma.findUnique({
        where: { id: valida.data.turmaId }
      })

      if (!turmaExistente) {
        return res.status(404).json({ erro: "Turma não encontrada" })
      }
    }

    let dadosAtualizacao: any = { ...valida.data };
    
    if (valida.data.data) {
      const dataFormatada = normalizarData(valida.data.data);
      dadosAtualizacao.data = new Date(dataFormatada);
    }

    const evento = await prisma.evento.update({
      where: { id },
      data: dadosAtualizacao
    })

    return res.status(200).json(evento)
  } catch (error) {
    console.error("Erro ao atualizar evento:", error)
    return res.status(500).json({ erro: "Erro ao atualizar parcialmente o evento" })
  }
})

// Rota para desativar um evento
router.delete("/:id", checkToken, checkRoles(["ADMIN", "PROFESSOR"]), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)

    const eventoExistente = await prisma.evento.findUnique({
      where: { id }
    })

    if (!eventoExistente) {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }

    const evento = await prisma.evento.update({
      where: { id },
      data: {
        isAtivo: false
      }
    })

    return res.status(200).json({ mensagem: "Evento desativado com sucesso" })
  } catch (error) {
    console.error("Erro ao desativar evento:", error)
    return res.status(500).json({ erro: "Erro ao desativar evento" })
  }
})

export default router
