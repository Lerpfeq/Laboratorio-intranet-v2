# Instalação do Background Remover

## Opção 1: rembg (GRATUITO - Recomendado)

### Local Development:
```bash
pip install rembg[cpu] onnxruntime
```

### Render.com:
Adicione ao build command no dashboard do Render:

```bash
apt-get update && apt-get install -y python3 python3-pip && pip3 install rembg[cpu] onnxruntime && cd nextjs_space && npm install && npx prisma generate && npm run build
```

**OU** crie `requirements.txt` na raiz do projeto:

```txt
rembg==2.0.50
onnxruntime==1.16.0
```

E adicione ao build command:
```bash
pip3 install -r requirements.txt
```

### Verificar instalação:
```bash
python3 -c "import rembg; print(rembg.__version__)"
```

## Opção 2: Remove.bg API (Trial gratuito, depois pago)

**Passos:**

1. Crie conta em https://remove.bg/api
2. Pegue sua API key (50 imagens grátis/mês)
3. Adicione ao `.env.local`:

```env
REMOVE_BG_API_KEY=your_api_key_here
```

4. No Render, adicione como variável de ambiente

**Custos:**
- Free tier: 50 imagens/mês
- Pago: $0.20 por imagem (pacotes disponíveis)

## Comparação:

| Método | Custo | Velocidade | Qualidade | Recursos |
|--------|-------|------------|-----------|----------|
| **rembg** | GRATUITO | Médio (30-60s) | Boa | Precisa RAM |
| **Remove.bg** | Trial + Pago | Rápido (5-10s) | Excelente | Cloud |

## Recomendação:

- ✅ **Use rembg** se você tem servidor próprio ou Render pago (mais RAM)
- ⚠️ **Use Remove.bg** se está no Render free tier (mais confiável, menos recursos)
