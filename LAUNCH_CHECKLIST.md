# Checklist de lançamento — Beta Privada

Comandos completos em [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md). Isto é a lista para
riscar, e para saber onde ficou se for interrompido.

Cada linha tem **como confirmar**, porque "instalado" e "a funcionar" não são a mesma coisa
e a diferença aparece sempre no pior momento.

---

## Infraestrutura

- [ ] **VPS criada** — Ubuntu 24.04 · `ssh root@IP` responde
- [ ] **DNS configurado** — `dig +short SEU-DOMINIO.pt` devolve o IP da VPS
- [ ] **DNS propagado** — o mesmo resultado a partir de outra rede (o telemóvel com dados móveis serve)
- [ ] **Node 22** — `node -v` diz `v22.x`
- [ ] **PostgreSQL** — `sudo -u postgres psql -c "SELECT 1"`
- [ ] **Base de dados criada** — `sudo -u postgres psql -l | grep noctra`
- [ ] **Utilizador `noctra`** existe e é dono de `/srv/noctra`
- [ ] **`/srv/noctra-uploads`** criada e pertence ao `noctra`

## Aplicação

- [ ] **Código clonado** em `/srv/noctra`
- [ ] **`.env.production`** preenchido, `chmod 600`
- [ ] **`AUTH_SECRET` novo** — gerado nesta máquina, diferente do de desenvolvimento
- [ ] **Prisma migrate** — `npx prisma migrate deploy` sem erros
- [ ] **Build** — `npm run build` termina limpo
- [ ] **systemd** — `systemctl is-active noctra` diz `active`
- [ ] **Arranca sozinho** — `sudo reboot`, e volta a responder sem ninguém tocar

## Rede

- [ ] **Caddy a servir** — `curl -I https://SEU-DOMINIO.pt` devolve 200
- [ ] **HTTPS válido** — o cadeado no browser, sem avisos
- [ ] **www redireciona** — `https://www.SEU-DOMINIO.pt` chega ao mesmo sítio
- [ ] **Healthcheck** — `./deploy/healthcheck.sh https://SEU-DOMINIO.pt` sai 0

## Stripe

- [ ] **Modo live** — as chaves começam por `sk_live_` e `pk_live_`
- [ ] **Price live** — criado com o interruptor em live; um `price_` de teste não existe aqui
- [ ] **Webhook registado** — endpoint `https://SEU-DOMINIO.pt/api/stripe/webhook`
- [ ] **Eventos subscritos** — `checkout.session.completed` e os três `customer.subscription.*`
- [ ] **`whsec_` no `.env.production`** e serviço reiniciado
- [ ] **Assinatura a ser verificada** — o painel do Stripe mostra 200 nas tentativas

## O percurso do cliente, ponta a ponta

Faça isto **como um restaurante faria**, no telemóvel, do domínio público.

- [ ] **Landing** abre e lê-se
- [ ] **Criar site** — formulário preenchido, site aparece
- [ ] **Teste upload** — uma fotografia sua aparece no site
- [ ] **Teste publicação** — o site fica num endereço público
- [ ] **Primeira conta criada**
- [ ] **Primeiro restaurante publicado**
- [ ] **Teste mobile** — o site publicado num telemóvel a sério, não no simulador
- [ ] **Teste pagamento** — "Ativar subscrição", cartão real, painel vira "Subscrição ativa"
- [ ] **Primeiro pagamento** recebido no Stripe
- [ ] **Teste cancelamento** — cancelar no Stripe, painel vira "cancelada" e **mantém a data**
- [ ] **Voltar no dia seguinte** — sessão ainda válida, site ainda online, editar funciona

## Segurança e dados

- [ ] **Backup a correr** — `crontab -l` mostra a linha; `ls /var/backups/noctra` tem ficheiros
- [ ] **Restore testado** — `./deploy/restore.sh` corrido **uma vez, hoje**, num dia calmo
- [ ] **`/benchmark` fechado** — devolve 404 em produção
- [ ] **`/preview`, `/preview/[id]`, `/preview/restaurant`** devolvem 404 em produção
- [ ] **Nenhum segredo no git** — `git log -p | grep -E "sk_live|whsec_"` não devolve nada

## Operação

- [ ] **Logs** — `journalctl -u noctra -n 50` legível; `/var/log/caddy/noctra.log` a crescer
- [ ] **Rollback testado** — `./deploy/rollback.sh` corrido uma vez, e o site voltou
- [ ] **Monitorização** — algo externo a bater em `/api/health`
- [ ] **Uptime** — UptimeRobot ou equivalente, alerta por email *(gratuito)*
- [ ] **Sentry** — *opcional*; até haver tráfego, o `journalctl` chega

---

## Antes de dar o endereço ao primeiro restaurante

Três coisas que não são infraestrutura e que decidem se isto vende:

- [ ] **A FAQ da landing continua verdadeira?** Diz *"Podemos utilizá-lo como ponto de
      partida"* sobre o site atual do restaurante — e o produto **não faz isso**. É a única
      frase claramente falsa que resta.
- [ ] **Fotografias** — os sites saem com imagens de banco. Duas tascas do mesmo estilo
      parecem-se. Peça as fotografias do próprio restaurante logo na primeira conversa.
- [ ] **Fotografias grandes** — um `IMG_4827.JPG` de 12 MB é servido tal e qual. No
      telemóvel de um cliente, com rede fraca, isso é uma página que não abre.
