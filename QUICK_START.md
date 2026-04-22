# ⚡ Guia Rápido - Deploy em 5 Minutos

## 1. GitHub (5 min)
```bash
cd /home/ubuntu/laboratorio_intranet
git remote add origin https://github.com/SEU_USUARIO/laboratorio-intranet.git
git branch -M main
git push -u origin main
```

## 2. PostgreSQL no Render (2 min)
1. Ir para https://render.com
2. Clicar: **+ New** → **PostgreSQL**
3. Nome: `lerp-db`
4. Database: `lerp_intranet`
5. Copiar **Internal Database URL** ✅

## 3. Google OAuth (5 min)
1. Ir para https://console.cloud.google.com
2. Novo projeto: "LERP Intranet"
3. Ativar: **Google+ API**
4. **Credenciais** → **ID do cliente OAuth** → **Aplicativo da Web**
5. URI autorizado: `http://localhost:3000` + `https://seu-app.onrender.com`
6. Copiar **Client ID** e **Client Secret** ✅

## 4. Deploy no Render (3 min)
1. Render Dashboard → **+ New** → **Web Service**
2. Conectar repo: `laboratorio-intranet`
3. **Build Command:** `cd nextjs_space && yarn install && yarn prisma generate && yarn build`
4. **Start Command:** `cd nextjs_space && yarn start`
5. **Environment variables:**
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=gere-com-openssl-rand-base64-32
   NEXTAUTH_URL=https://seu-app.onrender.com
   GOOGLE_CLIENT_ID=seu-id
   GOOGLE_CLIENT_SECRET=seu-secret
   NODE_ENV=production
   ```
6. Deploy! ✅

## 5. Pós-Deploy (1 min)
No **Shell** do Render:
```bash
cd nextjs_space
npx prisma migrate deploy
npx prisma db seed
```

---

**Credenciais de teste:**
- Email: `john@doe.com`
- Senha: `johndoe123`

**Mais detalhes?** Veja `DEPLOYMENT_GUIDE.md`
