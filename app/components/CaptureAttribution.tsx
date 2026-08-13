"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/app/lib/attribution";

// LÊ DE ONDE VEIO ESTA VISITA, NA PRIMEIRA PÁGINA QUE ELA ABRIR
//
// Vive no layout raiz porque a pessoa pode entrar por qualquer página - a inicial, um site
// publicado, uma partilha directa do formulário. Pôr isto só na página inicial media apenas
// quem entra pela porta da frente, que é a minoria.
//
// Não desenha nada e não bloqueia nada. Corre depois da pintura e falha em silêncio: uma
// visita cuja origem não se conseguiu ler é um dado em falta, e um dado em falta nunca pode
// custar a visita.
export default function CaptureAttribution() {
  useEffect(() => {
    captureAttribution(window.location.href, document.referrer, window.sessionStorage);
  }, []);

  return null;
}
