import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  // The browser tab, on every page that does not set its own. "AI Conversion System" is
  // what we call it internally; a restaurant owner filling in the form saw it in their tab
  // and it told them nothing about what they were doing.
  title: "Noctra — Websites para restaurantes",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
