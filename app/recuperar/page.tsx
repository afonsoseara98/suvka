"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/app/ui/Button";
import { Field } from "@/app/ui/Field";
import Notice from "@/app/ui/Notice";

// PEDIR UM LINK PARA VOLTAR A ENTRAR
//
// A pessoa que chega aqui está fechada fora do website do próprio restaurante. Um ecrã, um
// campo, e uma resposta que não a deixa a adivinhar.
//
// A resposta é a mesma haja conta ou não - ver app/api/auth/recuperar/route.ts para a razão.
// O que isso significa NESTE ecrã: depois de enviar, não se diz "verifique o seu email",
// diz-se "SE existir uma conta com esse email". A diferença parece pequena e não é: a
// primeira promete uma coisa que pode não acontecer, e quem escreveu o endereço errado fica
// vinte minutos a olhar para a caixa de correio antes de desconfiar.
export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      const response = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { success: boolean; message: string };

      if (data.success) setMensagem(data.message);
      else setErro(data.message);
    } catch {
      setErro("Não foi possível contactar o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-2xl font-bold">Voltar a entrar</h1>

        {mensagem ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{mensagem}</p>
            <p className="mt-4 text-sm text-zinc-500">
              O link é válido durante uma hora e só pode ser usado uma vez.
            </p>
            <Link href="/entrar" className="mt-6 block text-sm text-zinc-400 hover:text-white">
              ← Voltar
            </Link>
          </>
        ) : (
          <form onSubmit={submeter}>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Escreva o email da sua conta e enviamos-lhe um link para definir uma nova
              palavra-passe. O seu site continua no ar entretanto.
            </p>

            <div className="mt-6">
              <Field
                id="email"
                label="Email"
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="geral@orestaurante.pt"
              />
            </div>

            {erro && (
              <div className="mt-4">
                <Notice>{erro}</Notice>
              </div>
            )}

            <div className="mt-6">
              <Button type="submit" block size="lg" loading={enviando} disabled={!email}>
                {enviando ? "Um momento…" : "Enviar link"}
              </Button>
            </div>

            <Link href="/entrar" className="mt-4 block text-center text-sm text-zinc-400 hover:text-white">
              Lembrei-me. Voltar a entrar
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
