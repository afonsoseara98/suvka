# Constituição de engenharia

Como se trabalha neste repositório. Vale para pessoas e para qualquer assistente — o
`AGENTS.md` aponta para aqui.

Não é um manual de estilo. É o que separa uma explicação plausível de uma causa provada, e
existe porque a diferença entre as duas já custou dinheiro a este produto.

---

## Investigar

**1. A primeira explicação plausível não é a causa.** Continua a perguntar *o que causou
isto* até deixar de ser possível. Sintoma, causa e causa-raiz são três coisas.

**2. Não procures confirmar a hipótese — tenta destruí-la.** Para cada uma: que factos a
suportam, quais a contradizem, como se prova, como se refuta. Fica a que sobrevive.

**3. Separa as categorias e nunca as mistures.** *Observação* é o que se viu. *Prova* é o
que se mediu. *Inferência* é o que se deduz. *Hipótese* é o que ainda não se sabe. Uma frase
que junte duas destas é uma frase que engana alguém, mais tarde, com toda a confiança.

**4. "Não sei" é uma resposta completa** quando vem seguida do que falta descobrir.

**5. Antes de pedir um comando, pergunta se já tens como descobrir.** Se tens, analisa.

**6. Não voltes a pedir o que já foi dito.** Quem responde a um relatório detalhado com
perguntas já respondidas está a devolver o trabalho a quem o fez.

**7. O código é a verdade.** Com o repositório à mão, não se especula sobre frameworks —
confirma-se. *Verificado a sério neste projecto:* o `$` do JavaScript, ao contrário do de
Perl e Python, não aceita uma quebra de linha final. Assumir o contrário teria acrescentado
código a defender de um problema inexistente; assumir a favor teria deixado um buraco.

**8. Termina no commit, no ficheiro, na função e na linha.** Não antes.

**9. Os registos contam uma sequência, não uma lista de erros.** Reconstrói o tempo.

**10. Um stacktrace nunca chega.** Segue HTTP → router → handler → serviço → repositório →
driver → base de dados. *Como isto se paga:* um `22021` num `findUnique` parecia contradizer
um problema de input. Não contradizia — o Postgres valida a codificação do **parâmetro**
antes de comparar seja com o que for, e um `SELECT` falha exactamente como um `INSERT`. A
cadeia completa explicou-o; o stacktrace sozinho tinha mandado procurar no sítio errado.

---

## Medir

**11. Quantifica ou cala-te.** Nunca "mais rápido": **2 consultas → 1**. Nunca "menos
memória": MB. Nunca "mais eficiente": o número.

**12. A medição manda no raciocínio, mesmo depois de escrito.** *Aconteceu:* eu tinha escrito
que uma memoização poupava "duas idas ao Postgres". Medido com `pg_stat_user_tables`, a
tabela `Project` nunca fez duas — o dataloader do Prisma junta `findUnique` idênticos no
mesmo tick. O desperdício estava noutra tabela, e o ganho real era 4,8 → 2,6 varrimentos por
visita. A conclusão certa pela razão errada continua a ser uma conclusão errada.

**13. Contar é: consultas, IO, alocações, rede, disco, locks.** Desempenho é uma
funcionalidade, e mede-se como as outras.

---

## Corrigir

**14. A correcção resolve o problema inteiro, não só o erro.** Um byte nulo a rebentar numa
consulta era o sintoma; cada 404 da internet a custar uma ida à base de dados era o problema.
Corrigir só o primeiro deixava o segundo a crescer em silêncio.

**15. O patch mais pequeno que resolve a causa.** Não se reescreve arquitectura para fechar
um erro.

**16. Antes e depois, com prova.** O problema existia — aqui está. Deixou de existir — aqui
está.

**17. Pergunta sempre o que mais pode partir.** *Aconteceu:* limpar as fotografias de
rascunhos expirados parecia trivial, até se ver que publicar **também** apaga o rascunho — a
mesma linha, por uma razão oposta. A limpeza no sítio errado destruía as fotografias de um
restaurante que acabou de publicar.

**18. Conhecimento duplicado é conhecimento que vai divergir.** A forma de um slug vive ao
lado da função que a produz, e em mais lado nenhum.

**19. Cada regra num sítio só.**

---

## Escrever

**20. Os comentários explicam PORQUÊ, nunca O QUÊ.** O código já diz o quê. O que não se lê
no código é o que foi tentado antes, o que partiu, e o que se decidiu não fazer.

**21. Um teste demonstra comportamento, não cobertura.** O nome do teste é a frase que
alguém vai ler quando ele falhar daqui a um ano.

**22. Fixa as subtilezas em testes, não em comentários.** Uma garantia que depende de uma
particularidade da linguagem precisa de um teste que a prenda — senão é uma coincidência à
espera de um refactor.

---

## Assumir

**23. Todo o input externo é malicioso até prova em contrário.**

**24. A internet pública é bots, crawlers, scanners, fuzzers e exploit kits** — e é a maior
parte do tráfego de um servidor pequeno. *Verificado neste projecto:* nas primeiras 24 horas
no ar, três das quatro entradas de erro no journal eram varrimento automático.

**25. Uma falha que não deixa rasto é pior do que uma que rebenta.** Ver o `FRICCAO.md`: o
que custa dinheiro é o que ninguém vê acontecer.

---

## Rever

**26. As perguntas de um Principal Engineer:** isto escala? envelhece bem? reduz
complexidade? elimina uma classe inteira de erros — ou só este?

**27. O objectivo não é fazer funcionar. É tornar difícil voltar a partir.**

---

## Nunca fechar uma investigação sem responder

1. Porque aconteceu?
2. **Porque aconteceu agora, e não antes?**
3. Que commit o introduziu?
4. Porque é que a correcção resolve a causa e não o sintoma?

A segunda é a que mais vezes se salta e a que mais vezes revela a verdadeira causa. Neste
projecto, a resposta a "porquê agora" foi um commit nosso de três dias antes, que pôs
`app/[slug]` na raiz do domínio — e transformou cada 404 do mundo numa consulta ao Postgres.

---

## Uma nota sobre quem escreve isto

Metade dos exemplos acima são erros meus, apanhados por uma medição ou por um teste que eu
próprio escrevi para provar o contrário do que acabou por acontecer. Estão aqui de propósito:
uma constituição só escrita com acertos ensina a ter razão, e o que é preciso ensinar é o que
fazer quando não se tem.
