import express from 'express'
import routesUsuarios from './routes/usuarios'
import usuariosRouter from './routes/usuarios'
import turmasRouter from './routes/turmas'
import alunosRouter from './routes/alunos'
import professoresRouter from './routes/professores'
import routesLogin from './routes/login'
import routesRecuperaSenha from './routes/recuperaSenha'
import routesValidaSenha from './routes/validaSenha'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import swaggerDocs from './swagger.json'
import path from 'path'

const app = express()
const port = 3000

// Configuração CORS para permitir requisições de qualquer origem
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'], 
  exposedHeaders: ['Authorization', 'Access-Control-Allow-Origin'],
  credentials: true
}))

app.use(express.json())

// Configuração do Swagger UI com mais opções
app.use('/api-docs', swaggerUi.serve)
app.get('/api-docs', swaggerUi.setup(swaggerDocs, {
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    docExpansion: 'list'
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "API Escolar - Documentação"
}))

// Garantindo que as rotas estáticas sejam servidas para o Swagger
app.use('/swagger-ui', express.static(path.join(__dirname, 'node_modules/swagger-ui-dist')))

// Definição das rotas da API
app.use("/usuarios", routesUsuarios)
app.use('/turmas', turmasRouter)
app.use('/alunos', alunosRouter)
app.use('/professores', professoresRouter)
app.use("/login", routesLogin)
app.use("/recupera-senha", routesRecuperaSenha)
app.use("/valida-senha", routesValidaSenha)

// Rota raiz
app.get('/', (req, res) => {
  res.send('API - Escola Educação Infantil')
})

// Middleware de tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  console.error('Stack:', err.stack)
  res.status(500).json({ 
    error: 'Algo deu errado!',
    details: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

// Inicialização do servidor para ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000')
  })
}

export default app