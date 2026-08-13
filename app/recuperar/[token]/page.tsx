"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// DEFINIR A NOVA PALAVRA-PASSE
//
// O código vem no endereço, e por isso NÃO é mostrado neste ecrã nem repetido em lado
// nenhum: um endereço destes acaba num histórico partilhado, num ecrã projectado numa
// reunião, ou numa captura de ecrã que alguém manda a pedir ajuda.
//
// O ecrã não verifica o código antes de o submeter, de propósito. Verificá-lo à chegada
// obrigaria a uma rota que responde "este código é válido" a quem quer que lho pergunte -
// que é um oráculo grátis para quem esteja a adivinhar. Aqui o código só é lido uma vez, no
// momento em que também traz uma password nova.
const MIN = 8;

export default function RedefinirPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  async function submeter(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      const response = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      const data = (await response.json()) as { success: boolean; message: string };

      if (!data.success) {
        setErro(data.message);
        return;
      }

      setPronto(true);
      // Três segundos a ler "já pode entrar" e depois o ecrã de entrada. Redireccionar
      // imediatamente deixava a pessoa sem saber se resultou.
      setTimeout(() => router.push("/entrar"), 3000);
    } catch {
      setErro("Não foi possível contactar o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-2xl font-bold">Nova palavra-passe</h1>

        {pronto ? (
          <>
            <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              Palavra-passe alterada. Já pode entrar.
            </p>
            <Link href="/entrar" className="mt-6 block text-sm text-zinc-400 hover:text-white">
              Entrar agora →
            </Link>
          </>
        ) : (
          <form onSubmit={submeter}>
            <label htmlFor="password" className="mt-6 block text-sm font-medium">
              Escreva a nova palavra-passe
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              required
              minLength={MIN}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
              placeholder="Pelo menos 8 caracteres"
            />
            <p className="mt-2 text-sm text-zinc-500">
              É com esta que volta ao seu site. Escolha uma de que se lembre.
            </p>

            {erro && (
              <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <p>{erro}</p>
                {/* Um link morto sem saída é onde a pessoa desiste. */}
                <Link href="/recuperar" className="mt-2 block underline">
                  Pedir um link novo
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando || password.length < MIN}
              className="mt-6 w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {enviando ? "Um momento…" : "Guardar e entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
