"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/ui/Button";
import { Field } from "@/app/ui/Field";
import Notice from "@/app/ui/Notice";

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
            <div className="mt-4">
              <Notice tone="success">Palavra-passe alterada. Já pode entrar.</Notice>
            </div>
            <Link href="/entrar" className="mt-6 block text-sm text-zinc-400 hover:text-white">
              Entrar agora →
            </Link>
          </>
        ) : (
          <form onSubmit={submeter}>
            <div className="mt-6">
              <Field
                id="password"
                label="Escreva a nova palavra-passe"
                hint="É com esta que volta ao seu site. Escolha uma de que se lembre."
                type="password"
                autoFocus
                required
                minLength={MIN}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pelo menos 8 caracteres"
              />
            </div>

            {erro && (
              <div className="mt-4">
                <Notice>
                <p>{erro}</p>
                {/* Um link morto sem saída é onde a pessoa desiste. */}
                <Link href="/recuperar" className="mt-2 block underline">
                  Pedir um link novo
                </Link>
                </Notice>
              </div>
            )}

            <div className="mt-6">
              <Button type="submit" block size="lg" loading={enviando} disabled={password.length < MIN}>
                {enviando ? "Um momento…" : "Guardar e entrar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
