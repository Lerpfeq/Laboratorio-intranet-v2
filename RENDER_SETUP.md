# 🚀 Configuração do Render para LERP Intranet

## Opção A: Configuração Automática (render.yaml)

O arquivo `render.yaml` na raiz do projeto já contém todas as configurações necessárias.

### Passos:

1. **Conecte o repositório GitHub ao Render**
   - Acesse: https://dashboard.render.com/
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub

2. **Render detectará automaticamente o render.yaml**
   - Branch: `main`
   - Build Command: (já configurado no render.yaml)
   - Start Command: (já configurado no render.yaml)

3. **Configure as variáveis de ambiente**
   - `DATABASE_URL` - URL do PostgreSQL
   - `NEXTAUTH_SECRET` - Segredo aleatório
   - `NEXTAUTH_URL` - URL do seu app (ex: https://seu-app.onrender.com)
   - `GOOGLE_CLIENT_ID` - OAuth Google Client ID
   - `GOOGLE_CLIENT_SECRET` - OAuth Google Client Secret
   - `EMAIL_USER` - E-mail Gmail (ex: lerpfeq@gmail.com)
   - `EMAIL_PASS` - Senha de aplicativo do Gmail (ex: vptc vfog iqma ngyz)
   - `NODE_VERSION` - Versão do Node.js (22)

4. **Deploy!**
   - Clique em "Create Web Service"
   - Aguarde o build (~5-10 minutos na primeira vez)

---

## Opção B: Configuração Manual

Se o render.yaml não funcionar, configure manualmente:

### 1. Configurações do Serviço

**Environment:** Node  
**Branch:** main  
**Root Directory:** (deixe vazio)

### 2. Build Command

```bash
apt-get update -qq && \
apt-get install -y python3 python3-pip python3-dev && \
pip3 install --no-cache-dir rembg[cpu]==2.0.50 onnxruntime==1.16.0 && \
cd nextjs_space && \
npm install && \
npx prisma generate && \
npm run build
```

### 3. Start Command

```bash
cd nextjs_space && npm start
```

### 4. Environment Variables

Adicione as mesmas variáveis da Opção A.

---

## ✅ Verificação de Sucesso

Após o deploy, verifique se o rembg está funcionando:

```bash
# Health Check
curl https://seu-app.onrender.com/api/remove-background
```

**Resposta esperada:**
```json
{
  "status": "ready",
  "method": "rembg",
  "version": "2.0.50",
  "cost": "FREE"
}
```

---

## 🐛 Troubleshooting

### Erro: "rembg not found"

**Causa:** Build command não executou corretamente

**Solução:**
1. Verifique os logs de build no Render
2. Confirme que `apt-get` e `pip3` executaram
3. Tente fazer Manual Deploy

### Erro: "Out of memory"

**Causa:** Render free tier tem limite de RAM

**Solução:**
1. Upgrade para plano pago ($7/mês)
2. OU use Remove.bg API como fallback (configure `REMOVE_BG_API_KEY`)

### Build muito lento

**Causa:** Instalação do rembg é pesada (~500MB)

**Solução:**
- Normal na primeira vez (~10 min)
- Deploys subsequentes são mais rápidos (~3-5 min)
- Render faz cache das dependências

---

## 📊 Recursos Utilizados

**Free Tier Render:**
- ✅ Build: ~5-10 minutos
- ✅ RAM: ~512MB em uso
- ✅ Processamento: 30-60s por imagem
- ⚠️ Limite: App pode dormir após inatividade

**Recomendação:**
- Para uso pessoal/acadêmico: Free tier é OK
- Para produção com múltiplos usuários: Considere plano pago

---

## 🎯 Custos

| Opção | Custo | Velocidade | Limite |
|-------|-------|------------|--------|
| **rembg (atual)** | ✅ FREE | 30-60s/imagem | Ilimitado |
| **Render Starter** | $7/mês | Mais rápido | Ilimitado |
| **Remove.bg API** | 50 grátis/mês, depois $0.20/img | 5-10s/imagem | Por crédito |

---

## 📧 Configuração de E-mail (Gmail SMTP)

### Passo 1: Gerar Senha de Aplicativo no Gmail

1. Acesse: https://myaccount.google.com/apppasswords
2. Faça login com a conta **lerpfeq@gmail.com**
3. Selecione:
   - **App:** Mail
   - **Device:** Other (custom name) → "Intranet LERP"
4. Clique em **Generate**
5. Copie a senha gerada (formato: `xxxx xxxx xxxx xxxx`)

### Passo 2: Configurar no Render

1. Acesse o dashboard do Render: https://dashboard.render.com/
2. Selecione seu Web Service
3. Vá em **Environment** → **Add Environment Variable**
4. Adicione as variáveis:

```
EMAIL_USER=lerpfeq@gmail.com
EMAIL_PASS=vptc vfog iqma ngyz
```

⚠️ **IMPORTANTE:** A senha deve ser copiada **sem espaços** ou com espaços, dependendo de como o Gmail gerou. A atual já está configurada corretamente.

### Passo 3: Testar

Após configurar, acesse:
```
https://seu-app.onrender.com/api/test-email
```

Deverá enviar um e-mail de teste para `lerpfeq@gmail.com` ou o destinatário configurado.

### Observações

- ✅ **Gmail SMTP é gratuito** até 500 e-mails/dia (mais que suficiente)
- ✅ **Funciona no Render** (não precisa de Resend ou domínio próprio)
- ✅ **E-mails chegam em qualquer endereço** (não apenas o remetente)
- ⚠️ A senha de aplicativo **não expira**, mas pode ser revogada a qualquer momento no Google

### Solução de Problemas

**Erro: "Invalid login"**
- Verifique se a senha está correta (sem espaços extras)
- Confirme que a autenticação de 2 fatores está ativa no Gmail
- Gere uma nova senha de aplicativo

**E-mails não chegam**
- Verifique a pasta de SPAM
- Confirme que `EMAIL_USER` está correto
- Teste enviando para outro e-mail
