# Noctra Manifesto

Isto não é um blueprint. Não é um documento técnico. Não é um roadmap. É a constituição — o texto que qualquer pessoa, a construir qualquer parte do Noctra, tem de conseguir ler e sair a construir na mesma direção que todas as outras. `docs/noctra-vision-v2.md` responde ao *porquê* da experiência; `docs/noctra-product-blueprint-v1.md` responde ao *o quê*; o código responde ao *como*. Este documento responde a uma pergunta anterior a todas essas: **quem somos, e o que é que isso nos impede de fazer.**

Sempre que uma decisão de produto, de design, de IA ou de engenharia entrar em conflito com uma frase aqui escrita, este documento ganha.

---

## O que é o Noctra

O Noctra não é um gerador de landing pages. Não é um website builder no sentido do Wix. É uma plataforma de criação assistida por IA para quem precisa de parecer profissional e converter — sem se tornar designer, sem se tornar developer, sem contratar quem seja.

A geração é a porta de entrada, não o produto. O produto é a relação contínua entre o utilizador e um sistema que entende o negócio dele, gera com esse entendimento, e continua a ajudar a melhorar depois de publicado.

## Porque existe

Porque o espaço entre "tenho uma ideia de negócio" e "tenho uma presença online que vende" continua largo demais para a maioria das pequenas empresas — lento demais com um freelancer, caro demais com uma agência, genérico demais com um builder tradicional, técnico demais com uma ferramenta de design profissional. Nenhuma ferramenta existente resolve as três dimensões ao mesmo tempo: **inteligência sobre o negócio, qualidade de design, e simplicidade de uso.** O Noctra existe para ser a primeira que resolve as três, em vez de escolher uma e desculpar-se pelas outras duas.

## Porque vai ganhar

Porque trata a compreensão do negócio como um passo real — não decorativo — antes de gerar um único pixel, e porque trata a edição subsequente com o mesmo rigor de engenharia que trata a geração inicial. A maioria dos concorrentes é forte numa metade disto e fraca na outra: os builders de IA (Lovable, Bolt, Replit) geram bem e editam mal fora de código; os builders visuais (Framer, Webflow) editam bem e não pensam no negócio; os builders fáceis (Wix) não fazem nem uma coisa nem outra a sério. Ganhamos ao recusar essa escolha.

## O que nunca iremos fazer

- Nunca vamos gerar uma página sem primeiro construir um entendimento estruturado do negócio. Um prompt genérico para um LLM nunca é geração — é uma aposta.
- Nunca vamos deixar a IA produzir HTML ou output livre que a aplicação depois tem de adivinhar como interpretar. A IA fala a língua de operações estruturadas, sempre — a mesma língua que a interface do utilizador fala.
- Nunca vamos exigir vocabulário técnico do utilizador para editar — nem "grid", nem "breakpoint", nem "div". Se uma funcionalidade só se explica com esse vocabulário, a funcionalidade está mal desenhada, não o utilizador mal informado.
- Nunca vamos trocar determinismo estrutural por "mais criatividade" da IA. A mesma entrada tem de produzir um resultado coerente e explicável — criatividade sem previsibilidade é sorte, não inteligência.
- Nunca vamos deixar uma ação da IA ser irreversível. Se não pode ser desfeita com um clique, não entra no produto.
- Nunca vamos otimizar por métricas de vaidade — número de templates, número de integrações, número de funcionalidades no changelog — às custas do tempo até à primeira publicação com sucesso.
- Nunca vamos mostrar um erro cru ao utilizador. Um erro é sempre nosso para resolver, nunca dele para interpretar.

## O que nos diferencia

1. **Entendemos o negócio antes de desenhar.** Não é um passo de onboarding decorativo — é o motor que faz duas páginas parecidas divergirem de forma correta, e duas páginas diferentes convergirem quando o negócio realmente pede o mesmo.
2. **Nenhum utilizador recebe a página de outro.** Diversidade estrutural genuína, não aleatória — o mesmo negócio produz sempre o mesmo resultado; negócios diferentes produzem resultados visivelmente diferentes, por design, não por sorte.
3. **A IA e a interface falam exatamente a mesma língua.** Toda a alteração — clicada ou pedida em linguagem natural — é a mesma operação estruturada, com o mesmo histórico, o mesmo undo, a mesma auditoria. Não existe um "caminho da IA" separado de um "caminho manual."
4. **A edição é tratada com o mesmo rigor que a geração.** A maioria dos concorrentes brilha numa das duas e desilude na outra. Aqui as duas são a mesma prioridade.

## Como avaliamos uma funcionalidade antes de entrar no produto

Uma funcionalidade só entra se a resposta a pelo menos uma destas perguntas for sim — e a nenhuma delas for não:

- Reduz o tempo até ao primeiro "uau" ou até à primeira publicação?
- Aumenta a confiança de que publicar, editar ou pedir à IA é seguro e reversível?
- Torna o editor mais vivo e mais rápido a responder — nunca mais complexo de aprender?
- Um utilizador real, na jornada descrita em `docs/noctra-vision-v2.md`, sentiria a falta disto se fosse removido?

Se uma funcionalidade só se justifica por "os concorrentes têm" ou "seria interessante ter", não entra ainda. Paridade de funcionalidades não é uma estratégia — é uma desculpa para não ter uma.

## Princípios de Design

- Toda a ação é reversível. Sempre visível como se desfaz, nunca escondida num menu.
- Nada carrega em silêncio. Se algo está a demorar, o utilizador sabe o quê e sente que é trabalho, não espera.
- O produto nunca expõe uma opção que a IA já devia ter decidido bem por defeito. Configuração é o último recurso, não o primeiro ecrã.
- Cada ecrã tem um próximo passo óbvio. Se o utilizador tem de perguntar "e agora?", o ecrã falhou.

## Princípios de IA

- A IA pensa antes de gerar — planeamento é o produto, geração é só o passo final visível.
- A IA nunca improvisa quando existe conhecimento estruturado que já responde à pergunta.
- A IA propõe, nunca impõe — uma sugestão sem confirmação implícita fácil de recusar não é uma sugestão, é uma imposição disfarçada.
- Um erro da IA é sempre recuperado antes de chegar ao utilizador, nunca mostrado cru.
- A IA é composta por especialistas com uma responsabilidade cada um (contexto, geração, reparação, layout, copy, imagem) — nunca um único prompt genérico a tentar decidir tudo de uma vez.

## Princípios de UX

- Feedback instantâneo em qualquer interação dentro do editor — nada que pareça um formulário a ser submetido.
- Zero jargão técnico virado para o utilizador — se um conceito só faz sentido para quem programa, fica escondido atrás de uma decisão automática.
- A confiança constrói-se ANTES do pedido de pagamento, nunca depois — o utilizador só deve ser convidado a pagar depois de já ter sentido o valor.
- Regressar ao produto tem sempre uma razão concreta e específica à espera, nunca só a lembrança de que o produto existe.

## Como queremos que um utilizador se sinta

Não "impressionado pela tecnologia." **Capaz.** Como se tivesse feito aquilo sozinho, com a ajuda de alguém extremamente competente ao lado — nunca como um espectador a ver uma máquina fazer o trabalho por ele. É a diferença entre "a IA fez-me um site" e "eu fiz um site, e foi fácil." A segunda frase é a que gera clientes que voltam; a primeira é a que gera clientes curiosos que testam uma vez.

## A régua para daqui a 5 anos, com 50 engenheiros

Um teste simples: se dois engenheiros, cada um a ler só este documento, construíssem duas funcionalidades diferentes para o mesmo problema, chegariam a soluções compatíveis? Este documento existe para que a resposta seja sempre sim. Qualquer funcionalidade, PR, ou decisão de arquitetura que não consiga apontar para um princípio aqui escrito que a justifique deve ser questionada antes de avançar — não por burocracia, mas porque é exatamente assim que um produto deixa de ter uma direção e passa a ser uma coleção de funcionalidades desconexas.
