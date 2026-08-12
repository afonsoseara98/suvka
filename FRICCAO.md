# Loss Ledger

Documento vivo. Cada descoberta entra e não sai — quando algo é corrigido, muda de estado,
não desaparece. E cada entrada responde a uma pergunta só:

> **Como pode um restaurante perder dinheiro sem perceber que a culpa foi do Suvka?**

Não é uma lista de defeitos. Um defeito que se vê é um pedido de suporte; o que este
documento persegue é o que **não deixa rasto** — o dono não reclama, não muda de produto,
não nos diz nada. Só conclui que o negócio esteve fraco, e um dia deixa de recomendar.

## As três categorias

| | | Quem paga a factura |
|---|---|---|
| **A** | **Perda de clientes** — horário errado, telefone que não liga, link partido, mapa errado | O restaurante, e nunca sabe |
| **B** | **Perda de confiança** — a pré-visualização difere do publicado, alterações desaparecem, o produto diz que está tudo bem e não está | O restaurante primeiro, nós a seguir |
| **C** | **Perda de receita do Suvka** — webhook, período gratuito, renovação | Nós |

A ordem não é acidental. Um problema de categoria A custa dinheiro ao cliente que confiou
em nós; um de categoria C custa-nos a nós. O primeiro é pior.

## Onde estas coisas aparecem

As descobertas que valeram mais não vieram de procurar bugs. Vieram destas cinco situações:

1. Um teste contradiz uma hipótese minha *(foi assim que apareceu o F-11)*.
2. Um utilizador pode interpretar mal o sistema.
3. O sistema tem razão e parece estar errado *(o F-2: a recusa era correcta e invisível)*.
4. O sistema está errado e ninguém percebe *(o F-12, encontrado a medir outra coisa)*.
5. Eu procurei no sítio errado e o defeito estava ao lado *(o F-13: fui ao dashboard e
   estava no editor, onde eu tinha assumido que estava resolvido)*.

## Sobre os números deste documento

**Medido** significa cronometrado ou lido contra um build de produção nesta máquina.
**Estimado** significa que é o meu raciocínio, e não um dado. Não converto fricção em euros:
não tenho os cobertos por serviço nem o ticket médio de nenhum destes restaurantes, e um
número inventado com duas casas decimais é pior do que nenhum, porque decide-se com ele.

O instrumento que substitui as estimativas já existe no produto e não está a ser usado:
`app/lib/events.ts` e `/api/events/funnel` contam o funil sem identificar ninguém. Com
tráfego a sério, a coluna "frequência" deixa de ser minha e passa a ser dele. **Até lá, as
frequências abaixo são categorias — "todos", "quem salta o campo", "quem escreve em
português normal" — e não percentagens.**

---

## Teste: um restaurante verdadeiro, replicado

Escolhi o **Mariscar** (R. das Flores 179, Porto), que tem site próprio, e repliquei-o no
Suvka a partir dos dados públicos dele. Depois medi o mesmo, com os mesmos instrumentos,
no site dele e no de um restaurante servido por um concorrente directo — a **Tasca
Caseira**, feita com o **Eatbu**, que é um construtor de sites para restaurantes.

| O cliente quer saber | Site próprio do Mariscar | Tasca Caseira (Eatbu) | Mariscar refeito no Suvka |
|---|---|---|---|
| Onde fica | ✅ | ✅ | ✅ |
| Mapa | ✅ | ✅ | ✅ |
| Horário | ✅ | ✅ | ✅ |
| Está aberto agora | ❌ | ❌ | ⚠️ só se o horário for legível |
| Telefone a um toque | ❌ | ✅ | ✅ |
| Como reservo | ❌ | ❌ | ✅ |
| WhatsApp | ❌ | ❌ | ✅ |
| Ementa | ❌ | ⚠️ PDF | ✅ em HTML |
| Preços | ❌ | ❌ | ✅ |
| Fotografias da comida | ❌ | ✅ | ✅ |
| Take-away / entregas | ❌ | ❌ | ✅ |
| **Formas de pagamento** | ❌ | ✅ | ❌ |
| **Avaliações** | ❌ | ✅ | ❌ |
| **Esplanada / estacionamento / animais** | ❌ | ❌ | ❌ |

**O que isto diz.** O concorrente ganha-nos em duas coisas concretas — **formas de
pagamento** e **avaliações** — e nós ganhamos-lhe em quatro: reservar, WhatsApp, ementa
legível com preços em vez de um PDF, e take-away. O PDF é a diferença mais subestimada:
um PDF no telemóvel abre noutra aplicação, não se lê, e o Google não o indexa como ementa.

E o site que o restaurante tem hoje, feito à medida, responde a **menos perguntas do que
qualquer um dos dois produtos**. É contra isso que se vende, não contra a BentoBox.

**Tempo de máquina para refazer o Mariscar inteiro: 1,4 s.** O que custa é ele escrever.

> **Não consigo cronometrar a BentoBox, a Owner nem a Popmenu.** Os três exigem criar conta
> e passar por uma demonstração comercial. O que consigo medir são os sites que produzem,
> que são públicos, com estes mesmos instrumentos — e é o que está acima.

---

## Por investigar

Por ordem de quanto custam em silêncio.

**C · O webhook do Stripe nunca recebeu um evento real** (`LAUNCH_BLOCKERS.md` #5). O dono
paga 19 €, o Stripe cobra, e o produto pode nunca ficar a saber. Cobrado e sem
reconhecimento é a pior combinação que existe.

**C · O fim do período gratuito não faz nada** (#6). Quem não paga fica igual a quem paga.

**B · Um draft expira em 24 h** a contar da última visita. Quem gera o site à noite, decide
falar com o sócio, e volta na quinta-feira, encontra-o desaparecido — e a conclusão dele é
que o produto perdeu o trabalho. **Por medir** quantos voltam depois das 24 h; o funil sabe
responder.

**B · O dashboard não diz que há alterações por publicar.** O editor passou a dizê-lo
(F-13), mas quem for confirmar ao dashboard continua a ver um `🟢 online em ...` sem
ressalva. Menor agora que o editor está honesto, mas o dashboard é onde ele vai confirmar.

**A · A pré-visualização e o publicado podem divergir?** Não verificado. A pré-visualização
desenha o draft; o site publicado desenha um retrato. Se houver um caminho em que mostrem
coisas diferentes, é categoria A e ninguém dá por ela.

---

## Aberto

### F-5 · **A** · Não há resposta a "vale a pena?"

- **Problema.** O produto não mostra prova social nenhuma. Por decisão — não inventamos
  avaliações — e concordo com a decisão.
- **Impacto.** Mas "não inventar" e "não ter" são coisas diferentes. O dono tem avaliações
  verdadeiras no Google, e o site dele não as mostra. O Eatbu mostra o TripAdvisor.
- **Solução mais simples.** As avaliações **dele**, com ligação para a ficha do Google.
  Nunca um número que nós escrevamos.
- **Prioridade.** P1.

### F-6 · **B** · Três pratos são nove campos

- **Problema.** É a parte mais pesada do formulário.
- **Impacto.** *Não medido.* Não sei onde as pessoas desistem — o funil sabe.
- **Solução.** **Nenhuma, para já.** É também o que constrói metade do site: cortá-lo dava
  um site mais rápido de fazer e mais pobre de ler. Fica aqui para ser medido, não para ser
  resolvido por instinto.
- **Prioridade.** P3 — medir primeiro.

---

## Corrigido

### F-3 · **A** · Cinco perguntas sem sítio para responder — `83e2e03`

Esplanada, estacionamento, cães, crianças, MB Way. Um cliente que já escolheu a zona e o tipo
de comida decide o resto com estas cinco — e ia ao restaurante do lado quando a nossa página
se calava. O concorrente medido na auditoria (Eatbu) já mostrava as formas de pagamento; nós
não mostrávamos nenhuma das cinco.

Cinco caixas de selecção **fora** da secção opcional, que a maioria não abre. Sem ícones: um
símbolo de cão é ruído para quem não anda à procura dele, e ilegível por um leitor de ecrã
sem uma etiqueta que já é a palavra. A ordem na página é a da decisão de quem lê — primeiro
o que decide se **pode** ir, depois o que torna a ida melhor, e o MB Way no fim porque é o
único que se resolve à saída.

Só aparece o que for verdade. A ausência não afirma nada.

### F-4 · **A** · Quem saltava a frase ficava com um hero vazio — `8bfd962`

O campo estava no fim, depois dos nove campos dos pratos, e chamava-se "opcional". Quem o
saltava ficava com o subtítulo a dizer **"Cozinha portuguesa."** e mais nada.

Subiu para antes dos pratos, e deixou de ser um pedido para passar a ser uma pergunta que ele
sabe responder: *"o que é que as pessoas dizem quando saem daqui?"*. A primeira versão era um
trabalho de copywriting entregue a quem nunca fez nenhum; a segunda é uma coisa que ele ouve
todas as semanas e repete sem pensar.

**O recurso não mudou.** Continua a ser o tipo de cozinha, e continua a ser honesto: dizer
mais sobre uma casa que não nos contou nada seria inventar. A resposta certa era tornar a
pergunta respondível, não encher o silêncio.

### F-13 · **B** · "Tudo publicado" dito a quem tinha alterações por publicar — `3ed102e`

O `pendingChanges` era estado da sessão: arrancava em `false` e só ligava com uma edição
feita naquele separador. O dono mudava o horário do Natal, fechava o separador, voltava no
dia seguinte — e o botão dizia **"Tudo publicado"**, desactivado, enquanto o site continuava
a mostrar o horário antigo aos clientes. Desactivado quer dizer que ele nem sequer podia
publicar sem fazer primeiro uma edição qualquer.

Não havia nada no ecrã a avisá-lo. Havia uma coisa a dizer-lhe o contrário — que é o que faz
disto categoria B e não A.

**Fui procurá-lo ao dashboard.** Estava no editor, onde eu tinha assumido que estava
resolvido por ter visto a mensagem *"Tem alterações por publicar"* — que existe, e só
funciona dentro da mesma sessão. A rota do editor passa a devolver o `publishedIndex` de
cada página, e o editor deixa de assumir e passa a ler.

### F-12 · **A** · "Todos os dias excepto domingo" mandava alguém a uma porta fechada — `d7826da`

O erro simétrico do F-11, e estava cá desde sempre. A palavra "excepto" não é lida por
ninguém neste módulo: "todos os dias" abria a semana inteira e o domingo ficava marcado como
**aberto**. Um cliente conduzia até lá ao domingo e encontrava a porta fechada.

**Não o encontrei a procurá-lo.** Encontrei-o a medir quantos horários reais a correcção do
F-11 ia silenciar — onze horários, três silenciados — e este continuava a falar. A minha
primeira versão da regra até o preservava, com uma excepção para "todos os dias" que tirei.

### F-1 · **B** · O formulário recusava quem não publica preços — `f335351`

Era preciso pelo menos um prato **com preço**. O Mariscar, no site dele, não publica preço
nenhum — e não é caso raro: marisqueiras vendem a peso. Para essas casas isto não era
fricção, era uma porta fechada: não chegavam a ver o produto.

O que estava errado não era faltar uma funcionalidade — era a **regra ser mais apertada do
que o produto**. O `tidyPrice` já deixava passar "sob consulta" e "ao peso", testado desde
sempre. A página sempre soube desenhar isto; só a validação é que não deixava lá chegar.

Corrigido por **remoção**: exige-se o nome, não o preço. O `Menu` deixa de desenhar a
coluna quando está vazia, como já fazia com a descrição. Verificado com os dados reais do
Mariscar, três pratos e zero preços — site gerado em 1,46 s, sem uma única coluna vazia.

### F-11 · **A** · O site dizia "fechado" a um restaurante que estava aberto — `d7826da`

- **Problema.** *"Terça a sábado das 12h às 15h e das 19h30 às 23h. **Domingo só almoços.**
  Segunda fechado."* — a excepção é descartada, e o domingo fica marcado como fechado. Ao
  domingo à hora de almoço, com o restaurante cheio, o site diz a quem o consulta que abre
  **terça-feira**.
- **Impacto.** É a pior falha que este módulo pode ter, e está escrita no cabeçalho dele:
  *"a wrong Fechado is a customer who does not call, and we never find out it happened."*
  Não é uma recusa — é uma afirmação confiante e errada. O dono nunca descobre; o cliente
  vai a outro sítio.
- **Frequência.** *Estimado:* alto. "Domingo só almoços" e "sábado só jantares" é como meia
  restauração portuguesa escreve o seu horário.
- **Decisão tomada — silêncio.** *Confidence or silence. Never confidence without certainty.*
  Toda a menção a um dia tem de estar contabilizada: ou é uma ponta do intervalo, ou é uma
  declaração de encerramento. Qualquer outra é uma instrução que não sabemos representar, e
  a partir daí o módulo cala-se por completo. Deliberadamente conservador — prefere calar-se
  de mais a acertar por sorte.
- **E o dono passa a saber porquê.** O formulário mostra-lhe a frase exacta, com os acentos e
  as maiúsculas dele: *Não conseguimos interpretar: "Domingo só almoços"*. Sem corrigir, sem
  alterar, sem sugerir uma reescrita. A frase é dele.
- **Custo medido, não estimado.** Onze horários reais: silenciam **três** — a excepção de
  meio dia, o "excepto domingo" (F-12), e o horário dia-a-dia, que já era silencioso antes.
  Os outros oito continuam a dizer o estado, incluindo o exemplo do formulário.

### F-2 · **A** · O "Aberto agora" desaparecia sem avisar — `43ad299`

O distintivo só aparece quando o horário se lê com certeza, e essa recusa é o desenho
certo. O que estava errado era ser **invisível**: o dono não sabia que o sinal existia,
portanto não sabia que o tinha perdido.

O formulário passa a dizer, enquanto ele escreve, o que percebemos — em lista de dias, não
em intervalo, para ele reconhecer um erro *nosso*. Nunca corrige o texto dele.

**E foi isto que me desmentiu.** Eu tinha escrito aqui que o horário do Mariscar perdia o
distintivo. Estava errado: procurei-o no HTML do servidor e o `OpenNow` é componente de
cliente — nunca lá está. O teste que escrevi para provar a minha versão falhou, e ao
investigar apareceu o F-11, que é pior do que aquilo que eu tinha reportado.

### F-7 · **A** · Os dois ecrãs diziam ao dono o endereço errado — `65e18cd`

O "Último passo" mostrava `.../s/adega-do-manel`; o site vive em `/adega-do-manel`. No
dashboard, o link apontava para o certo, o botão copiava o certo, e só o texto que se lê
dizia o errado. É o endereço que ele escreve na ementa. Nenhum teste apanharia isto.

### F-8 · **A** · O botão prometia reservas a quem não as tem — `2318c4d`

"Reservar mesa" com o WhatsApp por trás. Agora os três destinos dizem três nomes.

### F-9 · **A** · "Como chegar" deixava o restaurante para trás — `b20e590`

Abria o Google Maps na mesma aba. No telemóvel, a aplicação de mapas tomava conta do ecrã.

### F-10 · **A** · A mensagem do WhatsApp só ia escrita a meio — `2318c4d`

O botão do hero abria a conversa já escrita; a linha dos contactos abria-a em branco.

---

## Notas de desenvolvimento (não afectam clientes)

- `/preview/d/<id>/frame` dá **404 em `next dev` e 200 em produção**, com o mesmo draft e a
  mesma base de dados. Reproduzível com três drafts. Quem trabalhar na pré-visualização
  localmente vê um 404 onde devia estar o site. Não investiguei até ao fim.
- O formulário mostra três lugares para pratos e diz "Comece por três pratos", mas a
  validação aceita **um**. Mais permissivo do que parece, e o dono não sabe.

---

## A pergunta que fecha cada ronda

> **O que faria um restaurante dizer: "isto é melhor do que contratar um web designer"?**

Nesta ronda, a resposta veio do teste e não de mim: o Mariscar **pagou** por um site que
responde a menos perguntas do que o que o Suvka gera em 1,4 segundos a partir de nove
campos. Não tem ementa, não tem preços, não tem forma de reservar, e não diz se está
aberto.

O argumento de venda não é "mais bonito" nem "mais barato". É: **o site que já tem não
responde ao cliente que está a decidir agora.**

O F-1 fechou nesta ronda, e era ele que impedia esse restaurante em concreto de sequer
experimentar. Hoje o Mariscar entra.

---

## Uma nota sobre o KPI

> *"Esta alteração aumenta a probabilidade de um restaurante pagar 19€/mês?"*

Aplicado à letra, esse critério **nunca constrói** o #6, o #7 nem o #9 do
`LAUNCH_BLOCKERS.md` — e não é por serem técnicos:

- **#7**, sem recuperação de password, um dono que a esqueça perde o site dele para sempre.
- **#6**, o fim do período gratuito não faz nada: quem não paga fica igual a quem paga.
- **#9**, o backup nunca foi restaurado, e as fotografias são a única coisa aqui que não se
  gera outra vez.

Nenhum aumenta a probabilidade do primeiro sim. Os três decidem se o sim se mantém.

Por isso este documento usa o critério com uma segunda metade:

> *"...ou impede que um restaurante que já paga deixe de pagar, ou perca o que é dele."*
