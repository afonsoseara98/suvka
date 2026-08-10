# Launch Blockers

Auditoria de produção do commit `0286bb8`. Nada foi corrigido nesta passagem — a lista
primeiro, as correções depois, por ordem de criticidade.

Cada ponto foi verificado por leitura do código ou por execução contra um build de produção
real (`NODE_ENV=production`, `next start`), não contra o `next dev`. Onde não consegui
verificar, está escrito que não consegui.

---

## Checklist

### 🔴 Segurança

| | Item | Evidência |
|---|---|---|
| ✅ | `/benchmark` bloqueado em produção | `HTTP 404` contra `next start` |
| ✅ | `/preview` só expõe o fluxo real | `/preview`, `/preview/[id]` e `/preview/restaurant` dão 404; só `/preview/d/[draftId]` fica aberto, que é o fluxo |
| ✅ | Nenhum endpoint de desenvolvimento acessível | 22 rotas de API enumeradas; as 4 de benchmark exigem sessão |
| ✅ | Sem secrets hardcoded | `git grep` no código e `git log -p --all` em todo o histórico: só marcadores `sk_live_...` na documentação |
| ❌ | Sem chaves de teste em produção | **Nada verifica.** Uma `sk_test_` num `.env.production` arranca na mesma e só falha ao primeiro pagamento |
| ❌ | Rate limiting em todos os endpoints públicos | **`/api/auth/signup` e o login não têm nenhum** — BLOCKER #1 |
| ⚠️ | Upload protegido | Whitelist de tipos, 10 MB, máximo 6, nome aleatório, `remove()` recusa separadores. Só o `Content-Type` declarado pelo cliente é que não é verificado contra os bytes |

### 🔴 Configuração

| | Item | Evidência |
|---|---|---|
| ❌ | Variáveis validadas no arranque | **Não existe validação nenhuma.** Sem `instrumentation.ts`, sem esquema — BLOCKER #2 |
| ❌ | Falta uma `ENV` → falha imediata | O processo arranca, o healthcheck passa, e a falha aparece ao cliente |
| ✅ | Sem referências a `localhost` | Zero fora dos testes |
| ❌ | URLs construídas a partir de `APP_URL` | O Stripe usa `new URL(request.url).origin` — BLOCKER #3 |

### 🔴 Persistência

| | Item | Evidência |
|---|---|---|
| ✅ | Drafts sobrevivem a restart | `PrismaDraftStore` em produção; TTL de 24 h a contar da última visita |
| ✅ | Uploads sobrevivem a restart | `/srv/noctra-uploads`, fora do repositório (corrigido em `0286bb8`) |
| ⚠️ | Backup da BD | Script escrito, cron documentado, **nunca correu numa máquina real** |
| ⚠️ | Backup das fotografias | Idem. E as órfãs nunca são apagadas — BLOCKER #4 |

### 🔴 Stripe

| | Item | Evidência |
|---|---|---|
| ⚠️ | Checkout live | Código correto e agnóstico do modo. Nunca correu com chaves live |
| ⚠️ | Webhook live | Assinatura verificada sobre o corpo em bruto, 503 sem segredo, 500 para o Stripe repetir. **Nunca recebeu um evento real** — BLOCKER #5 |
| ✅ | Trial de 30 dias | `trialEndFor` transporta o que resta em vez de recomeçar; com testes |
| ✅ | Cancelamento | Tratado, e mantém a data até ao fim do período pago |
| ✅ | Renovação | `customer.subscription.updated` tratado |
| ⚠️ | Estado sincronizado | O webhook é o único que escreve ✓. Mas sem guarda de ordem/idempotência, e **o estado é mostrado e nunca aplicado** — BLOCKER #6 |

### 🔴 Produção

| | Item | Evidência |
|---|---|---|
| ✅ | Build limpa | `tsc` ✓ `eslint` ✓ `next build` ✓ · 878 testes, 68 ficheiros |
| ✅ | `next start` | Verificado |
| ✅ | Healthcheck | `/api/health` → `{"ok":true}`, faz `SELECT 1` |
| ✅ | Logs | `journald` (`SyslogIdentifier=noctra`) + Caddy em JSON |
| ✅ | Restart automático | `Restart=always`, `RestartSec=3`, `WantedBy=multi-user.target` |
| ⚠️ | HTTPS | Caddy trata dos certificados sozinho. Sem CSP nem `X-Frame-Options` explícitos |

---

## BLOCKER #1 — Autenticação sem qualquer limite de tentativas

**Descrição.** `/api/auth/signup` e o `authorize()` do provider de credenciais não passam por
nenhum limitador. Existe infraestrutura de rate limiting no projeto e está aplicada aos
draft, às fotografias e aos eventos — os dois endpoints que tocam em passwords são
precisamente os que ficaram de fora.

**Impacto.** Dois, e o segundo é o pior:

1. Tentativas de password ilimitadas contra contas de restaurantes reais. Sem atraso, sem
   bloqueio, sem sinal de que aconteceu.
2. **Fica sem CPU.** Medido nesta máquina: `bcrypt.compare` com cost 12 demora **439 ms**.
   São **2,3 tentativas por segundo a saturar um vCPU** — e um vCPU de CX22 é mais lento que
   este. Um atacante a 20 pedidos por segundo, que é um portátil e um `for`, pede dez vezes
   mais CPU do que a máquina tem. O Postgres e o Caddy estão no mesmo sítio, portanto o que
   cai não é o login: são **todos os sites publicados dos restaurantes**, ao mesmo tempo.

O `bcrypt` a 12 é a escolha certa. O que falta é o que impede alguém de o chamar à vontade.

**Como reproduzir.** Contra o domínio público, 50 pedidos POST a
`/api/auth/callback/credentials` com uma password errada, ou a `/api/auth/signup` com emails
diferentes. Nenhum é recusado. Ver a carga da máquina subir durante.

**Correção.** `getRateLimiter` nos dois, com chave por endereço **e** por email (só por
endereço não trava quem distribui; só por email deixa passar a enumeração de contas). Algo
como 10/min por endereço e 5/min por email. Resposta 429 com `Retry-After`.

**Estado.** 🔴 Aberto — bloqueia a beta.

---

## BLOCKER #2 — Nenhuma variável de ambiente é validada no arranque

**Descrição.** Não há `instrumentation.ts` nem esquema de validação. Cada variável é lida no
momento em que faz falta, com `?.trim()` e um caminho alternativo silencioso.

**Impacto.** Um `.env.production` incompleto ou com um erro de escrita produz um servidor que
arranca, que diz `==> Online`, que **passa no healthcheck** — e que falha no primeiro momento
que interessa. `STRIPE_PRICE_ID` errado dá 500 quando o dono carrega em "Ativar subscrição".
`PEXELS_API_KEY` em falta dá sites sem fotografias. `AUTH_SECRET` em falta invalida as
sessões todas.

Isto é o que mais provavelmente corre mal no primeiro deploy, e é o que dá menos sinal
quando corre.

**Como reproduzir.** Tirar `STRIPE_PRICE_ID` do `.env.production` e reiniciar. O serviço fica
`active`, o healthcheck sai 0, e a página de pagamento diz "ainda não estão configurados" a
um cliente.

**Correção.** Um `instrumentation.ts` que, com `NODE_ENV=production`, verifica as obrigatórias
(`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `PEXELS_API_KEY`) e recusa arrancar com a lista do
que falta. As de Stripe são degradáveis por opção — mas se `STRIPE_SECRET_KEY` existir, então
`STRIPE_PRICE_ID` e `STRIPE_WEBHOOK_SECRET` passam a obrigatórias, porque metade da
configuração de pagamentos é pior do que nenhuma. E recusar `sk_test_` em produção, o que
fecha também a linha ❌ da secção de Segurança.

**Estado.** 🔴 Aberto — bloqueia a beta.

---

## BLOCKER #3 — As URLs de retorno do Stripe vêm do pedido, não da configuração

**Descrição.** `app/api/stripe/checkout/route.ts:44` faz
`const origin = new URL(request.url).origin` e constrói dali o `success_url` e o `cancel_url`.

**Impacto.** Atrás do Caddy, o Node é contactado em `http://127.0.0.1:3000`. Se o `origin`
reconstruído não apanhar o `X-Forwarded-Proto`, o cliente é devolvido do pagamento para um
endereço `http://`. Resolve-se sozinho — o Caddy redireciona para HTTPS — mas o momento em
que isso acontece é o segundo a seguir a alguém pagar 19 €, e é o pior momento do produto
para uma volta a mais pelo texto simples.

Não consegui determinar por leitura se o Next 16 honra o `X-Forwarded-Proto` aqui. Isso é
precisamente a razão para não depender disso.

**Como reproduzir.** Só em produção: abrir o checkout e ler o `success_url` no painel do
Stripe.

**Correção.** `APP_URL` no ambiente, obrigatória em produção (entra no #2), e as duas URLs
construídas a partir dela.

**Estado.** 🟠 Aberto — não bloqueia a beta, mas é meia hora.

---

## BLOCKER #4 — As fotografias de drafts abandonados nunca são apagadas

**Descrição.** O `PrismaDraftStore` limpa os drafts com mais de 24 h com um `deleteMany`. Isso
apaga a linha. Os ficheiros que o draft tinha em `/srv/noctra-uploads` ficam. Só o `DELETE`
explícito de `/api/restaurant/photos` chama `photoStore.remove`.

**Impacto.** Fuga de disco permanente. Cada pré-visualização abandonada em que alguém tenha
carregado fotografias deixa até 6 × 10 MB para sempre. E o disco que enche é o mesmo que
guarda as fotografias dos restaurantes que pagam — a única coisa aqui que não se gera outra
vez.

Com dez restaurantes é irrelevante. Com tráfego real e sem ninguém a olhar, é o disco cheio
daqui a uns meses, e o sintoma será uploads a falhar sem razão aparente.

**Como reproduzir.** Criar um draft, carregar uma fotografia, não publicar, esperar 24 h,
tocar em qualquer rota que faça a limpeza. A linha desaparece; o ficheiro está lá.

**Correção.** Ler as galerias antes do `deleteMany` e apagar os ficheiros com prefixo
`/uploads/`. Atenção ao publicar: as fotografias de um draft publicado passam a pertencer ao
`publishedState` do projeto e **não** podem ser apagadas com o draft.

**Estado.** 🟠 Aberto — não bloqueia a beta.

---

## BLOCKER #5 — O webhook do Stripe nunca recebeu um evento real

**Descrição.** Está implementado e, por leitura, está certo: assinatura verificada sobre o
corpo em bruto, 503 enquanto não houver segredo, 400 se a assinatura falhar, 500 para o
Stripe repetir, `updateMany` para um cliente desconhecido ser um não-evento em vez de um
erro eterno. Nada disto foi alguma vez exercido por um evento verdadeiro — por instrução,
e continua por fazer.

**Impacto.** É o único sítio do produto que escreve o estado da subscrição. Se falhar, o
pagamento acontece na mesma no Stripe e o produto nunca fica a saber: o dono paga 19 € e o
painel continua a dizer-lhe que está em período gratuito. É a pior combinação possível —
cobrado e sem reconhecimento.

Falta ainda uma guarda de ordem: o Stripe não garante a sequência, e dois eventos trocados
deixam o estado a refletir o mais antigo.

**Como reproduzir.** `stripe listen --forward-to localhost:3000/api/stripe/webhook` e
`stripe trigger checkout.session.completed`. Ou, depois do deploy, em
**Developers → Webhooks → Attempts**.

**Correção.** Testar com o Stripe CLI antes de abrir a qualquer pessoa. Comparar o
`created` do evento contra o que está guardado antes de escrever.

**Estado.** 🔴 Aberto — bloqueia o lançamento público. Para a beta, é aceitável **desde que
verifique o painel do Stripe depois do primeiro pagamento a sério**.

---

## BLOCKER #6 — O fim do período gratuito não tem consequência nenhuma

**Descrição.** `billingStateFor` é chamado num único sítio: `/api/billing`, que alimenta o
painel. O site publicado em `/s/[slug]` nunca consulta o estado da subscrição. Não há envio
de emails em lado nenhum do projeto — nada avisa que o mês gratuito está a acabar.

**Impacto.** Trinta dias depois, o site do restaurante continua online, ninguém foi avisado,
e nada volta a perguntar. Quem não pagar fica exatamente na mesma situação de quem pagou.

Isto não é um defeito técnico — é o modelo de negócio a não estar ligado ao produto. E não é
óbvio qual é a correção certa: cortar o site de um restaurante ao trigésimo primeiro dia é
uma decisão comercial, não uma decisão de engenharia, e é sua.

**Como reproduzir.** Pôr o `trialStartedAt` de uma conta 31 dias atrás. O painel diz "período
terminado". O site continua a servir normalmente.

**Correção.** Decisão sua primeiro. A versão mínima honesta: avisar aos 23, aos 28 e ao 30.º
dia, e depois disso mostrar um aviso ao dono — sem tocar no site público, que é do
restaurante e não nosso.

**Estado.** 🔴 Aberto — bloqueia o lançamento público. Não bloqueia a beta: numa beta privada
não quer cortar nada a ninguém.

---

## BLOCKER #7 — Não há recuperação de password

**Descrição.** Nem fluxo de recuperação, nem envio de email, nem sequer um endereço para onde
escrever.

**Impacto.** Um dono de restaurante que se esqueça da password perde o acesso ao próprio
website, definitivamente, e não tem como o dizer a ninguém.

**Como reproduzir.** Esquecer a password.

**Correção.** Um fluxo por email. Numa beta privada, o contorno é você repor à mão na base de
dados — mas isso só funciona porque conhece as pessoas todas pelo nome.

**Estado.** 🔴 Aberto — bloqueia o lançamento público. Não bloqueia a beta.

---

## Parecer

**READY FOR BETA: NO**

Falta pouco, e o pouco é concreto: **#1 e #2**. Nada mais na lista impede uma beta privada.

O #1 é o que me faz dizer NO em vez de "quase". No momento em que o domínio ficar público,
qualquer pessoa consegue derrubar a máquina inteira com um `for` de vinte linhas — e a
máquina inteira são os sites de todos os restaurantes que confiaram em nós. Não é um risco
teórico com um custo medido em reputação: são 439 ms de CPU por pedido, medidos, contra dois
vCPUs partilhados.

O #2 é o oposto — não é perigoso, é apenas o erro mais provável do primeiro deploy, e o mais
silencioso. Uma tarde de trabalho para os dois.

Resolvidos esses, a beta pode arrancar com #3 a #7 abertos e conhecidos, desde que aceite
três coisas explicitamente: que o webhook será verificado à mão no painel do Stripe depois do
primeiro pagamento; que ninguém será cobrado nem cortado automaticamente; e que uma password
esquecida é um telefonema para si.

**READY FOR PUBLIC LAUNCH: NO**

Faltam **#5, #6 e #7**, e nenhum deles é uma questão de horas.

O que separa a beta do lançamento público não é código — é que na beta você conhece as dez
pessoas e pode compensar à mão tudo o que falta. Num lançamento público não pode, e o
produto ainda não sabe cobrar sozinho, avisar sozinho, nem devolver o acesso a quem o perdeu.

E ainda há uma coisa que nenhuma auditoria resolve: **nada disto correu alguma vez numa
máquina a sério.** O primeiro `./deploy/deploy.sh` continua a ser o primeiro teste real.
