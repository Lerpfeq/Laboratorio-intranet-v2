# 🚀 Guia de Deployment - LERP Intranet

Este guia mostra como fazer o deployment da aplicação no **Render** com banco de dados **PostgreSQL** e controle de versão no **GitHub**.

---

## 📋 Pré-requisitos

- Conta no [Render.com](https://render.com) (grátis)
- Conta no [GitHub.com](https://github.com) (grátis)
- Conta no [Google Cloud Console](https://console.cloud.google.com) (para Google OAuth)
- Git instalado localmente

---

## 1️⃣ Criar Repositório no GitHub

### Opção A: Se você já tem Git configurado localmente

```bash
# Dentro do diretório /home/ubuntu/laboratorio_intranet
cd /home/ubuntu/laboratorio_intranet

# Criar novo repositório no GitHub (via web)
# Ir em https://github.com/new
# Nome: laboratorio-intranet
# Descrição: Intranet LERP - Gestão de Reagentes e Equipamentos
# Selecionar: Public (recomendado para facilitar)
# Clicar em "Create repository"

# Adicionar remote e fazer push
git remote add origin https://github.com/seu-usuario/laboratorio-intranet.git
git branch -M main
git push -u origin main
```

**Nota:** Substitua `seu-usuario` pelo seu usuário do GitHub.

### Opção B: Primeiro push (se remote não existe)

```bash
cd /home/ubuntu/laboratorio_intranet

# Verificar remote
git remote -v

# Se não houver remote, adicionar:
git remote add origin https://github.com/seu-usuario/laboratorio-intranet.git
git push -u origin master
```

---

## 2️⃣ Configurar PostgreSQL no Render

### Criar banco de dados PostgreSQL

1. Ir para [Render Dashboard](https://dashboard.render.com)
2. Clique em **"+ New"** → **"PostgreSQL"**
3. Preencha os dados:
   - **Name:** `lerp-db` (ou similar)
   - **Database:** `lerp_intranet`
   - **User:** `postgres`
   - **Region:** Selecionar a mais próxima (ex: São Paulo = `sa-east-1`)
   - **PostgreSQL Version:** 15 ou superior
4. Clique em **"Create Database"**

### Obter a connection string

1. Na página do banco de dados, copie a **Internal Database URL** (para serviços Render)
2. Ou use a **External Database URL** (se conectar de fora)
3. Guardar esse valor — será usado depois como `DATABASE_URL`

**Formato esperado:**
```
postgresql://usuario:senha@host:5432/banco
```

---

## 3️⃣ Configurar Google OAuth

### Criar projeto e credenciais no Google Cloud Console

1. Ir para [Google Cloud Console](https://console.cloud.google.com)
2. Criar novo projeto: **"LERP Intranet"**
3. Ativar API: **Google+ API**
4. Ir para **"Credenciais"** → **"+ Criar Credenciais"** → **"ID do cliente OAuth"**
5. Escolher **"Aplicativo da Web"**
6. Adicionar **URIs autorizados:**
   - Local (desenvolvimento): `http://localhost:3000`
   - Render (produção): `https://seu-app.onrender.com`
   - URL de callback: `https://seu-app.onrender.com/api/auth/callback/google`
7. Copiar **Client ID** e **Client Secret** — serão usados depois

---

## 4️⃣ Deploy no Render

### Criar serviço Web no Render

1. Ir para [Render Dashboard](https://dashboard.render.com)
2. Clique em **"+ New"** → **"Web Service"**
3. Conectar ao GitHub:
   - Clique em **"Connect Repository"**
   - Autorize a conexão com GitHub
   - Selecione `laboratorio-intranet`
4. Preencha os dados:
   - **Name:** `lerp-intranet` (ou similar)
   - **Environment:** `Node`
   - **Build Command:** `cd nextjs_space && yarn install && yarn prisma generate && yarn build`
   - **Start Command:** `cd nextjs_space && yarn start`
   - **Region:** Selecionar a mesma do BD (ex: São Paulo)
   - **Plan:** Free (ou superior se necessário)

### Configurar variáveis de ambiente

Antes de fazer deploy, clique em **"Environment"** e adicione:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
NEXTAUTH_SECRET=gere-uma-chave-aleatoria-segura-aqui
NEXTAUTH_URL=https://seu-app.onrender.com
GOOGLE_CLIENT_ID=seu-client-id-do-google
GOOGLE_CLIENT_SECRET=seu-client-secret-do-google
NODE_ENV=production
```

**Como gerar `NEXTAUTH_SECRET`:**
```bash
openssl rand -base64 32
```

5. Clique em **"Create Web Service"**

---

## 5️⃣ Após o Deploy

### Executar migrations no Render

1. Ir para o serviço no Render
2. Ir em **"Shell"** → **"Connect"**
3. Executar:
   ```bash
   cd nextjs_space
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Verificar o deployment

1. Render fornecerá uma URL (ex: `https://lerp-intranet.onrender.com`)
2. Acessar a URL e testar login
3. Credenciais de teste:
   - Email: `john@doe.com`
   - Senha: `johndoe123`

---

## 🔄 Atualizar aplicação após mudanças

Quando você fazer mudanças no código:

```bash
# No seu computador local
cd /home/ubuntu/laboratorio_intranet

# Fazer commit e push
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

**Render detectará automaticamente** o novo push e refará o build e deploy.

---

## 📊 Monitorar logs

1. Dashboard Render → Clique no seu serviço
2. Aba **"Logs"** para ver erros e informações
3. Aba **"Events"** para histórico de deploys

---

## ⚠️ Troubleshooting

### Erro: "DATABASE_URL not set"
- Verificar se `DATABASE_URL` está configurada em **Environment**
- Reiniciar o serviço após adicionar variáveis

### Erro: "Connection refused" para banco de dados
- Usar `Internal Database URL` (não External) se ambos estão no Render
- Aguardar alguns minutos pelo banco de dados estar pronto

### Erro: "Build failed"
- Verificar logs: `yarn build` pode ter erros
- Verificar se o `package.json` está correto
- Executar localmente: `cd nextjs_space && yarn install && yarn build`

### Erro de Google OAuth
- Verificar se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos
- Verificar se `NEXTAUTH_URL` bate com a URL do Render
- Verificar se URLs autorizadas no Google Cloud Console incluem a URL do Render

---

## 🎯 URLs importantes

| Serviço | URL |
|---------|-----|
| GitHub | https://github.com/seu-usuario/laboratorio-intranet |
| Render App | https://seu-app.onrender.com |
| Render Dashboard | https://dashboard.render.com |
| Google Cloud Console | https://console.cloud.google.com |

---

## ✅ Checklist Final

- [ ] Repositório criado no GitHub
- [ ] PostgreSQL criado no Render
- [ ] Google OAuth configurado
- [ ] Web Service criado no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas no Render
- [ ] Login testado com credenciais de teste
- [ ] Google OAuth testado
- [ ] Funcionalidades de reagentes testadas

---

**Precisa de ajuda?** Consulte o suporte do Render ou do GitHub.
