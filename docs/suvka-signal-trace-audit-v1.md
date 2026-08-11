# Suvka Signal Trace Audit v1

**Nenhum código foi alterado para produzir a auditoria original abaixo.** É uma leitura completa, ficheiro a ficheiro, de todo o pipeline de geração (`app/ai/*` + `app/api/generate/route.ts`), a responder a uma pergunta: **de tudo o que o pipeline calcula, o que chega realmente ao LLM — e o que se perde, é substituído, ou nunca foi ligado a nada?**

**Atualização — os 4 achados P0 (críticos + alto) foram corrigidos depois desta auditoria.** Ver [§ Estado depois dos fixes P0](#estado-depois-dos-fixes-p0-com-evidência-real) para a evidência real (não apenas a afirmação de que foram corrigidos) — valores capturados executando o pipeline de verdade, sem qualquer chamada à OpenAI. Os achados #5 a #10 (média/baixa prioridade) permanecem por resolver, deliberadamente, para não expandir o âmbito além do que foi pedido.

## Metodologia

Segui o fluxo exatamente na ordem pedida — Business Intelligence → Knowledge → Psychology → Offer → Design → Composition → PromptBuilder → LLM → JSON → Renderer — lendo cada ficheiro por inteiro, não só assinaturas de função. "Afeta o output?" é **Yes** quando confirmei por leitura de código que o valor chega ao texto do prompt (ou à estrutura passada ao renderer); **No** quando confirmei que não chega a lado nenhum; **Unknown** apenas nos poucos casos em que o valor chega ao prompt mas se o modelo lhe dá peso real só se sabe com uma chamada real (não feita nesta auditoria, propositadamente).

---

## Estado depois dos fixes P0 (com evidência real)

Evidência capturada a executar `buildPipeline()` de verdade (zero chamadas à OpenAI - a estrutura toda, incluindo o texto final do prompt, é determinística e não depende do LLM) para os mesmos casos de teste da auditoria original, depois de cada correção. Os 39 ficheiros de teste (443 testes) passam; 24 desses testes são novos, escritos especificamente para provar estas divergências, não apenas a ausência de erros.

### #1 — `schema.ts` — RESOLVIDO

```diff
- "stats": [{ "number": "", "label": "" }]
+ "stats": [{ "value": "", "label": "" }]
```

Teste de regressão novo (`app/ai/prompts/schema.test.ts`) analisa o JSON de exemplo embutido no prompt e falha se `"number"` for reintroduzido, ou se `hero.stats` e `stats` voltarem a usar nomes de campo diferentes.

### #2 — Conhecimento por indústria — RESOLVIDO

10 ficheiros novos (`app/ai/knowledge/{agency,realEstate,ecommerce,education,beauty,homeServices,consulting,automotive,events,generic}.ts`), `KnowledgeResolver.ts` reescrito para um switch exaustivo sobre o tipo `Industry` (não `string`) — adicionar uma 16ª indústria sem `case` correspondente é agora um erro de compilação, não um fallback silencioso descoberto em produção.

Prova real — o que a secção INDUSTRY KNOWLEDGE do prompt contém hoje para "A hair salon offering haircuts, color, and styling for the whole family":

```
Hero Style: Salon interior with styling in progress
Common Features: Online booking, Personalised consultations, Premium products, Flexible scheduling
Common Benefits: Increase confidence, Personalised care, Fast appointments, Peace of mind
FAQ Topics: Appointments, Pricing, Products, Opening hours
SEO Keywords: Hair Salon, Beauty Salon, Spa, Styling
```

Antes desta correção, isto era literalmente `commonFeatures: ["AI automation", "Analytics", "API integrations", "Real-time dashboard"]` — a mesma indústria "beauty" era classificada corretamente pelo `BusinessProfileBuilder`, mas recebia conhecimento de SaaS.

### #3 — Psychology/Offer cegos ao Business Intelligence — RESOLVIDO

`analyzePsychology`/`buildOfferStrategy` recebem agora `BusinessIntelligenceProfile`. `priceObjectionFromBi`/`priceFramingModifier` leem `bi.pricePositioning` (contínuo) em vez de `business.priceLevel` (constante fixa por indústria). Prova real, mesmo par de prompts do teste original do BI Engine, capturada com o pipeline completo a correr agora:

| | Luxury Wedding Photographer | Cheap Wedding Photographer |
|---|---|---|
| `industry` (ambos) | `generic` | `generic` |
| `priceLevel` (ambos, constante) | `medium` | `medium` |
| `bi.pricePositioning` | **1.00** | **0.00** |
| `offer.offerFraming` | *"Frame the offer as a low-commitment first step, not a final decision, **leaning into exclusivity rather than competing on price**"* | *"Frame the offer as a low-commitment first step, not a final decision"* |
| `psychology.objections[0]` | *"Price itself may be the main barrier unless exclusivity and quality are obvious"* | *"May assume a low price signals lower quality or a lack of professionalism"* |

Antes da correção, `industry` e `priceLevel` iguais significavam `offerFraming`/`objections[0]` **byte-idênticos** para os dois — apesar de `bi.pricePositioning` já divergir corretamente. Os dois primeiros anos deste projeto de teste (`industry`/`priceLevel` iguais) continuam iguais, de propósito - é exatamente esse o cenário que prova o bug; o que muda é tudo o resto.

Adicionalmente: novo objeção BI-driven para `riskPerception`/`decisionComplexity` altos (inexistente antes - nenhum equivalente existia em `BusinessProfile`), e `trustFactors`/`emotionalTriggers` agora leem `authorityRequirement`/`trustDifficulty`/`emotionalVsRational` em vez de `tone`/`priceLevel` coarse.

### #4 — `describeSignalsForPrompt` morto — RESOLVIDO

Chamado agora a partir de `PromptBuilder.ts`, numa nova secção `COMPOSITION SIGNALS` do prompt, entre `PSYCHOLOGY & OFFER STRATEGY` e `STRATEGY DNA`. Prova real, secção completa tal como aparece no prompt hoje:

```
==============================
COMPOSITION SIGNALS
==============================
trustNeed: medium - back claims with at least one concrete proof point
urgency: medium - give the CTA a clear, direct reason to act now
complexity: medium - explain the offer clearly but don't over-elaborate
socialProofNeed: medium - make testimonials specific and outcome-focused
objectionPressure: medium - address the top objection directly in FAQ or copy
priceSensitivity: low - lean into premium/exclusivity framing on price
```

Teste (`PromptBuilder.test.ts`) prova que isto não é um bloco estático: mudar `signals.urgency`/`socialProofNeed` muda o texto correspondente nesta secção.

### #5 a #10 — por resolver, deliberadamente

Fora do âmbito desta ronda P0 (o pedido foi explícito: estes quatro, não os dez). Continuam documentados na lista original abaixo, sem alterações.

---

## As 10 descobertas, por impacto

### 1. CRÍTICO — `SCHEMA_PROMPT` pede o nome de campo errado para `stats` — ✅ RESOLVIDO

`app/ai/prompts/schema.ts`, linhas 69-82, mostra ao modelo o schema exigido para o array `stats` de topo:

```json
"stats": [{ "number": "", "label": "" }]
```

Mas `app/types/landing.ts`'s `StatsItem` (o tipo que `Stats.tsx` efetivamente lê) é `{ value: string; label: string }`. O próprio `hero.stats`, três linhas acima no mesmo ficheiro (linhas 53-66), mostra corretamente `{ "value": "", "label": "" }` — a inconsistência é interna ao próprio ficheiro, não uma leitura errada de um tipo externo. Um modelo que siga o schema exigido à letra produz `{"number": "500+", "label": "Clientes"}` para cada item; `Stats.tsx` lê `item.value`, que fica `undefined`, e a secção "stats" mostra números em branco. Isto não é uma suspeita — é uma comparação direta entre o prompt que existe e o componente que existe.

**Toda a página gerada com uma secção "stats" (grande parte delas, dado o peso dessa secção na Diversity Engine) está, com alta probabilidade, a mostrar essa secção parcialmente vazia.**

### 2. CRÍTICO — 10 de 15 indústrias recebem conhecimento de negócio errado — ✅ RESOLVIDO

`app/ai/builders/KnowledgeResolver.ts` só tem entradas dedicadas para `medical`, `restaurant`, `fitness`, `law` — e o `default` do switch devolve `startupKnowledge` para **tudo o resto**: `agency`, `real_estate`, `ecommerce`, `education`, `generic`, `beauty`, `home_services`, `consulting`, `automotive`, `events`. Isto significa que um salão de cabeleireiro (`beauty`) ou uma wedding planner (`events`) recebe, textualmente, no prompt:

- `commonFeatures`: "AI automation", "Analytics", "API integrations", "Real-time dashboard"
- `trustSignals`: "Trusted by 10,000+ businesses", "Enterprise security", "24/7 support"
- `faqTopics`: "Pricing", "Security", "Integrations", "Support"
- `keywords`: "AI", "Automation", "SaaS", "Analytics"
- `heroStyle`: "Dashboard with analytics"

Este é o ficheiro `app/ai/knowledge/startup.ts` a ser injetado, sem qualquer aviso, em dois terços das indústrias que o Business Intelligence Engine já sabe classificar corretamente (a classificação em si está certa — é o conhecimento de conteúdo associado que falta). E o problema propaga-se: `PsychologyAnalyzer.derivePains`/`deriveDesires` são chaveados exatamente por `knowledge.faqTopics`/`knowledge.commonBenefits` — para essas 10 indústrias, as "dores" e "desejos" do cliente escritas no prompt também vêm da tabela SaaS, não do negócio real. `derivePrimaryCTA` é a única função com uma guarda (`knowledge.industry === business.industry`) que evita usar "Start Free Trial" nesses casos — mas é a exceção, não a regra.

### 3. CRÍTICO — Psychology e Offer nunca veem o `BusinessIntelligenceProfile` — ✅ RESOLVIDO

`analyzePsychology(business: BusinessProfile, knowledge: BusinessKnowledge)` e `buildOfferStrategy(business: BusinessProfile, knowledge: BusinessKnowledge, psychology: PsychologyProfile)` — reparem no que falta nas assinaturas: nenhum dos dois recebe `BusinessIntelligenceProfile`. Só veem `BusinessProfile`, o perfil grosseiro por indústria (que nem sequer varia com o texto do prompt — `priceLevel` é uma constante por indústria em `INDUSTRY_PROFILES`, não algo que o BI Engine ajusta).

A consequência concreta: o próprio teste que prova a inteligência do BI Engine (`BusinessIntelligence.test.ts`, "Luxury Wedding Photographer vs Cheap Wedding Photographer") mostra que `pricePositioning` diverge corretamente (>0.7 vs <0.3) entre os dois prompts. Mas `OfferBuilder.deriveOfferFraming` usa `PRICE_FRAMING_MODIFIER[business.priceLevel]` — e `business.priceLevel` é **igual** para os dois, porque nenhum dos dois prompts contém palavras-chave de indústria suficientes para mudar a classificação, e mesmo que mudasse, `priceLevel` é uma constante fixa por indústria, nunca derivada do texto. Resultado: o `offerFraming` e o `riskReductionAngle` escritos no prompt são **idênticos** para o fotógrafo de luxo e o fotógrafo económico, apesar de a secção BUSINESS INTELLIGENCE do mesmo prompt dizer coisas opostas sobre posicionamento de preço. O modelo recebe dois sinais a apontar em direções diferentes para a mesma decisão.

### 4. ALTO — `describeSignalsForPrompt` é código morto — ✅ RESOLVIDO

`app/ai/builders/CompositionIntelligence.ts` define e exporta `describeSignalsForPrompt(signals: CompositionSignals): string[]` — com um comentário próprio a dizer que existe precisamente para traduzir `CompositionSignals` (trustNeed, urgency, complexity, socialProofNeed, objectionPressure, priceSensitivity) em diretivas legíveis para o LLM, no mesmo padrão que `describeBusinessIntelligenceForPrompt` já usa. Procurei em todo o `app/`: a única chamada a esta função está no seu próprio ficheiro de teste. `PromptBuilder.ts` nunca a importa.

Estes seis sinais são exatamente os que decidem quantas secções aparecem, em que ordem (via `LayoutIntelligence.ts`), e quantos CTAs a página tem — decisões estruturais reais e corretas. Mas a *razão* dessas decisões, em linguagem que ajudaria o modelo a escrever copy coerente com elas ("urgency: high - make every CTA immediate"), está construída, testada, e nunca chega ao prompt.

### 5. ALTO — `SCHEMA_PROMPT` contradiz `PAGE STRUCTURE`, na mesma mensagem — por resolver

`PromptBuilder.ts` primeiro escreve a secção `PAGE STRUCTURE`, com a lista real e dinâmica de secções computada pelo pipeline, e a instrução explícita: *"Generate the page using exactly this section structure... Do not add, remove, or reorder sections."* Imediatamente a seguir, `CONVERSION_PROMPT` e depois `SCHEMA_PROMPT` mostram um exemplo de JSON com uma lista de secções **fixa e diferente**: exatamente 8 secções (hero, stats, features, benefits, testimonials, pricing, faq, footer), sempre pela mesma ordem, sempre com as mesmas variantes ("cards", "grid", "premium", "accordion"). Uma página real pode ter menos secções (se `benefits` ou `stats` não passar o threshold), mais (com `logoCloud`/`cta`), ou variantes completamente diferentes ("inline", "twoColumn", "bento"). O `sections` do JSON de exemplo é, na prática, ignorado pelo pipeline de qualquer forma (`landingPage.sections = pipeline.sections` sobrescreve-o sempre) — mas exemplos de schema influenciam fortemente como um modelo lê a instrução em prosa que os antecede, e este exemplo diz-lhe, em JSON explícito, o oposto do que a instrução em texto acabou de dizer.

### 6. MÉDIO — 8 das 11 dimensões primárias do BI nunca são verbalizadas individualmente — por resolver

`describeBusinessIntelligenceForPrompt` mostra sempre 6 enums derivados (`marketPosition`, `brandPersonality`, `buyerAwareness`, `visitorTemperature`, `salesCycle`, `funnelType`) e, condicionalmente, só 3 das 11 dimensões primárias — `pricePositioning` (só se ≥0.7 ou ≤0.3; a faixa 0.3-0.7, a mais comum, nunca é mencionada), `visualImportance` (só se ≥0.65), `authorityRequirement` (só se ≥0.65). `competitionLevel`, `buyerSophistication`, `emotionalVsRational`, `decisionComplexity`, `purchaseUrgency`, `offerComplexity`, `riskPerception`, `trustDifficulty` nunca aparecem como número nem como frase nesta secção. Algumas influenciam a STRATEGY DNA (que chega ao prompt como números 0-1 sem contexto de negócio — ver achado 10), outras (`competitionLevel`) só afetam a escolha do `designFamily`, nunca o texto.

### 7. MÉDIO — Contagens de conteúdo fixas, nunca ligadas a `prominence`/`weight` — por resolver

`SCHEMA_PROMPT` exige sempre exatamente 3 features, 3 benefits, 3 testimonials, 3 pricing plans, 3 FAQ items — para qualquer negócio, com qualquer `socialProofNeed` ou `prominence` computados. Uma secção `testimonials` com `prominence: "primary"` (porque `socialProofNeed` é alto) recebe exatamente o mesmo número de itens que uma com `prominence: "compact"`. O sinal existe (`sectionWeight`/`prominence` já chegam ao prompt via PAGE STRUCTURE e STRATEGY DNA) mas nunca é ligado à cardinalidade do conteúdo.

### 8. BAIXO — `theme` é um campo morto no schema — por resolver

O exemplo de `SCHEMA_PROMPT` pede um campo de topo `"theme": "startup"`. `app/api/generate/route.ts` faz `JSON.parse(content)` e nunca lê `landingPage.theme` — o renderer usa exclusivamente `landing.dna` (sempre sobrescrito pelo pipeline). O modelo gasta tokens de output a preencher um campo que ninguém lê, e o próprio valor de exemplo ("startup") é um viés categórico desnecessário logo no topo do schema.

### 9. BAIXO — Dois ficheiros inteiros de código morto, sobras de uma arquitetura anterior — por resolver

`app/ai/engines/shared.ts` (`pickBestMatch`/`SignalFingerprint`) e `app/ai/types/strategy.ts` (`HeroStrategy`/`TrustStrategy`/`CtaStrategy`/`PricingStrategy`) — ambos claramente parte do sistema categórico que `StrategyDNA` (`types/dna.ts`) substituiu, confirmado pelo próprio comentário de `dna.ts`: *"Replaces every categorical decision this pipeline used to make (...HeroStrategy.headlineLength/imagery/whitespace/proofPlacement, TrustStrategy.credibilityApproach/proofDensity/objectionHandling...)."* Nenhum dos dois ficheiros é importado por código de produção hoje — confirmado por pesquisa em todo o `app/`. Não afetam o output (por isso prioridade baixa), mas violam a regra "no dead code" da própria Constitution, e um leitor novo pode facilmente assumir que ainda estão em uso.

### 10. BAIXO — `SYSTEM_PROMPT` pede ao modelo para decidir coisas que já estão decididas — por resolver

`app/ai/prompts/system.ts` inclui "visual hierarchy" e "layout" na lista do que o modelo deve "pensar cuidadosamente antes de escrever" — mas layout, hero variant, e a lista de secções são inteiramente decididos pelo pipeline e sobrescritos depois da geração (`landingPage.sections = pipeline.sections`), independentemente do que o modelo produzir. Não é um erro que quebre nada, mas é uma instrução que pede raciocínio sobre uma decisão que o modelo não controla — atenção do modelo gasta em algo sem efeito.

---

## A tabela completa

| Signal | Produced by | Consumed by | Afeta o output? | Prioridade | Recomendação |
|---|---|---|---|---|---|
| `BusinessProfile` (industry/businessModel/goal/audience/tone/priceLevel) | `BusinessProfileBuilder.ts` | `PromptBuilder` (direto), Psychology, Offer, Knowledge, todos os Design Engines | **Yes** | — | Nenhuma - funciona como esperado |
| `BusinessIntelligenceProfile` — 3 dims verbalizadas condicionalmente (`pricePositioning`, `visualImportance`, `authorityRequirement`) | `BusinessIntelligence.ts` | `describeBusinessIntelligenceForPrompt` → prompt | **Yes, mas só nos extremos** | Média | Verbalizar sempre, não só quando ≥0.65/≤0.3 - a faixa média é a mais comum e a menos informada |
| `BusinessIntelligenceProfile` — 8 dims nunca verbalizadas (`competitionLevel`, `buyerSophistication`, `emotionalVsRational`, `decisionComplexity`, `purchaseUrgency`, `offerComplexity`, `riskPerception`, `trustDifficulty`) | `BusinessIntelligence.ts` | Engines de Design (parcialmente); nunca o prompt diretamente | **No** (como texto); parcial via DNA numérico sem contexto | Média | Estender `describeBusinessIntelligenceForPrompt` para cobrir as 11, não só 3 |
| `BusinessIntelligenceProfile` — `lifetimeValue`, `trafficSourceSuitability` | `BusinessIntelligence.ts` | Ninguém no prompt | **No** | Baixa | Ou remover (se irrelevante para copy), ou usar - hoje é puro cálculo desperdiçado |
| `BusinessKnowledge` (features/benefits/faqTopics/keywords/heroStyle/trustSignals) para 5 indústrias com ficheiro dedicado | `medical.ts`/`law.ts`/`restaurant.ts`/`fitness.ts` | Psychology, Offer, `PromptBuilder` | **Yes, correto** | — | Nenhuma |
| `BusinessKnowledge` para as outras 10 indústrias | `KnowledgeResolver.ts`'s `default` → `startupKnowledge` | Psychology, Offer, `PromptBuilder` | **Yes, mas errado** | **Crítica** | Conhecimento dedicado para pelo menos `beauty`/`home_services`/`consulting`/`automotive`/`events`; um fallback genérico neutro (não SaaS) para o resto |
| `PsychologyProfile` (pains/desires/objections/trustFactors/emotionalTriggers) | `PsychologyAnalyzer.ts`, só a partir de `BusinessProfile`+`BusinessKnowledge` | `PromptBuilder` (direto) | **Yes, mas cego ao BI** | **Crítica** | Passar `BusinessIntelligenceProfile` a `analyzePsychology` e usá-lo para pelo menos ordenar/pesar pains e desires por relevância |
| `OfferStrategy` (CTA/valueProp/framing/riskReversal) | `OfferBuilder.ts`, só a partir de `BusinessProfile`+`Knowledge`+`Psychology` | `PromptBuilder` (direto) | **Yes, mas cego ao BI** | **Crítica** | Mesmo fix - `deriveOfferFraming` devia ler `bi.pricePositioning` (contínuo), não `business.priceLevel` (constante por indústria) |
| `CompositionSignals` (trustNeed/urgency/complexity/socialProofNeed/objectionPressure/priceSensitivity) | `CompositionIntelligence.ts` | `LayoutIntelligence` (estrutura); **ninguém no prompt** | **No** (como texto para o LLM); **Yes** (estrutura) | **Alta** | Chamar `describeSignalsForPrompt` (já existe, já testado) dentro de `PromptBuilder.ts` |
| `StrategyDNA` (28 campos) | Visual/Hero/Trust/CTA/Pricing Engines | `describeDnaForPrompt` → prompt (números 0-1 com hint textual) | **Yes** | — | Funciona, mas ver achado sobre "sem contexto de negócio" - são números legíveis, não frases |
| `designFamily` | `DesignFamily.ts` | Prompt (nome) + toda a DNA que ele ajusta | **Yes** | — | Nenhuma |
| `sections` (tipo/variante/prominence, computados) | `LayoutIntelligence.ts` + `SectionPlanner.ts` | `PAGE STRUCTURE` no prompt; **sobrescreve** o que o LLM gerar | **Yes** (a estrutura real vem sempre daqui, nunca do LLM) | — | Correto por desenho - mas ver o achado #5 sobre o `SCHEMA_PROMPT` a contradizer esta secção |
| `sections` — exemplo estático em `SCHEMA_PROMPT` | `schema.ts`, hard-coded | O modelo lê isto logo a seguir à lista real | **Contradiz o sinal real** | **Alta** | Gerar o exemplo de schema dinamicamente a partir das secções reais desta geração, não um exemplo fixo de 8 secções |
| `stats` — nome do campo no exemplo de schema (`number` vs `value`) | `schema.ts`, hard-coded | `Stats.tsx` (espera `.value`) | **No - bug ativo** | **Crítica** | Corrigir `"number"` → `"value"` em `schema.ts` |
| `theme` (campo pedido no schema) | `schema.ts`, hard-coded | Ninguém (renderer só lê `dna`) | **No** | Baixa | Remover do schema - é output desperdiçado e um viés categórico sem função |
| Contagem de itens (features/benefits/testimonials/pricing/faq) | `schema.ts`, hard-coded em "exactly 3" | Nunca lê `prominence`/`sectionWeight` computado | **Parcial** (sempre 3, ignora o sinal de peso) | Média | Fazer a contagem depender de `prominence` (ex: `primary` → 4-5 itens, `compact` → 2-3) |
| `pickBestMatch`/`SignalFingerprint` (`shared.ts`) | Arquitetura anterior | Ninguém | **No - código morto** | Baixa | Remover |
| `HeroStrategy`/`TrustStrategy`/`CtaStrategy`/`PricingStrategy` (`types/strategy.ts`) | Arquitetura anterior | Ninguém | **No - código morto** | Baixa | Remover |
| `SYSTEM_PROMPT`'s pedido para pensar em "layout"/"visual hierarchy" | `system.ts`, estático | O modelo lê isto, mas layout já está decidido e será sobrescrito | **Instrução sem efeito real** | Baixa | Substituir por uma frase a apontar explicitamente para as secções estruturadas abaixo, em vez de pedir raciocínio próprio sobre algo pré-decidido |

---

## O padrão, visto de fora

Há uma assimetria clara em todo o pipeline: **o lado da estrutura e do design (DNA, secções, variantes) está bem ligado ao Business Intelligence** — é o que a Diversity Engine já provou com números reais. **O lado da narrativa e da copy (Psychology, Offer, e a verbalização do próprio BI) está sistematicamente mais pobre** — ou porque nunca recebeu o BI Profile como input (achado #3), ou porque a função que o traduziria para o LLM existe mas nunca é chamada (achado #4), ou porque um exemplo de schema estático contradiz ou tem um erro literal no que pede (achados #1 e #5).

Isto confirma exatamente a suspeita com que esta auditoria começou: **não é a copy que precisa de ser melhor escrita pelo modelo — é a inteligência que já foi calculada que precisa de chegar ao modelo.** Os achados #1, #2 e #3 são, isoladamente, capazes de explicar uma parte significativa de qualquer sensação de "genérico" na cópia gerada hoje, e nenhum dos três exige mudar a arquitetura - exigem ligar sinais que já existem a locais que já existem.

## Antes da próxima chamada real à OpenAI

Os achados #1 (bug ativo, `number` vs `value`) e #2 (conhecimento errado para 10 indústrias) eram verificáveis e corrigíveis sem qualquer chamada ao modelo - eram bugs de código, não hipóteses sobre comportamento do LLM. **Ambos, mais #3 e #4, estão agora corrigidos** (ver [§ Estado depois dos fixes P0](#estado-depois-dos-fixes-p0-com-evidência-real)), com 24 testes novos e evidência real capturada do pipeline completo, sem qualquer chamada à OpenAI.

A primeira chamada real de validação pode agora acontecer contra um pipeline sem os quatro problemas mais óbvios a confundir o resultado. Os achados #5-#10 continuam por resolver, deliberadamente - nenhum deles impede uma validação honesta, e corrigi-los agora seria otimização prematura sobre um resultado ainda não visto.
