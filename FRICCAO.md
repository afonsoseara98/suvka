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

### F-1 · O formulário recusa quem não publica preços

- **Problema.** É preciso pelo menos um prato **com preço** para gerar o site. O Mariscar,
  no site dele, não publica preço nenhum — e não é um caso raro: marisqueiras vendem a
  peso, e há casas que não querem o preço na internet.
- **Impacto.** Não é fricção, é uma porta fechada. O restaurante não chega a ver o produto.
- **Frequência.** *Estimado:* todas as casas que vendem a peso ou "ao preço do dia".
- **Solução mais simples.** Aceitar um prato sem preço, e mostrá-lo sem a linha do preço.
  O `tidyPrice` já deixa passar texto que não é número ("sob consulta"), portanto a página
  já sabe desenhar isto — só a validação é que não deixa lá chegar.
- **Posso eliminar em vez de melhorar?** Sim: deixar de exigir o preço. O nome do prato já
  sozinho constrói a ementa.
- **Prioridade.** P0.

### F-2 · O "Aberto agora" desaparece sem avisar

- **Problema.** Escrevi o horário em português normal — *"Terça a sábado das 12h às 15h e
  das 19h30 às 23h. Domingo só almoços. Segunda fechado."* — e o distintivo não apareceu.
  Só aparece quando o texto se lê com certeza.
- **Impacto.** É o sinal mais valioso da página: responde à pergunta que decide se a pessoa
  sai de casa. Perde-se em silêncio, e o dono não sabe que existia.
- **Frequência.** *Estimado:* alto. O campo é texto livre, de propósito, e o texto livre de
  um dono de restaurante parece-se com um aviso à porta, não com uma grelha.
- **Solução mais simples.** Não corrigir o texto dele — nunca. Mostrar-lhe no formulário o
  que percebemos: `✓ Percebemos: aberto de terça a domingo` ou `Não conseguimos ler este
  horário — o site não vai poder dizer "Aberto agora"`. Ele decide se reescreve.
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

Enquanto o F-1 estiver aberto, esse restaurante em concreto nem sequer consegue
experimentar — é recusado no formulário por não publicar preços.
