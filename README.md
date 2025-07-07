# Escola API

## Sobre o Projeto
API para gerenciamento de escola de educação infantil, desenvolvida como parte do Projeto Integrador do 4º semestre.

Esta API fornece funcionalidades para gerenciar:
- Usuários (administradores, professores, responsáveis)
- Alunos e suas mensalidades
- Turmas
- Diários de classe
- Cronogramas e eventos
- Autenticação e controle de acesso

## Tecnologias Utilizadas
- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- JSON Web Token (JWT)
- Bcrypt (criptografia de senhas)
- Swagger (documentação da API)
- Nodemailer (envio de e-mails)

## Requisitos
- Node.js (versão 16 ou superior)
- PostgreSQL
- npm ou yarn

## Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/escola_api.git
cd escola_api
```

### 2. Instale as dependências
```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
JWT_SECRET="sua_chave_secreta"
EMAIL_USER="seu_email@exemplo.com"
EMAIL_PASS="sua_senha_de_email"
EMAIL_HOST="smtp.exemplo.com"
EMAIL_PORT=587
FRONTEND_URL="http://localhost:5173"
```

### 4. Configure o banco de dados
```bash
npx prisma migrate dev
```

### 5. Inicie o servidor em modo de desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

O servidor estará disponível em: http://localhost:3000

## Documentação da API
Acesse a documentação Swagger em: http://localhost:3000/api-docs

## Scripts Disponíveis
- `npm run build` - Gera os arquivos de produção
- `npm run start` - Inicia o servidor em modo de produção
- `npm run dev` - Inicia o servidor em modo de desenvolvimento com recarga automática

## Implantação
Este projeto está configurado para implantação na Vercel. Utilize o comando:
```bash
npm run vercel-build
```
