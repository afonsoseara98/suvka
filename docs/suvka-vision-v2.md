# Suvka Vision v2 — A Experiência, Não a Infraestrutura

**Não é um documento técnico.** Zero Prisma, zero Auth, zero Repository, zero tabelas. `docs/suvka-product-blueprint-v1.md` continua a ser a referência de arquitetura; este documento é o que faltava nele — a resposta a "porque é que alguém fica horas no Suvka, paga, e volta amanhã." Se o Blueprint v1 é o esqueleto, este é o porquê de alguém querer vesti-lo.

**Regra de leitura:** sempre que uma decisão técnica e esta visão entrarem em conflito, esta visão ganha. A infraestrutura existe para servir isto, nunca o contrário.

---

## 1. Quem é o utilizador, para lá da persona

Não é "uma PME que precisa de um site." É uma pessoa com um historial de tentativas fracassadas às costas:

- **Já tentou o Wix ou o Squarespace** e desistiu a meio, porque o resultado "parecia o de toda a gente" — genérico, sem alma, sem nada que dissesse porque é que aquele negócio específico é diferente.
- **Já tentou contratar um freelancer** e ficou três semanas à espera de uma primeira versão, que depois precisou de mais duas semanas de revisões, e no fim pagou por algo que já não se lembra bem porque pediu.
- **Já abriu o Framer ou o Webflow**, ficou siderado com a quantidade de opções, fechou o separador ao fim de 20 minutos e nunca mais voltou.
- **Já usou o Canva** para um flyer e pensou "se isto fosse um site a sério, seria perfeito" — mas o Canva não sabe nada sobre o negócio dela, só sobre design.

O que este utilizador quer não é "um website." É **deixar de se sentir amador**. Quer que, amanhã de manhã, quando mandar o link a um cliente, a resposta seja "uau, isto está muito profissional" — não "ah, fizeste um site."

---

## 2. Porque paga

Não paga pela geração. A geração é grátis de prometer — todos os concorrentes prometem "gera em segundos." Paga por três coisas que a geração sozinha não dá:

1. **Ausência de fricção entre a ideia e a coisa publicada.** Cada minuto entre "tenho uma ideia" e "está no ar" é um minuto em que pode desistir. Suvka vende a compressão desse tempo a zero.
2. **A confiança de que aquilo converte, não só que é bonito.** Um site bonito que não vende é um cartão de visita caro. O Business Intelligence Engine e a Diversity Engine já construídos existem exatamente para isto — mas o utilizador nunca vê esses nomes, só sente o resultado: "isto parece ter sido pensado para o meu negócio, não copiado de um template."
3. **Nunca mais ter de voltar a pensar nisto sozinho.** Paga por uma relação contínua, não por uma entrega única — é por isto que o regresso (§4, "Quando volta amanhã") importa tanto quanto a primeira publicação.

---

## 3. Porque escolhe Suvka e não Framer, Webflow, Wix ou Canva

| Alternativa | Porque falha para este utilizador |
|---|---|
| **Framer / Webflow** | Poder total, mas exige saber o que se está a fazer — grelhas, breakpoints, CMS. É uma ferramenta para quem já sabe desenhar sites, não para quem só quer um site. |
| **Wix / Squarespace** | Fácil de começar, mas o resultado é genérico e não pensa em conversão — a estrutura da página é a mesma quer seja um advogado quer seja uma pastelaria. |
| **Canva** | Bonito, rápido, mas não é um site a sério: não entende negócio, não pensa em SEO, não sabe o que é uma taxa de conversão. |
| **Um freelancer** | Caro, lento, e o conhecimento fica com a pessoa, não com o produto — cada alteração futura volta a depender dela. |
| **Suvka** | É a única opção que **entende o negócio antes de desenhar** — e que depois deixa editar tudo com a mesma naturalidade de um Canva, sem nunca pedir para "saber código." |

Esta linha — perceber o negócio primeiro, desenhar depois — é a única vantagem nesta tabela que ninguém copia num fim de semana. É por isto que o motor de Business Intelligence (`app/ai/*`, já construído) não é um detalhe técnico: é o argumento de venda inteiro, só que dito em linguagem de produto.

---

## 4. A jornada emocional

Isto é o coração deste documento. Cada momento abaixo é um ponto onde o utilizador ou avança, ou fecha o separador para sempre.

### Minuto 0-1 — A abertura
Não vê um formulário. Vê uma pergunta simples e uma promessa concreta: *"Descreve o teu negócio. Em 10 minutos tens um site profissional publicado."* Nada de jargão, nada de "escolhe um template." A primeira ação exige zero decisões de design — só descrever o que já sabe de cor: o próprio negócio.

### Minuto 1-2 — A pesquisa da IA
Este é o primeiro risco emocional real: uma espera. Uma barra de progresso genérica mata a confiança aqui. O que tem de aparecer é **prova de trabalho a acontecer** — "A perceber o teu público...", "A analisar o teu posicionamento...", "A escolher o tom certo..." — frases que mudam, que mostram raciocínio, não um "loading" mudo. A espera tem de parecer **trabalho a ser feito por alguém competente**, não uma máquina a processar.

### Minuto 2-3 — O Business DNA
O primeiro momento de "uau, ele percebeu-me." O utilizador vê de volta, em palavras dele, coisas que nunca escreveu explicitamente: o tom certo, o público certo, as cores certas. Não é mágica — é o resultado do Business Intelligence Engine — mas para o utilizador tem de parecer que alguém competente leu a descrição dele e teve um insight, não que um formulário foi preenchido automaticamente.

### Minuto 3-5 — A geração
O segundo "uau", este visual. A página aparece completa: hero, provas sociais, preços, tudo coerente entre si. O momento certo para uma pequena pausa dramática antes de revelar — não porque é preciso tecnicamente, mas porque a antecipação faz o resultado parecer mais valioso.

### Minuto 5-15 — O editor
**O momento que decide se ele fica ou sai.** Chegou aqui já convencido de que a IA é competente; agora precisa de sentir que TEM controlo, não que está à mercê da IA. Cada clique tem de responder instantaneamente. Nada pode parecer frágil ou reversível-com-esforço — undo tem de estar sempre ali, visível, confiável, para que experimentar nunca pareça arriscado.

### O primeiro WOW real
Não é a geração inicial — é a primeira vez que pede uma alteração em linguagem natural ("torna isto mais premium") e ela acontece corretamente, na hora, sem ele ter de saber o que "premium" significa em CSS. É aqui que a diferença para o Canva/Wix se torna visceral, não teórica.

### Quando decide nunca mais voltar ao Framer/Webflow
Quando percebe que consegue fazer tudo o que precisa — mudar layout, trocar imagens, ajustar copy, adicionar uma secção — sem nunca sair do fluxo, sem nunca precisar de abrir a documentação, sem nunca pensar "isto no Webflow seria mais fácil." O teste é negativo: não é um momento em que o Suvka brilha, é a ausência de qualquer momento em que sente falta de outra ferramenta.

### Quando publica
Tem de ser um único clique, com uma confirmação que celebra o momento (não um toast discreto) — é o culminar da promessa dos "10 minutos." O link tem de estar pronto a copiar e enviar imediatamente, porque o primeiro instinto depois de publicar é mostrar a alguém.

### Quando paga
Paga não quando lhe é pedido, mas quando já teve o suficiente de graça para confiar — viu o site publicado, mostrou-o a alguém, recebeu um "uau" de volta. A conversão para pago acontece depois da validação social, nunca antes dela.

### Quando volta amanhã
O que o traz de volta não é uma notificação genérica — é uma razão concreta: "3 pessoas visitaram o teu site ontem" ou "a IA tem uma sugestão para o teu CTA." Retenção nasce de o produto ter algo novo e específico para dizer, não de lembrar que existe.

### Quando convida um colega
Acontece quando mostra o site a alguém e essa pessoa pergunta "como fizeste isto tão rápido?" — a resposta a essa pergunta é o próprio crescimento orgânico do Suvka. O produto tem de dar-lhe algo fácil de responder com uma frase.

---

## 5. O Editor é o Produto

A geração impressiona uma vez. O editor é usado todos os dias. É onde o dinheiro é feito — Figma, Canva, Framer e Webflow não vendem "a primeira exportação," vendem as horas seguintes.

O que faz alguém ficar horas dentro de um editor:

- **Feedback instantâneo, sempre.** Nenhuma ação pode ter um "loading" a meio de uma edição simples — mudar uma cor, trocar uma variante, mover uma secção têm de parecer tão imediatos como arrastar um objeto numa mesa.
- **Nunca um erro cru.** Se algo corre mal, o utilizador nunca vê uma mensagem técnica — vê a IA a tentar de novo, ou uma sugestão alternativa.
- **Reversibilidade total e visível.** Undo/redo não é uma funcionalidade escondida num menu — é uma garantia permanente e visível de que nada do que fizer pode partir o trabalho anterior. É essa garantia que dá coragem para experimentar, e é a experimentação que gera as horas de uso.
- **A IA como colega, não como assistente de formulário.** No Figma, ninguém "preenche campos" — desenha. No Suvka, ninguém deve sentir que está a preencher um formulário de conteúdo; deve sentir que está a conversar com alguém que entende o objetivo e propõe, em vez de só executar ordens.

Isto muda a prioridade de construção: **um editor visual completo, fluido e imediato vale mais para a retenção do que qualquer melhoria na geração inicial.** A geração convence uma vez; o editor decide se o utilizador fica.

---

## 6. Sistema de IA — como um sistema, não um prompt

O utilizador nunca vê estes nomes. Mas a diferença entre "um prompt genérico" e um sistema de especialistas é a diferença entre respostas medianas e respostas que parecem ter sido pensadas por um profissional em cada área. Cada motor abaixo tem um trabalho, e só um:

- **AI Engine** — o orquestrador. Decide qual dos motores abaixo entra em ação para cada pedido do utilizador; nunca gera nada diretamente.
- **Context Engine** — o que a IA sabe sobre ESTE projeto específico, sempre presente em cada decisão: o negócio, a marca, o histórico de edições, o que já foi tentado e rejeitado. Sem isto, cada pedido é tratado como se fosse a primeira vez que a IA vê o projeto.
- **Prompt Engine** — traduz uma instrução em linguagem natural ("torna isto mais premium") numa ação estruturada e válida (uma ou mais operações concretas), nunca em HTML ou texto solto. É a fronteira onde a liberdade do utilizador encontra a disciplina do sistema.
- **Memory Engine** — o que a IA lembra entre sessões: o tom de marca já estabelecido, decisões de design já tomadas, preferências já expressas ("nunca gostou de fundos escuros"). Sem isto, cada sessão recomeça do zero e o utilizador sente que está sempre a repetir-se.
- **Generation Engine** — cópia, estrutura e design de uma página nova. É o motor já mais maduro (o pipeline de Business Intelligence, Psychology, Layout e Design já construído).
- **Repair Engine** — o que acontece quando algo corre mal: uma resposta da IA malformada, uma imagem que falha, uma secção que fica inconsistente. O utilizador nunca deve ver o erro em si — só a recuperação.
- **Layout Engine / Copy Engine / Image Engine** — especialistas dedicados dentro da geração, cada um respondendo por uma dimensão (estrutura da página, texto, imagens), não um único prompt genérico a tentar fazer tudo de uma vez. Um pedido de "melhora o hero" deve acionar precisamente estes três, coordenados, não uma reescrita cega da página inteira.

Este sistema é o que separa "o Suvka usa IA" de "o Suvka É IA" — a segunda frase só é verdade se cada uma destas responsabilidades for tratada como um motor com identidade própria, não como uma instrução a mais dentro de um prompt gigante.

---

## 7. As peças que fazem o Suvka crescer (em termos de produto, não de tabelas)

- **Marca** — o utilizador define cores, tipografia e voz uma vez; todas as páginas do projeto herdam isso automaticamente, sem ter de repetir a escolha em cada página nova.
- **Múltiplas páginas** — criar uma página "Sobre" ou "Preços" tem de parecer tão simples como duplicar a landing, nunca como começar um novo projeto do zero.
- **Equipas** — um dono convida um designer ou um copywriter para o mesmo projeto; cada um vê exatamente o que precisa e nada mais.
- **Componentes reutilizáveis** — depois de gostar de uma secção, guardá-la e voltar a usá-la noutra página ou projeto tem de ser um clique, não uma cópia manual.
- **Templates e Marketplace** — os melhores utilizadores tornam-se criadores: vendem os seus próprios blocos e temas a outros. O Suvka ganha uma parte disso.
- **Ligar Stripe / domínio** — dois momentos onde o utilizador sai da "brincadeira" e entra no "negócio a sério." Têm de ser tão simples como colar uma chave e esperar a confirmação, nunca um manual de configuração.
- **A/B Testing e Analytics** — o momento em que o Suvka deixa de ser só uma ferramenta de criação e passa a ser um parceiro contínuo do negócio: não só "fiz o site," mas "o site está a melhorar sozinho."
- **Biblioteca e Design System** — a evolução natural de "gostei desta secção" para "toda a minha marca vive aqui" — o utilizador deixa de pensar em páginas soltas e passa a pensar num sistema coerente.

Nenhuma destas peças precisa de existir no dia 1. Todas precisam de já fazer sentido no dia 1, para que adicionar cada uma mais tarde pareça uma evolução natural, não um pivô.

---

## 8. O teste decisivo

Não é "quantas páginas gera por minuto." É esta frase, dita por um utilizador real depois de publicar:

> **"Isto foi mais fácil que o Canva e mais poderoso que o Wix."**

Cada decisão de produto — e só depois, cada decisão técnica — deve responder a uma pergunta: **isto aproxima ou afasta o utilizador de dizer essa frase?** A arquitetura já construída (Repository Pattern, Operation Log, Section por instância, persistência real) é exatamente o tipo de fundação que permite alcançar essa frase sem ter de a reconstruir daqui a um ano. Mas a fundação, sozinha, nunca a diz por ninguém — só a experiência descrita neste documento o faz.
