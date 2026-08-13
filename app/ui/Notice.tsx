import type { ReactNode } from "react";

// O QUE O PRODUTO DIZ QUANDO CORREU MAL — OU BEM
//
// Havia oito destes escritos à mão, com quatro medidas de padding, dois raios de canto e
// duas opacidades de fundo. Alguns tinham `role="alert"`, a maioria não — o que significa
// que um leitor de ecrã anunciava uns e ficava calado nos outros, sem nenhuma razão.
//
// `role="alert"` só nos erros, e é deliberado: um `alert` interrompe o que o leitor de ecrã
// estiver a dizer. Isso é o correcto para "não foi possível publicar" e é grosseiro para
// "link copiado" — que usa `status`, e espera pela sua vez.
//
// Três tons e não cinco. O amarelo de "atenção" e o azul de "informação" não existem aqui
// porque não existem no produto: tudo o que o Suvka diz ao dono é um erro, uma confirmação,
// ou uma explicação — e a explicação é texto normal, não uma caixa colorida.

type Tone = "error" | "success" | "neutral";

const TONES: Record<Tone, string> = {
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  neutral: "border-zinc-800 bg-zinc-950 text-zinc-400",
};

export default function Notice({
  tone = "error",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
