import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { appUrl } from "@/app/lib/appUrl";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // A RAIZ DE TUDO O QUE SAI DAQUI PARA FORA
  //
  // Sem isto, um `og:image` escrito como "/uploads/foto.jpg" chega ao Facebook exactamente
  // assim - e o Facebook não tem como saber de que domínio é. O metadataBase é o que torna
  // absoluto tudo o que abaixo se escreve relativo: canonical, og:image, og:url.
  //
  // Lido no build, não no pedido, porque as páginas do produto são estáticas: o valor fica
  // escrito no HTML e não há segunda oportunidade. É por isso que o next.config.ts recusa
  // um build de produção sem APP_URL - ver lá o comentário, que é onde essa decisão vive.
  metadataBase: new URL(appUrl()),
  // The browser tab, on every page that does not set its own. "AI Conversion System" is
  // what we call it internally; a restaurant owner filling in the form saw it in their tab
  // and it told them nothing about what they were doing.
  title: "Suvka — Websites para restaurantes",
  // The default description on every page that does not set its own, and it was still
  // selling the pre-pivot product in English, to a Portuguese restaurant owner, using the
  // three words this product no longer says out loud.
  description:
    "Criamos o site do seu restaurante em minutos. Menu, fotos, horário e contacto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // O produto inteiro está escrito em português e isto dizia "en". Um leitor de ecrã lia
    // "Aberto agora" com fonética inglesa, e o Google usa este atributo como sinal de idioma
    // ao decidir a quem mostra o site de um restaurante em Braga.
    <html
      lang="pt-PT"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
