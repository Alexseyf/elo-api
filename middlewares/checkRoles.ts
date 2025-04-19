import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { TIPO_USUARIO } from "@prisma/client"

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        nome: string
        roles: TIPO_USUARIO[]
      }
    }
  }
}

interface JwtPayload {
  userLogadoId: number
  userLogadoNome: string
  roles: TIPO_USUARIO[]
}

export const checkRoles = (allowedRoles: TIPO_USUARIO[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(" ")[1]

      if (!token) {
        return res.status(401).json({ erro: "Token não fornecido" })
      }

      const decoded = jwt.verify(token, process.env.JWT_KEY as string) as JwtPayload
      const hasRequiredRole = decoded.roles.some(role => allowedRoles.includes(role))

      if (!hasRequiredRole) {
        return res.status(403).json({ 
          erro: "Acesso negado. Você não tem permissão para acessar este recurso." 
        })
      }

      req.user = {
        id: decoded.userLogadoId,
        nome: decoded.userLogadoNome,
        roles: decoded.roles
      }

      next()
    } catch (error) {
      return res.status(401).json({ erro: "Token inválido" })
    }
  }
} 