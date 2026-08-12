# Launch Blockers

Auditoria de produção. Cada ponto foi verificado por leitura do código ou por execução
contra um build de produção real (`NODE_ENV=production`, `next start`), não contra o
`next dev`. Onde não consegui verificar, está escrito que não consegui.

| Ronda | Commit | Veredito |
|---|---|---|
| Auditoria | `0286bb8` | READY FOR BETA: **NO** — #1 e #2 |
| Correção de #1 e #2 | `7072def` | READY FOR BETA: **YES**, com três condições |
| SEO, #3 e revisão | `47d2f3b` | READY FOR BETA: **YES**, com as mesmas três condições menos uma |

**O que mudou desde a última ronda, e não foi por código:** o site está no ar. O
`https://suvka.com` responde, com Caddy e certificado válido. Duas frases deste documento
deixaram de ser verdade — a que dizia que nada tinha corrido numa VPS, e a que tratava o
#9 como uma decisão para "o dia do deploy", que já passou.

A base de dados de produção **ainda não tem nenhum restaurante publicado** (verificado:
`/taberna-do-goncalo` dá 404 lá, e 200 aqui). É a última janela em que o ensaio de restauro
do #9 custa vinte minutos em vez de arriscar dados de um cliente.

**Aviso que não desaparece com nenhuma ronda:** "verificado" aqui significa contra um build
de produção nesta máquina. Nada disto correu ainda numa VPS. O primeiro
`./deploy/deploy.sh` continua a ser o primeiro teste a sério.

---

## Checklist

### 🔴 Segurança

| | Item | Evidência |
|---|---|---|
| ✅ | `/benchmark` bloqueado em produção | `HTTP 404` contra `next start` |
| ✅ | `/preview` só expõe o fluxo real | `/preview`, `/preview/[id]` e `/preview/restaurant` dão 404; só `/preview/d/[draftId]` fica aberto, que é o fluxo |
| ✅ | Nenhum endpoint de desenvolvimento acessível | 22 rotas de API enumeradas; as 4 de benchmark exigem sessão |
| ✅ | Sem secrets hardcoded | `git grep` no código e `git log -p --all` em todo o histórico: só marcadores `sk_live_...` na documentação |
| ✅ | Sem chaves de teste em produção | Uma `sk_test_` ou `pk_test_` com `NODE_ENV=production` recusa o arranque — **verificado**: o servidor recusou-se a arrancar com as chaves de teste do `.env.local` |
| ✅ | Rate limiting em todos os endpoints públicos | **Fechado em `7072def`** — 10/min por endereço e 10/15 min por conta no login, 5/h no signup |
| ⚠️ | Upload protegido | Whitelist de tipos, 10 MB, máximo 6, nome aleatório, `remove()` recusa separadores. Só o `Content-Type` declarado pelo cliente é que não é verificado contra os bytes |

### 🔴 Configuração

| | Item | Evidência |
|---|---|---|
| ✅ | Variáveis validadas no arranque | **Fechado em `7072def`** — `instrumentation.ts` + `app/lib/env.ts`, 22 testes |
| ✅ | Falta uma `ENV` → falha imediata | **Verificado**: `DATABASE_URL="mysql://errado"` → saída 1, e **nenhum pedido chegou a ser servido** durante o arranque |
| ✅ | Sem referências a `localhost` | Zero fora dos testes |
| ✅ | URLs construídas a partir de `APP_URL` | **Fechado** — `app/lib/appUrl.ts`, obrigatória em produção e recusa discordar da `AUTH_URL`. Usada pelo sitemap, pelo robots e pelo checkout do Stripe. A rota do checkout deixou de receber um `Request` |

### 🔴 Persistência

| | Item | Evidência |
|---|---|---|
| ✅ | Drafts sobrevivem a restart | `PrismaDraftStore` em produção; TTL de 24 h a contar da última visita |
| ✅ | Uploads sobrevivem a restart | `/srv/suvka-uploads`, fora do repositório (corrigido em `0286bb8`) |
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
| ✅ | Build limpa | `tsc` ✓ `eslint` ✓ `next build` ✓ · 907 testes, 70 ficheiros |
| ✅ | `next start` | Verificado |
| ✅ | Healthcheck | `/api/health` → `{"ok":true}`, faz `SELECT 1` |
| ✅ | Logs | `journald` (`SyslogIdentifier=suvka`) + Caddy em JSON |
| ✅ | Restart automático | `Restart=always`, `RestartSec=3`, `WantedBy=multi-user.target` |
| ⚠️ | HTTPS | Caddy trata dos certificados sozinho — **verificado em produção**, `https://suvka.com` responde 200 com certificado válido. Sem CSP nem `X-Frame-Options` explícitos |

### 🟡 SEO e desempenho

| | Item | Evidência |
|---|---|---|
| ✅ | `/sitemap.xml` | Páginas do produto + todos os sites publicados, com `lastmod` real. Estável entre pedidos |
| ✅ | `/robots.txt` | Com `Sitemap:` e `Host:`. `/s/` fica aberto de propósito, para o 308 transferir |
| ✅ | Canonical | Em todas as páginas públicas — mata a duplicação de `?fbclid=`, `?utm_*` |
| ✅ | Open Graph / Twitter | Com a fotografia do restaurante, `og:url`, `alt`, `summary_large_image` |
| ✅ | JSON-LD `Restaurant` | Com URLs absolutas (antes eram relativas e eram descartadas em silêncio) |
| ⚠️ | Core Web Vitals | Lighthouse local: homepage **97/96/100/100**, restaurante **83/100/79/100**. LCP de 4,7 s no site do restaurante — a fotografia do hero vem de `images.pexels.com` num `<img>` simples, sem `next/image`, sem WebP e sem tamanhos responsivos. **Medido em localhost, sem o Caddy pelo meio** |
| ⚠️ | Uma consulta a dobrar | `loadPublishedSite` corre duas vezes por visita (`generateMetadata` e a página). Um `cache()` do React resolve; ninguém mediu se dói |

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

**Correção aplicada** (`7072def`). `app/lib/authThrottle.ts`, chamado no `authorize` **antes**
do bcrypt e no `/api/auth/signup` antes do hash. Duas contagens: 10/min por endereço, que é
o que defende o CPU, e 10/15 min por conta, que é o que trava quem distribui os pedidos por
muitos endereços — que é como se adivinha uma password a sério. O signup fica em 5/h por
endereço. Um endereço já travado não gasta a contagem da conta, senão bastava atacar de um
sítio só para deixar o dono do restaurante de fora. 7 testes.

O erro chega ao cliente como `demasiadas_tentativas` e vira "Demasiadas tentativas. Aguarde
alguns minutos" nos dois ecrãs de login — sem isso, o dono lia "palavra-passe incorreta" e
tentava outra vez, mais depressa, contra um limite que não sabia que existia.

**Verificação** — contra `next start`, com uma conta real na base de dados para o bcrypt
correr mesmo:

```
 1..10:  ~620 ms cada   (bcrypt a correr)
 11:      105 ms        code=demasiadas_tentativas
 12:      137 ms        code=demasiadas_tentativas
 13:      123 ms        code=demasiadas_tentativas
```

O custo deixa de ser pago a partir da 11.ª. E no signup: cinco contas criadas, a 6.ª e a 7.ª
devolveram **HTTP 429**. As cinco contas de teste foram apagadas da base de dados a seguir.

**Estado.** ✅ Fechado.

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

**Correção aplicada** (`7072def`). `app/lib/env.ts` como função pura — recebe o ambiente,
devolve o que está mal — e `instrumentation.ts` a decidir morrer. 22 testes.

O Stripe é tratado como **grupo**: sem chave nenhuma o produto assume-se sem pagamentos e
diz isso ao dono; com chave e sem `price` o botão existe, é carregado, e dá 500 na cara de
quem estava a pagar. Metade da configuração é pior do que nenhuma. Isto apanha exactamente o
`STRIPE_SECRETKEY` do seu exemplo — não por reconhecer o erro de escrita, mas por dar pela
ausência do nome certo. `sk_test_`/`pk_test_` em produção também recusam: o checkout abriria,
o cartão seria aceite, e não entrava dinheiro nenhum.

`PEXELS_API_KEY` avisa em vez de matar, porque a ausência é uma configuração suportada por
desenho (`createImageProvider` devolve um herói editorial em vez de um falso).

**Duas coisas que foram medidas e não assumidas:**

1. `register()` **não corre** durante o `next build`. Um build numa máquina sem segredos
   nenhuns continua a funcionar, que é o que a CI é.
2. Um `throw` no `register()` **não mata o processo**. O Next escreve "Failed to prepare
   server", fica de pé, e responde **HTTP 500 a tudo, incluindo ao `/api/health`** — o
   systemd via um processo vivo e não reiniciava nada. Por isso é `process.exit(1)`. E por
   isso o `suvka.service` levou `StartLimitIntervalSec=60` / `StartLimitBurst=5`: sem eles,
   sair com 1 mais `Restart=always` era um ciclo infinito de reinícios a esconder no journal
   a mensagem que explica o que falta.

**Verificação** — `DATABASE_URL="mysql://errado"` contra `next start`:

```
  A configuração está incompleta e o Suvka não vai arrancar:
    DATABASE_URL: tem de começar por postgres:// ou postgresql://
SAIDA=1
```

E seis pedidos ao `/api/health` durante o arranque, de 300 em 300 ms: **nenhum foi servido**.
O `Ready` que o Next imprime é optimista, mas a porta só aceita depois do `register()` —
portanto o healthcheck do `deploy.sh` não consegue passar por engano.

**Nota sobre o Zod.** Não usei. Existe no projecto apenas como dependência transitiva do
`openai` e do `next-auth`, e promovê-la a directa para doze verificações de strings era
passar a depender a sério de algo que hoje pode desaparecer num `npm update` sem ninguém dar
por nada. As mensagens também tinham de ser nossas — quem as vai ler está a fazer um deploy
às onze da noite. Se preferir Zod na mesma, a troca é de minutos: as regras estão todas numa
função pura com testes que não mudariam.

**Estado.** ✅ Fechado.

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

**Correção aplicada.** A variável nasceu no trabalho do sitemap, que precisava exactamente
da mesma coisa — URLs absolutas que não podem vir do pedido. `app/lib/appUrl.ts`,
obrigatória em produção, verificada no arranque, e recusa-se a discordar da `AUTH_URL`
(duas variáveis que têm de dizer o mesmo e podem discordar são uma armadilha por si só).

O checkout passou a construir as duas URLs a partir dela. E **a rota deixou de receber um
`Request`**: enquanto o pedido estivesse ao alcance, havia sempre a hipótese de alguém
voltar a reconstruir o `origin` a partir dele. Sem parâmetro, não há de onde — a garantia
está na assinatura e não só nos 4 testes.

Uma varredura ao resto do código confirma que não sobrou mais nenhum sítio a derivar um
endereço do pedido: os outros `new URL(request.url)` lêem `searchParams`, e os
`x-forwarded-for` são do rate limiting, onde é o comportamento pretendido.

**O que continua por verificar.** Isto corrige o endereço para onde o Stripe devolve o
cliente. Se está certo do lado do Stripe, só se vê no painel depois do primeiro checkout a
sério — o que é o #5, não este.

**Estado.** ✅ Fechado.

---

## BLOCKER #4 — As fotografias de drafts abandonados nunca são apagadas

**Descrição.** O `PrismaDraftStore` limpa os drafts com mais de 24 h com um `deleteMany`. Isso
apaga a linha. Os ficheiros que o draft tinha em `/srv/suvka-uploads` ficam. Só o `DELETE`
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

**Política decidida** (sua, 10/08/2026). O site **nunca** é apagado nem posto offline —
suspende-se a **edição**, e mais nada:

```
dia 25  →  email: "o seu período termina em 5 dias"
dia 30  →  o Stripe tenta cobrar
           ├── sucesso  →  continua
           └── falha    →  7 dias de graça  →  suspende a EDIÇÃO
```

Concordo, e vale a pena dizer porquê: o site é do restaurante, não nosso, e desligá-lo
castiga os clientes dele por uma dívida que é nossa para com ele. Suspender a edição dói ao
dono e não dói a mais ninguém.

**Estado.** 🔴 Aberto — bloqueia o lançamento público. Não bloqueia a beta.

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

## BLOCKER #8 — Um erro em produção não chega a ninguém

**Descrição.** Os erros vão para `console.error`, que vai para o journal da máquina. Ninguém
lê um journal por iniciativa própria.

**Impacto.** Um restaurante que não consegue publicar às nove da noite fecha o separador e
não volta. Nós só damos por isso quando ele nos disser — e a maior parte não diz. Numa beta
de dez restaurantes, três desistências silenciosas são trinta por cento do produto a falhar
sem deixar rasto.

**Correção.** Sentry, BetterStack ou Axiom — qualquer um serve, e todos têm um plano
gratuito que chega para este volume. Mais um `UptimeRobot` a bater no `/api/health`, que é
gratuito e apanha a classe de falha que nenhum deles apanha: a máquina em baixo.

**Estado.** 🟠 Aberto. Não bloqueia a beta desde que fale com os dez restaurantes por
telefone; bloqueia o lançamento público, onde não há telefonemas.

---

## BLOCKER #9 — Existe backup; não existe prova de que restaura

**Descrição.** O `backup.sh` escreve os ficheiros e verifica que os arquivos abrem. O
`restore.sh` está escrito e passa no `bash -n`. Nenhum dos dois correu alguma vez numa
máquina a sério, e a diferença entre "o backup existe" e "o backup restaura" é onde vive a
única coisa insubstituível deste produto.

**Impacto.** No dia em que precisar, descobre. E o que se descobre nesse dia costuma ser
banal: uma password de Postgres que o script não pede, uma permissão errada, um `pg_dump` de
uma versão que o `psql` do lado de lá não lê.

**Correção.** Uma vez, num dia calmo, antes de haver dados de outra pessoa lá dentro:

```
criar backup  →  apagar a base de dados  →  restaurar  →  confirmar que o site volta
```

Já está no `LAUNCH_CHECKLIST.md`. O que muda aqui é a categoria: passa de linha a riscar a
blocker.

**Nota, e é sua a decisão.** Pôs isto no lançamento público. Registo a discordância uma vez e
sigo a sua chamada: na beta as fotografias já são de restaurantes reais, e são a única coisa
aqui que não se gera outra vez. Um ensaio de restauro custa vinte minutos no dia do deploy,
enquanto a base de dados ainda está vazia — que é o único momento em que sai barato.

**Actualização.** O dia do deploy passou: o site está no ar. A janela que eu descrevia como
"o único momento em que sai barato" ainda está aberta — a base de dados de produção não tem
nenhum restaurante publicado — mas fecha-se no primeiro cliente, e a partir daí o ensaio
passa a ser feito por cima de fotografias de outra pessoa.

**Estado.** 🟠 Aberto — bloqueia o lançamento público por decisão sua, e é agora o primeiro
da lista.

---

## Parecer

**READY FOR BETA: YES**

Os dois blockers que diziam NO estão fechados, e nenhum dos dois está fechado por leitura:
o travão foi exercido contra um servidor de produção com uma conta verdadeira, e a validação
foi vista a recusar arrancar. Nada mais na lista impede uma beta privada.

O YES vem com três condições, e valem por serem ditas em voz alta antes e não depois:

1. **O webhook é verificado à mão** em **Developers → Webhooks → Attempts** depois do
   primeiro pagamento a sério. Não a seguir ao primeiro cliente: a seguir ao primeiro
   pagamento.
2. **Ninguém é cobrado nem cortado automaticamente.** O fim do período gratuito não faz nada,
   por desenho, até a política do #6 estar implementada.
3. **Uma password esquecida é um telefonema para si**, e você repõe-na à mão na base de
   dados. Isto só funciona enquanto conhecer as pessoas todas pelo nome — é o número de
   restaurantes que define quando deixa de funcionar, não o calendário.

**Nesta ronda, a condição 1 fica mais barata e as outras duas não mudaram.** O #3 estava a
mandar o cliente de volta para um endereço reconstruído do pedido; agora vem da
configuração, portanto o que resta por verificar no primeiro pagamento é só se o evento
chega — não também se a pessoa aterra no sítio certo.

E acrescento uma quarta, que é nova e é do deploy, não do produto:

4. **O `APP_URL` tem de estar no `.env.production` antes do próximo deploy.** Se faltar, o
   build pára — de propósito, e antes de tocar no site que está online. Se estiver errado, o
   sitemap e os canonicals apontam para o domínio errado e isso não dá erro nenhum.

**READY FOR PUBLIC LAUNCH: NO**

Faltam **#5, #6, #7, #8 e #9**, e nenhum é uma questão de horas.

O que separa a beta do lançamento público não é código: é que na beta você conhece as dez
pessoas e compensa à mão tudo o que falta. Num lançamento público não pode, e o produto
ainda não sabe cobrar sozinho, avisar sozinho, devolver o acesso a quem o perdeu, nem
sequer dizer-lhe que alguma coisa correu mal.

**A ordem que eu seguiria a seguir**, e é a ordem do risco, não a da dificuldade: ~~#3~~
(fechado) → #9 (restauro ensaiado, enquanto a base de dados ainda tem pouca coisa) → #8
(observabilidade, meia hora) → #5 (webhook, que agora já tem domínio) → #7 (recuperação de
password) → #6 (política de fim do período) → #4 (fotografias órfãs).

O #9 mudou de urgência desde que isto foi escrito: o site está no ar, e a janela em que um
ensaio de restauro custava vinte minutos porque a base de dados estava vazia está a
fechar-se sozinha.
