# Fricção

Documento vivo. Cada descoberta entra e não sai — quando algo é corrigido, muda de estado,
não desaparece. A pergunta que decide se uma entrada pertence aqui é sempre a mesma:

> **Como é que isto aumenta reservas, ou faz um restaurante escolher o Suvka?**

Uma entrada que não responda a isso não é fricção — é gosto pessoal, e não entra.

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

## Aberto

### F-11 · O site diz "fechado" a um restaurante que está aberto

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
- **Estado.** Fixado num teste marcado `DEFEITO CONHECIDO`, para que a correcção o tenha de
  mudar de propósito.
- **Solução, e a decisão está por tomar.** Duas saídas, e não é minha:
  1. **Silêncio** — ao ver uma excepção que não sabe representar, o parser recusa-se a
    dizer o estado nesse dia. Perde-se o distintivo, não se perde o cliente.
  2. **Representar o dia parcial** — mais trabalho, e mais superfície onde errar.
  Recomendo a 1: é a que segue a regra que o módulo já tem escrita.
- **Como medimos.** Não conseguimos, e é esse o problema — um "Fechado" errado não deixa
  rasto nenhum. É argumento para a 1.
- **Prioridade.** P0.

### F-3 · Cinco perguntas sem sítio para responder

- **Problema.** Esplanada, estacionamento, animais, crianças, MB Way. O produto não tem
  campo nenhum onde o dono possa dizer que sim.
- **Impacto.** São as perguntas que decidem **entre dois restaurantes parecidos** — um
  casal com um cão, uma família com carrinho, alguém que só tem MB Way. O concorrente
  Eatbu já mostra as formas de pagamento.
- **Frequência.** *Estimado:* todos os restaurantes, todos os dias.
- **Solução mais simples.** Cinco caixas de selecção no formulário, uma linha de ícones na
  página. Nada de campo livre — o objectivo é uma resposta de sim/não que o cliente lê num
  segundo.
- **Prioridade.** P0. É a mais barata da lista e responde a cinco das seis em falta.

### F-4 · Quem salta a frase opcional fica com um hero vazio

- **Problema.** Sem "Uma frase sobre a casa", o subtítulo é o tipo de cozinha com um ponto:
  **"Cozinha portuguesa."** Verificado outra vez na réplica do Mariscar.
- **Impacto.** A linha mais valiosa do site — a única que diz porque é que se vai ali e não
  ao lado — fica a dizer nada.
- **Frequência.** *Estimado:* alto. O campo é opcional, está no fim, e chama-se "opcional".
- **Solução mais simples.** Subir o campo e trocar o rótulo por uma pergunta concreta:
  *"o que é que as pessoas dizem quando saem daqui?"*. Deixar de lhe chamar opcional.
- **Prioridade.** P1.

### F-5 · Não há resposta a "vale a pena?"

- **Problema.** O produto não mostra prova social nenhuma. Por decisão — não inventamos
  avaliações — e concordo com a decisão.
- **Impacto.** Mas "não inventar" e "não ter" são coisas diferentes. O dono tem avaliações
  verdadeiras no Google, e o site dele não as mostra. O Eatbu mostra o TripAdvisor.
- **Solução mais simples.** As avaliações **dele**, com ligação para a ficha do Google.
  Nunca um número que nós escrevamos.
- **Prioridade.** P1.

### F-6 · Três pratos são nove campos

- **Problema.** É a parte mais pesada do formulário.
- **Impacto.** *Não medido.* Não sei onde as pessoas desistem — o funil sabe.
- **Solução.** **Nenhuma, para já.** É também o que constrói metade do site: cortá-lo dava
  um site mais rápido de fazer e mais pobre de ler. Fica aqui para ser medido, não para ser
  resolvido por instinto.
- **Prioridade.** P3 — medir primeiro.

---

## Corrigido

### F-1 · O formulário recusava quem não publica preços — `f335351`

Era preciso pelo menos um prato **com preço**. O Mariscar, no site dele, não publica preço
nenhum — e não é caso raro: marisqueiras vendem a peso. Para essas casas isto não era
fricção, era uma porta fechada: não chegavam a ver o produto.

O que estava errado não era faltar uma funcionalidade — era a **regra ser mais apertada do
que o produto**. O `tidyPrice` já deixava passar "sob consulta" e "ao peso", testado desde
sempre. A página sempre soube desenhar isto; só a validação é que não deixava lá chegar.

Corrigido por **remoção**: exige-se o nome, não o preço. O `Menu` deixa de desenhar a
coluna quando está vazia, como já fazia com a descrição. Verificado com os dados reais do
Mariscar, três pratos e zero preços — site gerado em 1,46 s, sem uma única coluna vazia.

### F-2 · O "Aberto agora" desaparecia sem avisar — `43ad299`

O distintivo só aparece quando o horário se lê com certeza, e essa recusa é o desenho
certo. O que estava errado era ser **invisível**: o dono não sabia que o sinal existia,
portanto não sabia que o tinha perdido.

O formulário passa a dizer, enquanto ele escreve, o que percebemos — em lista de dias, não
em intervalo, para ele reconhecer um erro *nosso*. Nunca corrige o texto dele.

**E foi isto que me desmentiu.** Eu tinha escrito aqui que o horário do Mariscar perdia o
distintivo. Estava errado: procurei-o no HTML do servidor e o `OpenNow` é componente de
cliente — nunca lá está. O teste que escrevi para provar a minha versão falhou, e ao
investigar apareceu o F-11, que é pior do que aquilo que eu tinha reportado.

### F-7 · Os dois ecrãs diziam ao dono o endereço errado — `65e18cd`

O "Último passo" mostrava `.../s/adega-do-manel`; o site vive em `/adega-do-manel`. No
dashboard, o link apontava para o certo, o botão copiava o certo, e só o texto que se lê
dizia o errado. É o endereço que ele escreve na ementa. Nenhum teste apanharia isto.

### F-8 · O botão prometia reservas a quem não as tem — `2318c4d`

"Reservar mesa" com o WhatsApp por trás. Agora os três destinos dizem três nomes.

### F-9 · "Como chegar" deixava o restaurante para trás — `b20e590`

Abria o Google Maps na mesma aba. No telemóvel, a aplicação de mapas tomava conta do ecrã.

### F-10 · A mensagem do WhatsApp só ia escrita a meio — `2318c4d`

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
