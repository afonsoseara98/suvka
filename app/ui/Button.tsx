import type { ButtonHTMLAttributes, ReactNode } from "react";

// O BOTÃO DO PRODUTO
//
// Não confundir com o app/components/ui/PrimaryButton.tsx: esse pertence aos sites GERADOS e
// é desenhado pelo ThemeConfig do restaurante, que muda de cliente para cliente e fica
// congelado no retrato publicado. Este é o Suvka, e é sempre o mesmo.
//
// Manter os dois separados é uma decisão de custódia e não de estética: uma alteração à nossa
// marca nunca pode ter como efeito secundário mudar o aspecto do site de um restaurante que
// já está no ar. Ver DESIGN_SYSTEM.md.
//
// PORQUE ISTO EXISTE
//
// Havia dezasseis ficheiros com um botão desenhado à mão e trinta e sete variações de
// classes. Cinco fundos diferentes para o mesmo botão primário, cinco medidas de padding, e
// três maneiras distintas de desenhar o estado desactivado. Não era falta de cuidado — era
// não haver um sítio onde a decisão vivesse, e por isso cada ecrã tomava a sua.
//
// DUAS COISAS QUE NENHUM DOS DEZASSEIS TINHA
//
// `focus-visible`: nem um. Quem navega por teclado não via onde estava — e os inputs até
// tinham `outline-none`, ou seja, o anel que o browser desenha de graça foi removido e não
// substituído. Isso não é um detalhe de acabamento, é a interface deixar de ser utilizável
// para quem não usa rato.
//
// `aria-busy`: nem um. Um botão que muda o texto para "Um momento…" comunica a um humano que
// está a ver, e a mais ninguém.
//
// O anel usa offset para não ser comido pelo fundo escuro em que todo o produto vive.

type Variant = "primary" | "secondary" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold no-underline " +
  "transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black " +
  // Desactivado é o MESMO desenho em todas as variantes. Antes havia três: opacity-50,
  // opacity-40, e um fundo cinzento com texto cinzento. Um utilizador não devia ter de
  // aprender três maneiras de o produto dizer "agora não".
  "disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-zinc-200 focus-visible:ring-white",
  secondary: "border border-zinc-700 text-zinc-200 hover:bg-zinc-900 focus-visible:ring-zinc-500",
  // Vermelho na borda e no texto, nunca no fundo: um botão de fundo vermelho puxa o olho
  // para a acção que menos queremos que seja carregada por engano.
  danger: "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 focus-visible:ring-red-500",
  success: "border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 focus-visible:ring-emerald-500",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3",
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: Variant;
  size?: Size;
  // Ocupa a largura toda. Frequente em formulários estreitos e em telemóvel, e sem isto cada
  // ecrã voltava a acrescentar `w-full` à mão — que é como as trinta e sete variações
  // começaram.
  block?: boolean;
  // Desactiva e anuncia. Quem chama continua a decidir o TEXTO, porque "Um momento…" e
  // "A publicar…" não dizem a mesma coisa a quem está à espera.
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]}${block ? " w-full" : ""}`}
    >
      {children}
    </button>
  );
}
