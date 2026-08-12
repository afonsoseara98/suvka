import { permanentRedirect } from "next/navigation";

// O ENDEREÇO ANTIGO, QUE TEM DE CONTINUAR A FUNCIONAR
//
// Os sites publicados viviam em /s/<slug> e passaram para a raiz. Esta rota não desaparece
// por uma razão simples: um endereço que um restaurante deu a alguém não é nosso para
// partir. Basta um dono ter mandado o link por WhatsApp durante os testes, ou tê-lo colado
// no Instagram, para que apagar isto signifique um 404 na cara de um cliente dele.
//
// 308 e não 307: é permanente, e é isso que diz ao Google para transferir o endereço antigo
// para o novo em vez de os tratar como duas páginas com o mesmo conteúdo - que é o problema
// de SEO que a mudança para a raiz queria resolver, não criar.
//
// Custa uma linha e pode ficar aqui para sempre.
export default async function LegacyPublishedSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
