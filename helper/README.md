# IECG Helper

Pequeno daemon Node que roda **no seu PC** (IP residencial), procura videos
do YouTube sincronizados no Portal IECG que ainda nao tem audio anexado,
baixa via `yt-dlp` e faz upload pro portal — que dispara o Whisper local
e o resumo do Claude.

> **Por que rodar no PC?** YouTube bloqueia download de IPs de datacenter
> (VPS, AWS, etc) via anti-bot. Do seu PC residencial passa sem problema.

## Pre-requisitos

- Node 18+ instalado
- Internet
- Token de helper gerado pelo admin do portal

## Instalacao

```powershell
cd helper
npm install
copy .env.example .env
# edita .env com seu token e URL do portal
```

## Configuracao

Edite `.env`:

```env
PORTAL_URL=https://portal.iecg.com.br
HELPER_TOKEN=<token gerado pelo admin>
POLL_INTERVAL_MS=60000
AUDIO_BITRATE=96
MAX_PER_TICK=1
```

**Como gerar o HELPER_TOKEN no servidor:**

No `.env` do portal (na VPS), adicione:

```env
HELPER_TOKENS=abcd1234...,outro-token-se-quiser
```

Pode ser qualquer string longa, gerada com:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Multiplos tokens separados por virgula — util pra rotacionar ou
ter helpers em maquinas diferentes (uma por liderança, ex).

## Como rodar

**Loop continuo** (mais comum):
```powershell
npm start
```

A cada 60s verifica se tem video pendente. Quando acha, baixa e sobe.

**Rodar 1 vez e sair** (util pra teste ou agendar via Task Scheduler):
```powershell
npm run once
```

## Rodar automaticamente no Windows

### Opcao A — Task Scheduler

1. Abre **Agendador de Tarefas**
2. Criar Tarefa → nome: "IECG Helper"
3. Disparador: "Ao fazer logon" (ou diariamente)
4. Ação: Iniciar programa
   - Programa: `node.exe`
   - Argumentos: `index.js`
   - Iniciar em: `C:\caminho\para\portal-iecg\helper`
5. Marca "Executar com privilegios mais altos"

### Opcao B — PM2 (mais robusto)

```powershell
npm install -g pm2
pm2 start index.js --name iecg-helper
pm2 save
pm2-startup install
```

PM2 sobe sozinho no boot e reinicia se cair.

### Opcao C — Linux/macOS (systemd)

Cria `/etc/systemd/system/iecg-helper.service`:
```ini
[Unit]
Description=IECG Helper - download de audio do YouTube
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/portal-iecg/helper
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now iecg-helper
journalctl -u iecg-helper -f
```

## O que aparece no terminal

```
🤝 IECG Helper — download de audio do YouTube → portal
   portal: https://portal.iecg.com.br
   polling: 60s | max por ciclo: 1 | bitrate: 96kbps
   tmp dir: C:\Users\...\Temp\iecg-helper
   modo: loop (Ctrl+C pra sair)

[14:32:01] sem videos pendentes
[14:33:01] sem videos pendentes
[14:34:01] 2 pendente(s), processando ate 1...
▶ p9YFXRVicaw | O Fundamento Da Comunidade | Juventude Relevante | Pr...
  ↓ baixado: 41.32 MB em 28.4s
  ↑ enviado pro portal em 35.2s total ✅
[14:35:01] 1 pendente(s), processando ate 1...
▶ 5a_l30r1lr4 | O poder da comunidade | A primeira comunidade...
  ↓ baixado: 39.85 MB em 26.7s
  ↑ enviado pro portal em 33.1s total ✅
```

## Como funciona

```
[seu PC com helper rodando]
   ↓ poll a cada 60s
[Portal] GET /api/helper/youtube/pending-audios
   ↓ retorna [{ id, videoId, title, youtubeUrl, ... }]
[seu PC] yt-dlp baixa audio do YouTube (IP residencial → libera)
   ↓ MP3 ~30-50MB
[seu PC] POST /api/helper/youtube/videos/:videoId/audio (multipart)
   ↓
[Portal] salva em /var/data/iecg-audios + dispara Whisper local
   ↓
[Portal] Whisper transcreve → Claude resume → published=true → webhook
```

## Troubleshooting

**`HELPER_TOKEN obrigatório no .env`**
→ Configurou `.env`? Tem variavel `HELPER_TOKEN=<seu_token>`?

**`401 Unauthorized` ou `403 Forbidden`**
→ Token nao bate. Confere que `HELPER_TOKEN` (helper) está EXATAMENTE
   igual a um dos itens em `HELPER_TOKENS` (portal). Sem espaco extra.

**`Sign in to confirm you're not a bot`**
→ YouTube esta bloqueando seu IP residencial tambem (raro). Espera 1h
   ou usa uma extensao de browser pra baixar e sobe manual no portal.

**Upload trava em `0%`**
→ Provavelmente o multer do portal recebeu, mas o Whisper local trava.
   Olha o log do portal: `docker service logs portaliecg-stack_portaliecg-app -f`

**Memoria do PC enche**
→ Reduz `AUDIO_BITRATE=64` (arquivos menores) ou `MAX_PER_TICK=1`.

## Seguranca

- O `HELPER_TOKEN` da acesso APENAS a:
  - Listar videos pendentes (read-only)
  - Fazer upload de audio (write em 1 campo do banco)
- NAO da acesso a admin, dados de inscritos, pagamentos, etc.
- Mantenha o token secreto. Se vazar, gere outro e troca os 2 lados.
