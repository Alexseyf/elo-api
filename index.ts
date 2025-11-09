import express from 'express'
import routesUsuarios from './routes/usuarios'
import usuariosRouter from './routes/usuarios'
import turmasRouter from './routes/turmas'
import alunosRouter from './routes/alunos'
import professoresRouter from './routes/professores'
import responsaveisRouter from './routes/responsaveis'
import diariosRouter from './routes/diarios'
import cronogramasRouter from './routes/cronogramas'
import eventosRouter from './routes/eventos'
import routesLogin from './routes/login'
import routesRecuperaSenha from './routes/recuperaSenha'
import routesValidaSenha from './routes/validaSenha'
import campos from './routes/campos'
import objetivosRouter from './routes/objetivos'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import swaggerDocs from './swagger.json'

const app = express()
const port = 3000

app.use((req, res, next) => {
  next()
})

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs))

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'], 
  exposedHeaders: ['Authorization', 'Access-Control-Allow-Origin'],
}))

app.use(express.json())

app.use((req, res, next) => {
  next()
})

app.use("/usuarios", routesUsuarios)
app.use('/usuarios', usuariosRouter)
app.use('/turmas', turmasRouter)
app.use('/alunos', alunosRouter)
app.use('/professores', professoresRouter)
app.use('/responsaveis', responsaveisRouter)
app.use('/diarios', diariosRouter)
app.use('/cronogramas', cronogramasRouter)
app.use('/eventos', eventosRouter)
app.use('/objetivos', objetivosRouter)
app.use("/login", routesLogin)
app.use("/recupera-senha", routesRecuperaSenha)
app.use("/valida-senha", routesValidaSenha)
app.use("/", routesValidaSenha)
app.use("/campos", campos)

app.get('/', (req, res) => {
  res.send('API - Escola Educação Infantil')
})


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  console.error('Stack:', err.stack)
  res.status(500).json({ 
    error: 'Algo deu errado!',
    details: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})


if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000')
  })
}

export default app