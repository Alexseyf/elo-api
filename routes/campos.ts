import { PrismaClient, CAMPO_EXPERIENCIA } from "@prisma/client";
import { Router} from "express";
import { z} from "zod";
import { checkToken } from "../middlewares/checkToken";
import { checkRoles } from "../middlewares/checkRoles";

const prisma = new PrismaClient();
const router = Router();

const campoSchema = z.object({
  campoExperiencia: z.nativeEnum(CAMPO_EXPERIENCIA)
})

router.post("/campos", checkToken, checkRoles(["ADMIN"]), async (req, res) => {
    const valida = campoSchema.safeParse(req.body);
    if (!valida.success) {
        res.status(400).json({ erro: valida.error });
        return;
    }

    try {
        const campo = await prisma.camposDeExperiencia.create({
            data: valida.data
        });
        res.status(201).json(campo);
    } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/campos", checkToken, async (req, res) => {
    try {
        const campos = await prisma.camposDeExperiencia.findMany({
            orderBy: {
                id: 'asc'
            }
        });
        res.status(200).json(campos);
    } catch (error) {
        res.status(400).json(error);
    }
});

export default router