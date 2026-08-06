# Noctra Product Blueprint v1

**Status:** Single Source of Truth for all product and architecture decisions from this point forward.
**Supersedes:** `PROJECT_CONTEXT.md.txt`'s "Current Status/Sprint" sections (stale — written before the AI pipeline, Diversity Engine, and Editor Foundation existed).
**Evolves, does not discard:** `NOCTRA_CONSTITUTION.md.txt` and `CLAUDE.md.txt`. Their engineering principles (strong typing, one responsibility per module, structured data before prompting an LLM, no duplicated logic) remain in force and are restated in [§13](#13-critérios-de-qualidade). Their mission statement does not — see below.

---

## How to use this document

Every new feature answers one question before a line of code is written: **does this move Noctra toward the vision in §1, along the roadmap in §11, without violating a decision in §17?** If the answer isn't obviously yes, that's the signal to update this document first, not to build around it.

---

## Table of contents

1. [Visão e Missão](#1-visão-e-missão)
2. [Público-alvo](#2-público-alvo)
3. [Personas](#3-personas)
4. [Fluxos completos do utilizador](#4-fluxos-completos-do-utilizador)
5. [Arquitetura do produto](#5-arquitetura-do-produto)
6. [Arquitetura técnica](#6-arquitetura-técnica)
7. [Modelo de dados](#7-modelo-de-dados-project-page-section-operation)
8. [Arquitetura do editor visual](#8-arquitetura-do-editor-visual)
9. [Sistema de IA](#9-sistema-de-ia)
10. [Sistema de componentes](#10-sistema-de-componentes)
11. [Roadmap v1 → v3](#11-roadmap-v1--v3)
12. [Estratégia de monetização](#12-estratégia-de-monetização)
13. [Critérios de qualidade](#13-critérios-de-qualidade)
14. [Requisitos de performance](#14-requisitos-de-performance)
15. [Critérios de escalabilidade](#15-critérios-de-escalabilidade)
16. [Riscos técnicos](#16-riscos-técnicos)
17. [Decisões arquiteturais](#17-decisões-arquiteturais)
18. [Funcionalidades futuras](#18-funcionalidades-futuras)

---

## 1. Visão e Missão

### Missão

> Uma empresa consegue passar de uma ideia para um website profissional publicado em menos de 10 minutos.

Tudo o resto neste documento existe para suportar isto.

### Visão

**Criar o melhor AI Website Builder para pequenas e médias empresas, focado em conversão e simplicidade.**

### A evolução da missão (registo explícito, não silencioso)

`NOCTRA_CONSTITUTION.md.txt` (v1.1) e `CLAUDE.md.txt` afirmam: *"Noctra is not an AI website builder. Noctra is an AI Conversion System."* Este documento altera essa posição deliberadamente, não por acidente:

- O **motor de decisão** (Business Intelligence, Psychology, Knowledge, Composition, Layout, Design Engines — tudo em `app/ai/*`) continua a ser a vantagem competitiva real e **não muda**. Continua verdade que "a nossa vantagem competitiva não é a geração, é a decisão."
- O que muda é a **superfície do produto**: deixa de ser "gera uma landing page a partir de um prompt" e passa a ser "cria, edita, publica e otimiza um website completo." O motor de conversão passa a ser um *componente* do produto, não o produto inteiro.
- Isto é coerente com o que já foi construído nesta sessão: `Project` → múltiplas páginas, `SectionInstance`/`Operation`/`PageHistory` → edição incremental sem regenerar tudo. A arquitetura já estava, na prática, a preparar-se para isto antes de a missão ser reescrita para o refletir.

### O que nos diferencia (porque não copiam isto num fim de semana)

Um concorrente consegue copiar "um gerador." É muito mais difícil copiar um sistema onde, simultaneamente:

1. A IA conhece o negócio antes de gerar (Business Intelligence Engine, não um prompt genérico).
2. A geração é estruturalmente diversa e determinística (Diversity Engine — dois negócios semelhantes produzem páginas visualmente distintas, de forma reprodutível, não aleatória).
3. A edição visual e a edição por IA partilham exatamente o mesmo mecanismo (`Operation`/`applyOperation`) — a IA nunca pode corromper um estado que a UI não pudesse também produzir.
4. Existe um histórico de operações completo, não apenas um "undo" de UI.
5. (v2+) O sistema aprende com o desempenho real do site publicado e sugere otimizações.

Nenhum destes pontos isolados é impossível de copiar. A combinação, com a mesma disciplina de tipagem e determinismo em toda a pilha, é a barreira.

---

## 2. Público-alvo

**Principal:** Pequenas e médias empresas (PMEs) e prestadores de serviços independentes, sem equipa técnica ou de design interna, que precisam de um website profissional e não querem (ou não sabem) usar ferramentas como Webflow/Framer diretamente.

Isto mapeia diretamente para as verticais que o Business Intelligence Engine já reconhece nativamente (`app/ai/builders/BusinessProfileBuilder.ts`): `medical`, `law`, `real_estate`, `fitness`, `restaurant`, `ecommerce`, `education`, `agency`, `startup`, `beauty`, `home_services`, `consulting`, `automotive`, `events`. Isto não é coincidência — o produto já "conhece" o público-alvo ao nível dos dados antes de o conhecer ao nível do marketing.

**Secundário:** Agências de marketing/web design que gerem sites para múltiplos clientes PME — um canal B2B2C explícito a partir do v2 (ver `Client`/`Team` roles em [§11](#11-roadmap-v1--v3)).

**Fora de âmbito para v1-v2:** Empresas enterprise com requisitos de compliance/customização complexos, e utilizadores que querem controlo total de código (esses já têm Webflow/código à mão — não é a nossa cunha).

---

## 3. Personas

| Persona | Negócio | O que já reconhecemos dela | Maior fricção hoje |
|---|---|---|---|
| **Marta** | Dona de um salão de beleza local | `industry: "beauty"`, prioriza `visualImportance`, `emotionalVsRational` | Não sabe escrever copy nem escolher cores; precisa de "aponta e resulta" |
| **Ricardo** | Advogado independente | `industry: "law"`, `trustDifficulty`/`authorityRequirement` altos | Precisa de parecer credível sem soar genérico; sensível a erros de tom |
| **Sofia** | Fundadora de uma startup SaaS em fase pré-seed | `industry: "startup"`, `decisionComplexity`/`offerComplexity` altos | Quer iterar rápido (testar 3 versões do hero num dia), não recriar do zero |
| **Bruno** | Dono de uma agência de marketing com 20 clientes PME | `industry: "agency"` | Precisa de gerir vários projetos/clientes, não um site só; quer white-label |

Cada persona corresponde a um `businessProfile` real que o pipeline já sabe derivar — as personas não são um exercício de marketing solto, são um teste de que o motor de BI cobre os casos que interessam.

---

## 4. Fluxos completos do utilizador

### 4.1 — Fluxo principal (primeira publicação, <10 minutos)

```
1. Criar Projeto
   Nome, Empresa, Website (opcional), Idioma, País, Objetivo (Lead/Venda/Reserva/Contacto/Newsletter)
        │
        ▼
2. IA faz pesquisa (20-40s)
   negócio · concorrentes · tom · público · proposta de valor · SEO · branding sugerido
        │
        ▼
3. Revisão do Business DNA (editável)
   Público · Tom · Cores · Estilo · Estrutura · Keywords · Brand Voice
        │
        ▼
4. Geração
   Hero · Features · Benefícios · Testimonials · CTA · FAQ · Footer
   + imagens · ícones · copy · SEO
        │
        ▼
5. Editor
   Navigator (secções) · Canvas (preview ao vivo) · Properties (edição)
        │
        ▼
6. Publish
   noctra.site/empresa  →  (opcional) domínio próprio
```

Passos 1-4 já têm fundação técnica real: `BusinessProfileBuilder` + `BusinessIntelligence` cobrem grande parte do passo 3 (**exceto pesquisa de concorrentes — ver gap em [§9](#9-sistema-de-ia)**); `PipelineBuilder` + a chamada ao LLM cobrem o passo 4; `Project`/`PageState` cobrem o passo 5 ao nível de dados. O passo 6 (publicação real) **não existe ainda** — é o maior buraco entre o que está construído e um produto vendável (ver [§16](#16-riscos-técnicos)).

### 4.2 — Fluxo de edição (dentro do Editor)

- **Clicar num texto** → editar inline, ou premir **✨ Rewrite** (Mais profissional / Mais curto / Mais premium / Mais emocional / Mais técnico / Mais luxuoso / Mais persuasivo) → `RegenerateSection` com um prompt escopado a essa instância.
- **Clicar numa imagem** → Trocar / Upload / Unsplash / AI Generate / AI Edit → `UpdateContent` (uma vez resolvido o asset) — depende da [Biblioteca de Assets](#7-modelo-de-dados-project-page-section-operation).
- **Cada secção** tem **✨ Regenerate** (recria o conteúdo da secção) e **Improve** (a IA analisa só aquela secção e sugere ajustes, sem recriar do zero) — ambos mapeiam para `RegenerateSection`, com prompts diferentes.
- **Chat de IA global** — linguagem natural → um `Operation[]` estruturado, nunca HTML. "Faz o Hero mais premium" → `ChangeSectionTheme` + possivelmente `RegenerateSection`; "Move Testimonials para cima" → `MoveSection`; "Adiciona Pricing" → `InsertSection`; "Cria uma secção FAQ" → `InsertSection`. Ver [§8](#8-arquitetura-do-editor-visual).

### 4.3 — Fluxo pós-publicação

```
Dashboard: Visitantes · Conversões · CTR · Heatmap · SEO · Performance
           Lighthouse · Google Search Console · GA4 · Meta Pixel
        │
        ▼
IA semanal: "Detetei que o CTA converte pouco. Sugiro A/B Test. Aplicar? [Sim]"
```

Este fluxo depende inteiramente de existir uma pipeline de analytics própria — não existe ainda (v2, ver [§11](#11-roadmap-v1--v3)).

### 4.4 — Fluxos secundários

- **Biblioteca** — guardar uma secção (Hero, Pricing, FAQ, Footer, CTA, Cards) para reutilizar noutro projeto.
- **Histórico** — como o Figma: "Versão 1 · Versão 2 · Ontem · Há 3 dias · Restore." O motor (`PageHistory.records` + `goToVersion`) já existe e **agora sobrevive entre sessões**: o log de operações é persistido (`OperationLogEntry`) e reconstruído a partir de `Page.baseState` em cada `loadProject` (`app/lib/projectService.ts`) — falta apenas a UI que o mostra, não o mecanismo.
- **Equipas** — `Owner / Admin / Designer / Copywriter / Developer / Client`, com um projeto partilhado por vários utilizadores. A autenticação e a base multi-tenant já existem (`User`/`Project.ownerId`); falta o conceito de membros por projeto além do dono único — continua v2.

---

## 5. Arquitetura do produto

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌───────────┐   ┌──────────────┐
│  Onboarding  │→ │  Geração AI  │→ │   Editor    │→ │  Publish  │→ │  Otimização  │
│  (Projeto +  │   │  (pipeline + │   │  (Operations │   │  (site    │   │  pós-publish │
│   pesquisa)  │   │   LLM)       │   │   + Canvas)  │   │   real)   │   │  (analytics) │
└─────────────┘   └──────────────┘   └─────────────┘   └───────────┘   └──────────────┘
       │                  │                   │                │                │
   Project           PipelineResult      Operation[]       ProjectSettings   (novo:
   businessProfile   → LandingPage       → PageHistory      .publishing      AnalyticsEvent,
                      (por página)                                            Suggestion)
```

Cada seta é uma fronteira de dados já tipada ou explicitamente identificada como gap:

- Onboarding → Geração: `BusinessProfile` (já existe).
- Geração → Editor: `fromLandingPage()` / `projectFromLandingPage()` (já existe, ver [§7](#7-modelo-de-dados-project-page-section-operation)).
- Editor → Publish: **não existe** — falta decidir o que "publicar" significa tecnicamente (ver [§16](#16-riscos-técnicos), [§17](#17-decisões-arquiteturais)).
- Publish → Otimização: **não existe** — depende de uma pipeline de eventos de analytics própria.

Horizontal ao longo de todo o produto: **Biblioteca de componentes** (alimenta o Editor e a Geração) e **Equipas/permissões** (atravessam Projeto, Editor e Publish).

---

## 6. Arquitetura técnica

### Stack atual (validado, em produção de código)

| Camada | Tecnologia | Estado |
|---|---|---|
| Frontend/Backend | Next.js (App Router), React, TypeScript, Tailwind | Em uso, maduro |
| Geração AI | OpenAI SDK (`gpt-4.1-mini`, `response_format: json_object`) | Em uso |
| Rate limiting | Upstash Ratelimit/Redis, com fallback `InMemoryRateLimiter` | Em uso, mas Upstash **não está configurado** (`.env.local` só tem `OPENAI_API_KEY`/`AUTH_SECRET`) — hoje corre sempre no fallback em memória, que não escala corretamente por trás de múltiplas instâncias serverless |
| Base de dados | PostgreSQL (Neon recomendado) + Prisma 7, atrás de interfaces de repositório (`app/lib/repositories/`) | **Construído e testado** (contra implementações em memória — ver abaixo); precisa de um `DATABASE_URL` real para `prisma migrate dev` correr de facto |
| Autenticação | Auth.js v5, `Credentials` (email/password, bcrypt) + `@auth/prisma-adapter` | **Construído** — `auth.ts`, `/api/auth/[...nextauth]`, `/api/auth/signup` |
| Testes | Vitest + Testing Library (happy-dom) | 412 testes, disciplina alta — repositórios/serviço testados contra implementações em memória, sem precisar de uma base de dados real |
| Estado do editor | `app/editor/*` (Project/PageState/Operations/History) | Construído, **inalterado** por esta camada de persistência — `app/lib/projectService.ts` compõe os repositórios com estes redutores puros, sem lhes tocar |

### O que falta e é bloqueante para v1 (peças construídas, ligação real pendente)

A base está construída (schema, migrações versionáveis, repositórios com dupla implementação, Auth.js, rotas de API). O que falta é puramente operacional — dar-lhe uma base de dados real:

| Peça | Estado | Próximo passo |
|---|---|---|
| **Base de dados** | Schema completo (`prisma/schema.prisma`: `User`/`Account`/`Session`/`Project`/`Page`/`Section`/`OperationLogEntry`/`PageVersionTag`/`Asset`), repositórios Prisma + em memória, `app/lib/projectService.ts` | Fornecer um `DATABASE_URL` (Neon/Supabase) e correr `prisma migrate dev` — não corrido nesta sessão por não haver uma ligação real disponível |
| **Autenticação** | Sign-up/sign-in funcionais (Credentials), sessão JWT, `Project.ownerId` já aplicado em todas as rotas | Nenhum — funcional assim que a base de dados estiver ligada. OAuth (Google, etc.) é aditivo, não estrutural |
| **Armazenamento de assets** | `Asset`/`AssetRepository` já existem (tabela + CRUD) | Ainda falta o UPLOAD em si — Vercel Blob / Cloudflare R2 / S3 |
| **Versão publicada vs. em edição** | Ainda não resolvido — ver gap explícito em [§7](#7-modelo-de-dados-project-page-section-operation) | Decisão de arquitetura antes de construir Publish |
| **Serviço de publicação** | Não construído | Rota dinâmica Next.js com wildcard subdomain, mais tarde DNS para domínios próprios |
| **Pipeline de analytics** | Não construído | Ingestão própria leve, independente de GA4/Meta Pixel |

Ver o registo de decisões atualizado em [§17](#17-decisões-arquiteturais) — Neon+Prisma e Auth.js Credentials já não são "em aberto", são ADRs decididos e implementados.

### Princípios técnicos (herdados da Constitution, reafirmados)

1. TypeScript forte em todo o lado, nunca `any`.
2. Um módulo, uma responsabilidade.
3. Dados estruturados antes de qualquer chamada a um LLM — e agora, simetricamente: **saída do LLM sempre validada contra um schema estruturado antes de ser aplicada** (as `Operation`s do chat de IA nunca passam direto para `applyOperation` sem validação de forma).
4. Determinismo onde for possível: a estrutura/design de uma página gerada é sempre reprodutível a partir do mesmo prompt (seed determinística); só a cópia gerada pelo LLM não é (ver [§16](#16-riscos-técnicos)).
5. Nenhuma lógica de negócio dentro de componentes React.

---

## 7. Modelo de dados (Project, Page, Section, Operation)

Este é o modelo **já implementado e testado** em `app/editor/` (352 testes cobrem estas garantias). Documentado aqui para servir de referência única — qualquer alteração a estas formas deve atualizar este documento no mesmo commit.

```
Project
 ├── id, name
 ├── businessProfile        (reaproveita BusinessProfile de app/ai/types)
 ├── brand                  (reaproveita BrandingData de app/types/landing.ts)
 ├── assets: Asset[]        (id, type, url?, prompt?, label?)
 ├── settings                (publishing: { domain?, published })
 └── pages: ProjectPage[]
        ├── id, name, slug
        └── history: PageHistory
               ├── states: PageState[]        (states[0] = inicial, states[i] = após records[i-1])
               ├── records: OperationRecord[] (operations[], actor, label?, timestamp)
               └── cursor: number             (currentState = states[cursor])

PageState
 ├── id, dna (StrategyDNA), site (SEO/branding/images)
 └── sections: SectionInstance[]
        ├── id, type, variant
        ├── content            (por tipo: HeroData | StatsItem[] | FeatureItem[] | ... | null)
        ├── layout              (prominence, rhythm)
        ├── themeOverrides      (Partial<StrategyDNA>, {} = herda o tema da página)
        ├── visibility          ("visible" | "hidden")
        ├── locked              (boolean)
        ├── metadata            (createdBy: "ai"|"user"|"template", createdAt, updatedAt, label?)
        └── version             (incrementado a cada operação aplicada a esta instância)
```

### Operation (13 tipos, reducer puro `applyOperation`)

`InsertSection` · `DuplicateSection` · `DeleteSection` · `MoveSection` · `ChangeVariant` · `UpdateContent` · `RegenerateSection` · `ChangeTheme` · `ChangeSectionTheme` · `HideSection` · `ShowSection` · `LockSection` · `UnlockSection`

Regra fundamental: **é a única porta de escrita**. Nem a UI nem a IA constroem `PageState`/`Project` à mão — ambas emitem `Operation`s. Ver `docs/editor-architecture-report.md` para o racional completo.

### O que já foi resolvido desde a primeira versão deste documento

- ~~Sem `ownerId`/`teamId` em `Project`~~ — resolvido ao nível de persistência: `ProjectRecord.ownerId` (`app/lib/repositories/types.ts`) e todas as rotas de API verificam-no. Deliberadamente **não** foi adicionado ao tipo `Project` em memória (`app/editor/project.ts`) — esse continua agnóstico de quem é o dono, a autorização é sempre uma responsabilidade da camada de API, nunca do reducer puro.
- ~~Sem persistência~~ — resolvido: `Page.baseState` + `OperationLogEntry` (log completo, com `truncateAfter` para o "redo tail" ficar corretamente descartado após um undo seguido de uma nova edição) + `Section` (leitura rápida do estado atual). `app/lib/projectService.ts`'s `loadProject` reconstrói o `PageHistory` completo por replay — undo/redo sobrevive a um reload, não só a uma sessão.

### O que ainda falta neste modelo (gap real, não bug)

- **Sem conceito de "versão publicada" distinta da versão em edição.** Hoje, `Page.cursor` é simultaneamente "o que estou a editar" e (implicitamente) "o que seria mostrado se publicasse agora." Um produto real precisa de um `publishedAtIndex` (ou equivalente) separado do cursor de edição, para que editar não publique acidentalmente a meio de uma alteração. **Isto continua por resolver e continua bloqueante antes de construir Publish** — ver [§17](#17-decisões-arquiteturais). `PageVersionTag` (já no schema) é o candidato natural a carregar esse ponteiro quando a decisão for tomada.

---

## 8. Arquitetura do editor visual

Mapeamento direto do layout descrito pelo utilizador para o modelo de operações já construído:

| Zona da UI | Lê de | Escreve através de |
|---|---|---|
| **Navigator** (lista de secções: Hero, Features, Pricing, ...) | `PageState.sections` | `MoveSection` (drag), `HideSection`/`ShowSection`, `DuplicateSection`, `DeleteSection` |
| **Canvas** (preview ao vivo) | `<Landing state={currentState} />` — o renderer já construído, sem alterações necessárias | seleção de secção → estado de UI local (não uma Operation) |
| **Properties** (Typography, Spacing, Colors, Animations, Layout, Content, Visibility, Mobile) | `SectionInstance` selecionada | `ChangeVariant`, `UpdateContent`, `ChangeSectionTheme`, `HideSection` |

### Botões mágicos

| Botão | Escopo | Operation |
|---|---|---|
| **✨ Rewrite** (num texto) | Um campo de conteúdo | `RegenerateSection` com prompt de reescrita + o texto atual como contexto |
| **✨ Regenerate** (numa secção) | A secção inteira | `RegenerateSection` sem preservar o conteúdo atual como âncora |
| **Improve** (numa secção) | A secção inteira, analisada primeiro | Passo de análise (novo, sem chamada de escrita) → sugestão → `RegenerateSection` só se aceite |

Todos os três reutilizam o mesmo contrato de operação (`RegenerateSection`), com prompts diferentes — não são três mecanismos distintos, são três *entradas* para o mesmo mecanismo. Isto é o ponto central da arquitetura: **o número de formas de mudar uma página não deve crescer com o número de botões na UI.**

### Chat de IA global

```
Instrução em linguagem natural
        │
        ▼
LLM com function calling / structured output,
restrito ao schema de Operation (não gera HTML, nunca)
        │
        ▼
Operation[] validado (schema-checked antes de aplicar)
        │
        ▼
dispatchBatch(history, operations, "ai", label)
        │
        ▼
Um único passo de undo reverte a instrução inteira
```

A validação de schema antes de `dispatchBatch` é inegociável: `applyOperation` já rejeita operações inválidas (`OperationError`), mas o objetivo é nunca sequer tentar aplicar algo fora de forma — o LLM deve ser forçado (via structured output / JSON schema da API da OpenAI) a produzir apenas operações válidas, para que os erros sejam raros e claros, não a norma.

---

## 9. Sistema de IA

Quatro superfícies de IA distintas, cada uma com dependências diferentes:

| Superfície | Input | Output | Estado |
|---|---|---|---|
| **Geração** (`app/ai/*`) | Prompt do utilizador | `LandingPage` (dna + sections + copy) | **Construído** — 20+ módulos, determinístico na estrutura, LLM só para copy |
| **Pesquisa** (passo 2 do fluxo: concorrentes, SEO, branding sugerido) | Nome da empresa + website opcional | Enriquecimento do `BusinessProfile`/`brand` | **Não construído.** `BusinessIntelligence` hoje só lê o texto que o utilizador escreve, nunca pesquisa a web. Requer uma ferramenta de pesquisa web (ex: Bing/Google Search API, ou browsing tool) — é a peça de IA mais nova e a que introduz mais incerteza (latência, custo, qualidade da pesquisa) |
| **Edição escopada** (Rewrite/Regenerate/Improve/Chat) | Uma instrução + o `SectionInstance`/`PageState` relevante | `Operation[]` | **Contrato definido** (`RegenerateSection` existe como reducer), **chamada real ao LLM não implementada** |
| **Otimização pós-publicação** | Eventos de analytics agregados | Sugestões (texto) + proposta de operação (ex: A/B test) | **Não construído** — depende inteiramente da pipeline de analytics existir primeiro |

### Princípio herdado, agora bidirecional

A Constitution diz "structured data always comes before prompting an LLM" — isto continha implicitamente a direção "input." A partir deste blueprint, aplica-se também à direção "output": **a saída de qualquer LLM que altere o estado do produto tem de ser validada contra um schema estruturado antes de ser aceite.** A `Operation` union é esse schema para tudo o que não é copy generation pura.

---

## 10. Sistema de componentes

### Hoje

10 `SectionType` (`hero`, `logoCloud`, `stats`, `features`, `benefits`, `testimonials`, `pricing`, `faq`, `cta`, `footer`), cada um com 1 a 3 variantes visuais escolhidas continuamente a partir do `StrategyDNA` (ver o trabalho da Diversity Engine, `docs/diversity-engine-report.md`). Componentes React fixos por tipo+variante (`app/components/*.tsx`) — não há componentes definidos pelo utilizador.

### Biblioteca (v2, já preparada ao nível de dados)

Guardar uma secção como reutilizável é, na prática, guardar um `SectionInstance` com `metadata.createdBy` preservado e um novo campo (`templateId`, ainda por adicionar — mudança aditiva trivial) fora do `Project` de origem, numa coleção pessoal/da equipa. `DuplicateSection` já resolve a parte "clonar dentro do mesmo projeto"; a Biblioteca resolve "clonar entre projetos."

### Marketplace (v3)

Templates/componentes/temas/blocos partilhados ou vendidos entre utilizadores — a mesma unidade de dados da Biblioteca, com um dono diferente do consumidor e (eventualmente) preço. Não é um sistema novo, é a Biblioteca com uma camada de distribuição e monetização por cima.

---

## 11. Roadmap v1 → v3

Sequenciado por dependência real, não por desejo. Cada item indica do que depende.

### v1.0 — "Publicar em 10 minutos" (MVP comercial)

*Pré-requisito de tudo o resto: sem isto não há produto vendável, só uma demonstração técnica.*

- [x] Autenticação + persistência de `Project` numa base de dados real — **construído** (Auth.js Credentials, schema Prisma, repositórios, `app/lib/projectService.ts`, rotas `/api/projects*`); falta apenas ligar a um `DATABASE_URL` real e correr `prisma migrate dev`
- [x] `app/page.tsx` exige sessão e persiste o projeto gerado via `POST /api/projects` em vez de o manter só em memória do browser
- [ ] Fluxo completo: criar projeto → gerar (pesquisa simplificada: Business DNA inferido do próprio texto do utilizador, **sem pesquisa de concorrentes ainda** — ver gap em [§9](#9-sistema-de-ia)) → editor → publicar
- [ ] Editor visual funcional: Navigator + Canvas + Properties, ligados às `Operation`s já existentes (`MoveSection`, `UpdateContent`, `ChangeVariant`, `HideSection`, `DuplicateSection`, `DeleteSection`) — o motor de sincronização já existe (`dispatchAndPersist`, `POST /api/projects/:id/pages/:pageId/operations`), falta a UI que o chama — **sem IA de edição ainda**, edição manual primeiro
- [ ] Publicação real: `noctra.site/<slug>`, com o conceito de "versão publicada" resolvido ([§7](#7-modelo-de-dados-project-page-section-operation), [§17](#17-decisões-arquiteturais))
- [ ] Armazenamento de assets (upload básico)
- [ ] Uma página por projeto é aceitável para o v1 — `Project` já suporta múltiplas, mas a geração de página adicional por IA fica para v1.5

### v1.5

- [ ] `RegenerateSection` ligado a uma chamada real ao LLM escopada (Rewrite/Regenerate/Improve)
- [ ] Chat de IA global → `Operation[]` validado
- [ ] Geração de páginas adicionais por IA (About/Pricing/Contact) dentro de um projeto existente
- [ ] Domínios próprios (para lá do subdomínio `noctra.site`)
- [ ] Dashboard de analytics básico (Visitantes, CTR) — pipeline de eventos própria, leve

### v2.0

- [ ] Pesquisa de concorrentes/mercado (a peça de IA mais nova, ver [§9](#9-sistema-de-ia))
- [ ] IA de otimização pós-publicação (sugestões semanais, proposta de A/B test)
- [ ] Biblioteca de componentes (guardar/reutilizar secções entre projetos)
- [ ] Equipas e papéis (`Owner`/`Admin`/`Designer`/`Copywriter`/`Developer`/`Client`)
- [ ] UI de Histórico de versões (o motor — `goToVersion` — já existe; falta a interface)

### v3.0

- [ ] Marketplace (templates/componentes/temas/plugins, monetizado)
- [ ] Colaboração em tempo real (multiplayer) — a base já foi deliberadamente deixada pronta (`OperationRecord` é serializável, atribuível e determinístico, ver `docs/editor-architecture-report.md`)
- [ ] SEO/performance avançados: Lighthouse nativo, integrações GSC/GA4/Meta Pixel
- [ ] Camada white-label/agência (papel `Client`, gestão multi-cliente)

---

## 12. Estratégia de monetização

Modelo SaaS por níveis, alinhado com o custo real de IA (cada regeneração/chat é uma chamada OpenAI recorrente, não um custo único como a maioria do SaaS tradicional):

| Nível | Preço (indicativo) | Inclui | Limite de IA |
|---|---|---|---|
| **Free/Trial** | €0 | 1 projeto, 1 página, subdomínio `noctra.site`, marca de água | Geração inicial só, sem regenerações |
| **Starter** | ~€15-25/mês | Vários projetos, multi-página, domínio próprio | Crédito de IA mensal (regenerações/chat) |
| **Growth** | ~€40-60/mês | Equipas, mais páginas, analytics, sem marca de água | Crédito de IA maior, prioridade |
| **Agency/Business** | Preço por escala/contacto | Projetos ilimitados, white-label, papel `Client`, suporte prioritário | Crédito de IA por cliente gerido |

Fontes de receita adicionais:
- **Comissão de Marketplace** (v3) — partilha de receita em templates/componentes vendidos.
- **Add-on de créditos de IA** — consumo adicional além do incluído no plano, dado que o custo de OpenAI escala com uso, não com contas.

A decisão de preços exatos fica fora de âmbito deste documento (é uma decisão de negócio, não de arquitetura) — o que importa aqui é a estrutura: **os limites por nível têm de estar alinhados com o custo real de IA por ação (geração completa vs. regeneração escopada vs. mensagem de chat), não com um número arbitrário.**

---

## 13. Critérios de qualidade

Herdados e reafirmados da Constitution, mais os critérios específicos do produto:

**Código** (inalterado desde a Constitution):
- Tipagem forte em todo o lado, nunca `any`.
- Uma responsabilidade por módulo, testável de forma independente.
- Sem lógica de negócio dentro de componentes React.
- Sem lógica duplicada.

**Produto** (novo, específico deste blueprint):
- Uma página gerada tem de atingir um score mínimo antes de ser mostrada ao utilizador como "pronta" — o "Scoring Engine" já estava na visão original da Constitution (conversão/UX/SEO/acessibilidade) mas nunca foi construído; é agora um requisito de qualidade explícito para v1.5+, não apenas uma ideia.
- Toda a interação no editor tem de ser reversível — decorre diretamente da garantia já cumprida pelo motor de `Operation`/`History` (`docs/editor-architecture-report.md`); nenhuma UI nova pode contornar isto.
- Nenhuma ação de IA pode alterar o estado sem produzir um `OperationRecord` atribuível — se uma funcionalidade nova de IA não conseguir expressar-se como `Operation`s, o desenho dessa funcionalidade está errado, não o modelo de dados.
- Determinismo estrutural preservado: o mesmo prompt, no mesmo estado do motor, produz sempre a mesma estrutura/design (não necessariamente a mesma cópia — ver [§16](#16-riscos-técnicos)).

---

## 14. Requisitos de performance

| Momento | Alvo | Porquê |
|---|---|---|
| Pesquisa (passo 2) | 20-40s (já definido pela visão do utilizador) | Tempo de espera aceitável com feedback visual claro |
| Geração inicial (passo 4) | <30s adicionais | Soma com a pesquisa para manter o total dentro dos "10 minutos" da missão |
| Aplicar uma `Operation` no editor | <16ms (um frame) | `applyOperation` já é um reducer puro em memória — isto é uma garantia estrutural existente, não uma meta a atingir; o risco está na re-renderização React a escalas grandes, não no reducer |
| Rewrite/Regenerate escopado | poucos segundos, com streaming quando possível | Sente-se "IA a trabalhar," não "página a recarregar" |
| Site publicado (visitante final) | Lighthouse Performance ≥ 90 | O site publicado é o produto que os *clientes dos nossos clientes* veem — a fasquia é mais alta aqui do que no editor |

---

## 15. Critérios de escalabilidade

- **Multi-tenant desde o dia 1 dos dados persistidos** — `ownerId`/`teamId` fazem parte do schema de `Project` assim que a base de dados existir, não um "adicionar depois."
- **Pipeline de geração já é stateless e pura** (`buildPipeline(prompt)`) — escala horizontalmente sem alterações.
- **Separação entre "app do editor" e "serviço de sites publicados"** — servir os sites publicados através da mesma instância Next.js que corre o editor é aceitável para v1, mas não deve ser assumido como a arquitetura final: sites publicados devem tender para conteúdo estático/cacheado, servido independentemente da carga do editor.
- **Custo de IA por utilizador tem de ser mensurável desde o v1** — sem isto, os níveis de preço em [§12](#12-estratégia-de-monetização) não podem ser calibrados com dados reais.

---

## 16. Riscos técnicos

| Risco | Impacto | Mitigação |
|---|---|---|
| ~~Zero persistência hoje~~ | ~~Um `Project` desaparece ao fechar o browser~~ | **Resolvido** — schema Prisma + repositórios + `app/lib/projectService.ts` construídos e testados; falta ligar a uma base de dados real (`DATABASE_URL`) |
| ~~Zero autenticação/multi-tenancy~~ | ~~Sem contas não há "os meus projetos"~~ | **Resolvido** — Auth.js Credentials + `Project.ownerId` aplicado em todas as rotas |
| **Dependência de um único fornecedor de LLM (OpenAI)** | Latência/custo/disponibilidade fora do nosso controlo | Aceitar para v1 (não vale a pena abstrair um provider antes de ter utilizadores); revisitar se o custo por utilizador em [§15](#15-critérios-de-escalabilidade) justificar |
| **`JSON.parse(content)` sem validação de schema nem retry** (`app/api/generate/route.ts`) | Uma resposta do LLM mal formada falha o pedido inteiro sem tentativa de correção | Adicionar validação de schema (ex: Zod) + uma tentativa de repetição/reparo antes do v1.5, quando o volume de pedidos justificar o investimento |
| **Determinismo estrutural vs. não-determinismo da cópia** | O mesmo prompt pode produzir texto ligeiramente diferente em execuções diferentes, mesmo com estrutura/design idênticos | Comportamento aceite e intencional — documentar claramente para não ser confundido com um bug; nunca prometer "o mesmo prompt produz sempre exatamente a mesma página" sem qualificar "na estrutura, não na cópia" |
| **Modelo de conteúdo por tipo fixo (`SectionType` union fechada)** | Um builder verdadeiramente livre (à Framer/Webflow) pode eventualmente exigir secções de forma arbitrária, não apenas as 10 tipificadas | Não é urgente — os 10 tipos cobrem a esmagadora maioria de landing pages de PME; revisitar apenas se a procura por customização total se tornar um pedido recorrente de utilizadores reais, não antecipadamente |
| **Custo/latência de geração multi-página** | Gerar N páginas via N chamadas ao LLM multiplica custo e tempo de espera | Necessário desenho de fila/lote antes de v1.5 permitir gerar várias páginas de uma vez |
| **`InMemoryRateLimiter` como fallback silencioso em produção** | Sob múltiplas instâncias serverless, o limite de pedidos não é realmente respeitado | Configurar Upstash Redis em produção antes do lançamento público — a dependência já existe no `package.json`, só falta a configuração |
| ~~`applyOperation` sem `default` no switch~~ | ~~Um `kind` desconhecido (ex: corpo de pedido HTTP malformado) atravessava o switch silenciosamente e devolvia `undefined` em vez de um erro~~ | **Resolvido** — encontrado e corrigido ao construir a camada de persistência: `applyOperation` agora lança `OperationError` para qualquer `kind` não reconhecido, e `app/lib/validateOperations.ts` rejeita o pedido com 400 antes disso, na fronteira da API |

---

## 17. Decisões arquiteturais

Registo estilo ADR das decisões já tomadas (com o porquê) e das que estão explicitamente em aberto.

### Já decidido e construído

- **ADR-1 — Estrutura determinística, cópia não-determinística.** O design/estrutura de uma página é uma função pura de seed (derivada do prompt); só a cópia final passa por um LLM. Isto é o que torna a Diversity Engine testável sem chamadas reais à OpenAI.
- **ADR-2 — Todas as mutações de estado passam por `Operation`/`applyOperation`.** Nem UI nem IA têm um caminho de escrita alternativo. Ver `docs/editor-architecture-report.md`.
- **ADR-3 — Conteúdo por instância de secção, não por tipo.** Permite múltiplas secções do mesmo tipo e reordenação livre; foi uma escolha explícita sobre a alternativa mais simples (uma secção por tipo), feita antes de o custo de mudar depois se tornar proibitivo.
- **ADR-4 — `Project` agrupa páginas independentemente indexáveis, cada uma com o seu próprio `PageHistory`; sem undo/redo ao nível do projeto.** As edições frequentes acontecem ao nível da secção/página; mudanças ao nível do projeto (nome, marca) são raras e não justificam duplicar o motor de histórico.
- **ADR-5 — Adaptador (`fromLandingPage`/`toLandingPage`) mantém o schema de saída do LLM (`LandingPage`) desacoplado do modelo editável (`PageState`).** A pipeline de geração nunca precisa de saber que o editor existe.
- **ADR-6 — Base de dados: PostgreSQL (Neon) + Prisma 7, sempre atrás de interfaces de repositório.** O resto da aplicação depende de `ProjectRepository`/`PageRepository`/`SectionRepository`/`OperationLogRepository`/`AssetRepository` (`app/lib/repositories/types.ts`), nunca do cliente Prisma diretamente — cada interface tem uma implementação Prisma (real) e uma em memória (testes/fallback local, o mesmo papel que `InMemoryRateLimiter` já tinha para `RateLimiter`). Prisma 7 exige `prisma.config.ts` + um driver adapter explícito (`@prisma/adapter-pg`) em vez da antiga resolução implícita de `url` no schema — documentado em `prisma.config.ts`/`app/lib/prisma.ts` para não ser confundido com um erro da próxima vez que alguém mexer nisto.
- **ADR-7 — Autenticação: Auth.js v5, provider `Credentials` (email/password, bcrypt) antes de qualquer OAuth.** Zero registo de aplicação externa (sem passar pela Google Cloud Console) para ter um ciclo completo a funcionar só com uma ligação a uma base de dados. Adicionar Google/GitHub/etc. mais tarde é uma entrada no array `providers`, não uma restruturação.
- **ADR-8 — `Section` é uma tabela própria, não JSON dentro de `Page`.** Decisão explícita do utilizador, motivada por preparar o terreno para a Biblioteca/Marketplace (§10) poder um dia consultar secções independentemente da página/histórico a que pertencem.
- **ADR-9 — O log de operações persistido é a fonte de verdade; `Section` é uma cache de leitura rápida do estado atual.** `Page.baseState` (o `PageState` inicial, gravado uma única vez) + `OperationLogEntry` (log completo, com `truncateAfter` a implementar a semântica padrão de "descartar o redo tail ao editar depois de um undo") permitem reconstruir o histórico completo por replay (`app/lib/projectService.ts`'s `loadProject`) — undo/redo sobrevive a um reload da página, não só a uma sessão do browser. `Section` nunca é a fonte de verdade, só evita ter de repetir esse replay em cada carregamento normal.

### Em aberto — precisam de decisão explícita antes de implementação (não decidir sozinho)

- **O que significa "publicar" tecnicamente** — decisão que tem de vir ANTES de construir Publish: introduzir um ponteiro de "versão publicada" (`publishedAtIndex` ou equivalente, possivelmente sobre `PageVersionTag`, já no schema) separado do cursor de edição, para que editar nunca publique acidentalmente uma alteração a meio.
- **Serviço de armazenamento de assets** — recomendação: Vercel Blob (menor fricção de integração com o stack atual) ou Cloudflare R2 (mais barato a escala). `Asset`/`AssetRepository` já existem; falta o mecanismo de upload em si.

Estas duas decisões continuam a alterar significativamente a arquitetura — nenhuma deve ser tomada silenciosamente durante a implementação de uma funcionalidade; cada uma merece a sua própria confirmação explícita antes do primeiro commit que a use.

---

## 18. Funcionalidades futuras

Backlog além do v3, não sequenciado, para não perder ideias já validadas pela visão original:

- Heatmaps reais (não apenas métricas agregadas) no dashboard pós-publicação.
- Testes A/B geridos automaticamente pela IA (propor, correr, concluir, aplicar o vencedor).
- Plugins de terceiros (marketplace v3 estendido a funcionalidade, não só a design).
- Exportação de código (para utilizadores que eventualmente querem "sair" do Noctra com o site em mãos — uma decisão de posicionamento, não só técnica, a ponderar com cuidado por poder reduzir retenção).
- Internacionalização de sites publicados (um projeto, várias línguas, geridas como variantes de página, não projetos separados).
- App móvel para gerir o dashboard/aprovar sugestões de IA em trânsito.
