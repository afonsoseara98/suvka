import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/app/ui/Button";

// A PÁGINA MAIS VISTA DO PRODUTO, E A ÚNICA QUE NUNCA TINHA SIDO DESENHADA
//
// Até aqui isto era o 404 que vem com o Next: fundo branco, tipo de letra do sistema, e
// "This page could not be found" — em inglês, no domínio de um restaurante português, com o
// nosso nome no separador.
//
// Quem cá chega:
//
//   - um cliente que escreveu mal o endereço que o dono lhe deu ao telefone;
//   - alguém que seguiu um link antigo do Instagram;
//   - e, desde que os sites passaram para a raiz, todo o varrimento automático da internet,
//     que é a maior parte do tráfego de um servidor pequeno.
//
// Os dois primeiros são pessoas que estavam a tentar chegar a um restaurante. Receberem uma
// página em inglês é a coisa mais "side-project" que este produto fazia, e fazia-a mais
// vezes do que fazia qualquer outra.
//
// O QUE ISTO NÃO FAZ
//
// Não adivinha o restaurante que a pessoa queria. Sabemos o endereço que ela escreveu e mais
// nada — sugerir "talvez quisesse dizer X" a partir de um slug parecido era exactamente o
// tipo de palpite confiante que este produto não dá. Ver ENGINEERING_CONSTITUTION.md.
//
// E não empurra a nossa homepage a um cliente de restaurante, porque a ele não lhe serve de
// nada. Diz-lhe o que aconteceu, sugere o que resolve mesmo — voltar a ver o endereço, ou
// procurar o nome — e só depois, em baixo e em voz baixa, fala com quem talvez seja dono.

export const metadata: Metadata = {
  title: "Endereço não encontrado",
  // Nada aqui deve ser indexado: são endereços que não existem.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-md text-center">
        <p className="text-sm uppercase tracking-widest text-zinc-600">Endereço não encontrado</p>

        <h1 className="mt-5 text-2xl font-bold leading-snug sm:text-3xl">
          Não há nenhum site neste endereço.
        </h1>

        <p className="mt-4 leading-relaxed text-zinc-400">
          Se procura um restaurante, confirme o endereço — basta uma letra trocada. Se o
          recebeu por mensagem, abra o link em vez de o escrever.
        </p>

        {/* Uma acção só, e é a que serve a quem cá chegou por engano. */}
        <div className="mt-8">
          <Link href="/" className={buttonClasses("secondary", "md")}>
            Ir para o início
          </Link>
        </div>

        {/* Em baixo e discreto, de propósito: nove em cada dez pessoas que veem esta página
            não são donos de restaurante, e transformar um erro delas num anúncio é o que faz
            um produto parecer que só pensa em si próprio. */}
        <p className="mt-12 border-t border-zinc-900 pt-8 text-sm text-zinc-600">
          Tem um restaurante?{" "}
          <Link href="/new/restaurant" className="text-zinc-400 underline underline-offset-4 transition hover:text-white">
            Faça o site dele em dois minutos
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
