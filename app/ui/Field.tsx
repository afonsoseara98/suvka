import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

// O CAMPO DE TEXTO DO PRODUTO
//
// O QUE ISTO CORRIGE, E NÃO É ESTÉTICA
//
// Todas as caixas de texto do produto tinham `outline-none`. Isso remove o anel que o browser
// desenha à volta do campo em foco — e nenhuma delas o substituía. Quem navega por teclado
// estava a escrever às cegas: sem rato, não havia forma de saber em que campo se estava.
//
// Não é um detalhe de acabamento. É a interface deixar de ser utilizável para quem não usa
// rato, e é a única coisa neste ficheiro que eu classificaria como defeito e não como
// inconsistência.
//
// A borda também muda em foco, além do anel: cor sozinha nunca deve ser o único sinal de
// estado, e há quem não distinga o anel do fundo.
//
// O `id` é obrigatório e não opcional, de propósito. Um campo sem `<label for>` é um campo
// que um leitor de ecrã anuncia como "edit text" e mais nada — e tornar isso possível de
// esquecer era garantir que ia ser esquecido.

const FIELD =
  "w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white " +
  "placeholder:text-zinc-500 transition-colors " +
  "focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-black " +
  "disabled:opacity-45";

const LABEL = "block text-sm font-medium text-zinc-300";
const HINT = "mt-1 text-sm text-zinc-500";

interface Common {
  id: string;
  label: string;
  // A frase por baixo do campo. Não é decoração: é onde se explica o que o produto vai fazer
  // com aquilo, e é lida por quem hesita.
  hint?: ReactNode;
  error?: string | null;
}

export function Field({
  id,
  label,
  hint,
  error,
  ...rest
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {hint && <p className={HINT}>{hint}</p>}
      <input
        {...rest}
        id={id}
        // Liga a mensagem de erro ao campo para um leitor de ecrã. Sem isto, a mensagem é
        // vermelha para quem vê e inexistente para quem ouve.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={`mt-2 ${FIELD}${error ? " border-red-500/50" : ""}`}
      />
      {error && (
        <p id={`${id}-erro`} className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  ...rest
}: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className">) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {hint && <p className={HINT}>{hint}</p>}
      <textarea
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={`mt-2 ${FIELD}${error ? " border-red-500/50" : ""}`}
      />
      {error && (
        <p id={`${id}-erro`} className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
