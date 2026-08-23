import { ImageResponse } from "next/og";

// O CARTÃO QUE APARECE QUANDO ALGUÉM PARTILHA A SUVKA
//
// Sem isto, uma partilha por WhatsApp ou LinkedIn saía como uma linha de texto cinzenta com
// o domínio. A ironia era difícil de defender: o produto gerava para cada restaurante um
// og:image completo, com foto, dimensões e texto alternativo, e a nossa própria página não
// tinha nenhum.
//
// Gerada em vez de desenhada, de propósito. Um PNG num repositório envelhece mal - alguém
// muda a frase da página e o cartão continua a dizer a antiga durante meses. Assim, o
// cartão é feito das mesmas palavras que a página, e não pode divergir dela sem que se veja.
export const runtime = "nodejs";
export const alt = "Suvka — o site do seu restaurante, pronto em minutos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// O mesmo terracota do app/page.tsx. Duplicado aqui e não importado porque o ImageResponse
// corre num contexto isolado, e uma constante partilhada entre os dois criava um acoplamento
// pior do que estas sete letras.
const ACCENT = "#E2725B";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#000000",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#a1a1aa", letterSpacing: "-0.01em" }}>Suvka</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
            fontSize: 82,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex" }}>O restaurante já existe.</div>
          <div style={{ display: "flex", color: ACCENT }}>Falta o website.</div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 32, color: "#d4d4d8" }}>
          Menu, fotos, horário e contacto. Primeiro mês gratuito.
        </div>
      </div>
    ),
    size
  );
}
