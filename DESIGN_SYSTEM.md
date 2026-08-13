# Design system

## Estado

| | Sites gerados | Interface do produto |
|---|---|---|
| Sistema | `ThemeConfig` + `palettes` + `layout` | `app/ui/` — Button, Field, Notice |
| Componentes ligados | 35 | 12 |
| Botões fora do sistema | 0 | **0** *(excepto `/benchmark`, interno)* |
| Campos sem sinal de foco | — | **0** |

Os dois sistemas são **separados de propósito**, e a razão é de custódia e não de estética:
o tema de um site publicado está congelado no retrato, e uma alteração à nossa marca nunca
pode ter como efeito secundário mudar o aspecto do site de um restaurante que já está no ar.

**O que muda a partir daqui:** o próximo ecrã é consistente por omissão e não por disciplina.
Quem escrever um botão novo tem de decidir activamente *não* usar o sistema — o inverso de
como estava, onde usá-lo exigia saber que existia.

---

## O inventário que motivou isto, medido antes

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

## O que o sistema decide, e porquê

**Um só desenho para o estado desactivado.** Havia três — `opacity-50`, `opacity-40`, e um
fundo cinzento com texto cinzento. Um utilizador não devia ter de aprender três maneiras de
o produto dizer *"agora não"*.

**O botão perigoso leva vermelho na borda e no texto, nunca no fundo.** Um fundo vermelho
puxa o olho para a acção que menos queremos que seja carregada por engano.

**O `id` do `Field` é obrigatório.** Um campo sem `<label for>` é anunciado por um leitor de
ecrã como *"edit text"* e mais nada. Tornar isso possível de esquecer era garantir que ia ser
esquecido.

**`role="alert"` só nos erros.** Um `alert` interrompe o leitor de ecrã a meio — correcto
para *"não foi possível publicar"*, grosseiro para *"link copiado"*, que usa `status`.

**Três tons de aviso e não cinco.** O amarelo de "atenção" e o azul de "informação" não
existem porque não existem no produto: tudo o que o Suvka diz ao dono é um erro, uma
confirmação, ou uma explicação — e a explicação é texto normal, não uma caixa colorida.

**`buttonClasses()` e `fieldClasses()` além dos componentes.** Um link que navega tem de ser
uma âncora: um `<button>` com `router.push` dentro não abre em separador novo com Ctrl, não
se copia com o botão direito, e é anunciado como botão quando leva a outro sítio. Em vez de
dar um `as` ao `Button` — que é onde estas abstracções começam a mentir — exporta-se o
desenho. A regra vive num sítio só; muda quem a veste.

**Uma excepção, e está comentada onde vive.** O campo do endereço no ecrã de publicação
mantém `outline-none`: está dentro de um grupo com o prefixo do domínio à esquerda, e o anel
pertence ao contentor. Dois anéis, um dentro do outro, leem-se pior do que nenhum.

---

## O que falta

**Densidade, ritmo vertical e hierarquia tipográfica.** Deliberadamente adiados: valiam pouco
antes de os componentes existirem, porque cada ecrã continuaria a decidir por si.

**O `/benchmark`.** Ferramenta interna, 404 em produção. Fica fora até deixar de ser as duas
coisas.

---

## A pergunta que estava em aberto — decidida

O `ThemeConfig` dos sites gerados é **por restaurante**: as cores vêm da paleta que a cozinha
e o estilo do dono escolheram. A interface do produto é **uma só** — é sempre o Suvka.

São dois problemas diferentes com uma raiz comum, e a decisão entre unificar ou manter
separado ainda não está tomada:

- **Unificar** dá um vocabulário só, e obriga o tema do produto a ser mais uma paleta — o que
  é honesto, porque é o que ele é.
- **Separar** mantém o tema dos sites livre de restrições que só a nossa interface tem, e
  evita que uma mudança na nossa marca toque nos sites dos clientes.

**Decidido: separar**, por custódia e não por estética. O tema de um site publicado está
congelado no retrato, e uma alteração ao nosso design system nunca pode ter como efeito
secundário mudar o aspecto do site de um restaurante que já está no ar.

O `app/ui/` é o nosso; o `app/components/ui/` é o deles. Os dois nomes são parecidos de mais
para ficarem sem explicação — está no cabeçalho de ambos.
