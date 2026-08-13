# Design system

Este documento não descreve um sistema que existe. Descreve **o que já existe, onde não
existe, e porque é que a diferença entre os dois é o problema.**

---

## O inventário, medido

| | Sites gerados (`app/components/`) | Interface do produto (o resto de `app/`) |
|---|---|---|
| Componentes | 39 | 31 |
| Consomem um tema tipado | **35** | **0** |
| Escala de cor | `ThemeConfig`, derivada por paleta | `zinc-200` … `zinc-950`, à mão |
| Tipografia | `theme.typography.*` | classes soltas |
| Espaçamento | `LayoutPersonality`, com ritmo | valores por ecrã |
| Botões | `PrimaryButton`, `SecondaryButton` | **16 ficheiros com botões desenhados à mão** |
| Testes do sistema | `theme.test.ts`, `palettes.test.ts`, `layout.test.ts` | nenhum |

## O achado

**Construímos um design system para os nossos clientes e nunca usámos um.**

Os sites que o produto **gera** têm um sistema a sério: cores derivadas de uma paleta com
regras de contraste, uma personalidade de layout que decide o ritmo vertical, tipografia
tipada, dois botões com uma regra explícita sobre o que abre em separador novo. Trinta e
cinco componentes consomem-no. Tem testes.

A interface onde o dono de restaurante **trabalha** — o formulário, a pré-visualização, o
editor, o painel, o login, a recuperação de password — não tem nada disso. Tem dezasseis
ficheiros com um botão redesenhado em cada um, uma escala de cinzentos escolhida ecrã a ecrã,
e sete valores hexadecimais escritos à mão.

É a inversão exacta do que se esperaria, e explica com precisão a sensação de *side-project*
que a missão quer eliminar: **o que sai para o cliente do restaurante é sistemático; o
produto por onde o restaurante passa é improvisado.**

Nenhuma quantidade de polimento ecrã a ecrã corrige isto, porque o problema não é a aparência
de nenhum ecrã — é não haver um sítio onde a decisão viva.

---

## O que fazer, e por que ordem

A regra 18 da constituição: cada regra num sítio só. A regra 16: conhecimento duplicado é
conhecimento que vai divergir. Dezasseis botões são dezasseis oportunidades de divergir, e já
divergiram — `bg-zinc-900`, `bg-zinc-200`, `bg-black`, `bg-zinc-800` e `bg-zinc-950` aparecem
todos como fundo de botão.

**1. Extrair o que já se repete, sem inventar nada.** Os dezasseis botões colapsam em três
variantes que já existem de facto no código: primário (`bg-white text-black`), secundário
(`border border-zinc-700`) e destrutivo. Não é desenhar — é dar nome ao que já lá está.

**2. Uma escala, não uma paleta nova.** O `zinc` do Tailwind já é a escala; o que falta é
dizer qual dos nove tons significa o quê — fundo, superfície, borda, texto, texto secundário.
Cinco nomes, e a escolha deixa de ser feita ecrã a ecrã.

**3. Os estados que hoje não existem em lado nenhum.** `focus-visible` para navegação por
teclado, `disabled` consistente, e o estado de carregamento. São a diferença entre software
que parece acabado e software que parece um protótipo, e não aparecem em nenhum dos dezasseis.

**4. Só depois, densidade e ritmo.** Espaçamento e hierarquia tipográfica valem pouco antes de
os componentes existirem, porque cada ecrã continuaria a decidir por si.

**O que NÃO fazer:** um sistema novo do zero, ou trazer uma biblioteca. Já existe um sistema
neste repositório, com testes, escrito para este produto. O trabalho é ter um segundo para a
outra metade — ou perceber se o que já existe serve as duas.

---

## A pergunta em aberto, e é de arquitectura

O `ThemeConfig` dos sites gerados é **por restaurante**: as cores vêm da paleta que a cozinha
e o estilo do dono escolheram. A interface do produto é **uma só** — é sempre o Suvka.

São dois problemas diferentes com uma raiz comum, e a decisão entre unificar ou manter
separado ainda não está tomada:

- **Unificar** dá um vocabulário só, e obriga o tema do produto a ser mais uma paleta — o que
  é honesto, porque é o que ele é.
- **Separar** mantém o tema dos sites livre de restrições que só a nossa interface tem, e
  evita que uma mudança na nossa marca toque nos sites dos clientes.

Inclino-me para **separar**, por uma razão de custódia e não de estética: o tema de um site
publicado está congelado no retrato, e uma alteração ao nosso design system nunca pode ter
como efeito secundário mudar o aspecto do site de um restaurante que já está no ar.

Isto é uma ADR por escrever, não uma conclusão.
