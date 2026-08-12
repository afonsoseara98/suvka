# Auditoria de fricção

Onde o dono hesita, e onde o cliente dele desiste. Não é uma lista de defeitos — o
`LAUNCH_BLOCKERS.md` é essa. Isto é o percurso percorrido de ponta a ponta, a olhar para
o ecrã.

**Como foi medido.** Contra um build de produção (`next start`), com o fluxo público real:
`POST /api/restaurant/draft` sem sessão, o formulário preenchido no browser, a
pré-visualização aberta, e o botão de publicar carregado. Os tempos são desta máquina,
sem o Caddy pelo meio. Onde não consegui medir, está escrito que não consegui.

**O caminho que escolhi é o provável, não o completo.** Preenchi o que o formulário pede e
**não abri** a secção "Mais informações — opcional". É o que faz um dono de 55 anos com
vinte minutos: preenche o que lhe pedem e carrega no botão. Metade do que se segue só
aparece nesse caminho.

---

## O percurso do dono

| Passo | O que acontece | Tempo |
|---|---|---|
| Abre `/new/restaurant` | Formulário, sem conta e sem cartão | imediato |
| Preenche | 25 campos, 11 no caminho mínimo, nenhum obrigatório marcado | o grosso do tempo |
| "Criar o meu site" | Site gerado, com fotografias | **0,12 – 0,57 s** |
| Pré-visualização | O site num telemóvel a sério, com o botão de publicar | **0,07 – 0,39 s** |
| "Publicar este site" | Pede email, password e endereço | — |
| Site no ar | | não medido — exige conta |

A geração não é o problema. **Meio segundo**, e é determinística: não há chamada a modelo
nenhum, os campos *são* o conteúdo. A promessa de "menos de 2 minutos" da homepage é
verdadeira, e o que a consome é o dono a escrever, não a máquina a pensar.

### O que está bem feito, e vale a pena não estragar

- **Os exemplos nos campos são reais.** `Bacalhau à Braga`, `Rua das Flores 112, Porto`,
  `Terça a domingo 12:00–15:00`. Não são `Introduza o nome`. O dono lê e percebe o que se
  espera dele sem ler instrução nenhuma.
- **"Estilo" está traduzido para uma sala.** `Rústico → pedra, madeira, tasca de aldeia`.
  Um dono de restaurante não sabe se a casa dele é "moderna" ou "rústica" — sabe como é a
  sala dele. Isto é a diferença entre uma pergunta que ele responde e uma em que hesita.
- **Sem conta para ver o resultado.** O paywall está no publicar, não no ver. É a decisão
  de produto mais importante deste fluxo e está do lado certo.
- **A pré-visualização de telemóvel é um telemóvel a sério** (um iframe, com o seu próprio
  viewport), e não um `div` de 375px a fingir.

### Onde ele hesita

**1. O horário é uma caixa de texto livre.** É a decisão certa — obrigar a uma grelha de
sete dias com dois turnos é onde ele desiste. Mas o "Aberto agora", que é o sinal mais
valioso da página, só aparece quando o texto se consegue ler com certeza. Escrevi
*"Terça a sábado das 12h às 15h e das 19h30 às 23h. Domingo só almoços. Segunda fechado."* —
português normal, como quem escreve um aviso à porta — e o distintivo não apareceu.
Ele não sabe que existe, portanto não sabe que o perdeu.

**2. Quem salta a frase opcional fica com um hero vazio.** Sem "Uma frase sobre a casa", o
subtítulo passa a ser o tipo de cozinha com um ponto final: **"Cozinha portuguesa."** A
linha mais valiosa do site — a única que diz porque é que se vai ali e não ao lado — fica
a dizer nada. O campo é opcional e está no fim; o caminho provável salta-o.

**3. Três pratos são nove campos.** Nome, descrição e preço, três vezes. É a parte mais
pesada do formulário e a descrição é opcional em todos.

---

## O que o cliente pergunta, e o que a página responde

Testado contra uma página gerada com todos os canais preenchidos.

| Pergunta | Responde? |
|---|---|
| Onde fica? | ✅ |
| Como chego lá? | ✅ mapa a um toque |
| Qual é o horário? | ✅ como o dono o escreveu |
| Está aberto agora? | ⚠️ só depois do JavaScript, e só se o horário for legível |
| Como ligo? | ✅ `tel:` com `+351` |
| Como reservo? | ✅ e o botão diz o canal |
| Tem WhatsApp? | ✅ com a mensagem já escrita |
| Tem ementa? | ✅ |
| Quanto custa? | ✅ preços alinhados |
| Qual é o prato da casa? | ✅ os três que ele escolheu |
| Há fotografias? | ✅ |
| Tem take-away? | ✅ |
| Tem Glovo/Uber Eats? | ✅ se o dono abrir a secção opcional |
| **Tem esplanada?** | ❌ |
| **Tem estacionamento?** | ❌ |
| **Aceita cães?** | ❌ |
| **É bom para crianças?** | ❌ |
| **Aceita MB Way / multibanco?** | ❌ |
| **Vale a pena? (prova social)** | ❌ por desenho |

**11 de 19.** As oito primeiras — as que decidem se a pessoa vai — estão todas
respondidas, e bem.

As cinco que faltam não são exóticas: são as que fazem escolher **entre dois restaurantes
parecidos**. Um casal com um cão, uma família com um carrinho, alguém que só tem MB Way.
Hoje o produto não tem sítio nenhum onde o dono possa dizer que sim.

A prova social falta **por decisão**, e concordo com ela: o produto não inventa avaliações.
Mas "não inventar" e "não ter" são coisas diferentes, e o dono tem avaliações verdadeiras
no Google que este site não mostra.

---

## Corrigido nesta ronda

**Os dois ecrãs diziam ao dono o endereço errado** (`65e18cd`). O ecrã "Último passo",
onde ele escolhe o seu endereço, mostrava `.../s/adega-do-manel`. O site vive em
`/adega-do-manel` desde que passou para a raiz. O `/s/` ainda redirecciona, portanto nada
estoirava — mas é o endereço que ele escreve na ementa. No dashboard era pior: o link
apontava para o certo, o botão copiava o certo, e só o texto grande, o que se lê, dizia o
errado. Ele lia um endereço e copiava outro.

Nenhum teste apanharia isto. Apanhou-se a olhar para o ecrã.

**O botão do hero prometia reservas a quem não as tem** (`2318c4d`), e **"Como chegar"
substituía a página do restaurante pelo mapa** (`b20e590`).

---

## O que proponho a seguir

Por ordem de quanto muda, não de dificuldade.

**1. Um campo para as facilidades.** Esplanada, estacionamento, cães, crianças, MB Way.
Cinco caixas de seleção no formulário, uma linha de ícones na página. Responde a cinco das
seis perguntas em falta e é a mais barata da lista. *Que problema real resolve:* o cliente
que está a escolher entre dois sítios e vai ao que responde.

**2. Dizer ao dono quando o horário não foi entendido.** Não corrigir o texto dele — nunca —
mas mostrar-lhe, ali no formulário, `✓ Percebemos: aberto de terça a domingo` ou
`Não conseguimos ler isto, e por isso o site não vai poder dizer "Aberto agora"`. Ele
escolhe se reescreve. *Que problema real resolve:* hoje perde o sinal mais valioso da
página sem saber que ele existe.

**3. Puxar a frase sobre a casa para cima, e deixar de a chamar opcional.** Uma pergunta
concreta — *"o que é que as pessoas dizem quando saem daqui?"* — em vez de "uma frase sobre
a casa". *Que problema real resolve:* o hero de quem a salta diz "Cozinha portuguesa." e
mais nada.

**4. As avaliações do Google, se as tiver.** Não inventadas: as dele, com a ligação para a
ficha. É a única resposta honesta a "vale a pena?".

**Não proponho** mexer nos nove campos dos pratos. É o mais pesado do formulário e também é
o que constrói metade do site — cortá-lo dava um site mais rápido de fazer e mais pobre de
ler.

---

## Uma nota para quem desenvolve

`/preview/d/<id>/frame` **dá 404 em `next dev`** e 200 em produção, com o mesmo draft e a
mesma base de dados. Reproduzível, três drafts diferentes. Não afeta clientes — mas quem
trabalhar na pré-visualização localmente vê um 404 onde devia estar o site, e vai procurar
o erro no sítio errado. Não investiguei até ao fim.
