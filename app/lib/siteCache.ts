import { unstable_cache, revalidateTag } from "next/cache";
import { repos } from "@/app/lib/repos";
import { loadPublishedSite, type PublishedSite } from "@/app/lib/publishService";

// CADA VISITA A UM SITE PUBLICADO IA À BASE DE DADOS
//
// O `cache()` do React que já existia desduplica dentro do MESMO pedido — reduziu 4,8 para 2,6
// varrimentos por visita, medido. Mas dois visitantes continuavam a ser duas visitas ao
// Postgres, e um site de restaurante é o conteúdo mais estático que existe: muda quando o dono
// muda alguma coisa, o que são umas vezes por ano.
//
// Servir cada visita a partir da base de dados é pagar latência e capacidade por nada. E é o
// que mais custa em Core Web Vitals, que alimentam o posicionamento local — que é a única
// forma de um restaurante independente ser encontrado.
//
// O modelo já era perfeito para isto: o estado publicado é uma fotografia materializada, não
// um ponteiro para um registo de operações. Nada nele muda entre publicações.
//
// A ETIQUETA E O TEMPO SÃO DUAS GARANTIAS DIFERENTES
//
// A etiqueta é a correcta: publicar invalida, e a alteração aparece imediatamente. O tempo é a
// rede de segurança — se alguém acrescentar um terceiro caminho de publicação e se esquecer de
// invalidar, o estrago fica limitado a cinco minutos em vez de ser permanente.
//
// Sem o tempo, um esquecimento produzia um site congelado para sempre e ninguém perceberia
// porquê. Com ele, produz um atraso que alguém nota e reporta.
const CINCO_MINUTOS = 300;

// Um só sítio a saber o nome da etiqueta. Duas grafias do mesmo nome são duas caches, e a
// invalidação passava a limpar uma que ninguém lê.
function etiqueta(slug: string): string {
  return `site:${slug}`;
}

export const cachedPublishedSite = (slug: string): Promise<PublishedSite | null> =>
  unstable_cache(() => loadPublishedSite(repos, slug), ["published-site", slug], {
    tags: [etiqueta(slug)],
    revalidate: CINCO_MINUTOS,
  })();

// Chamado a seguir a publicar. Recebe o slug e não o projecto porque é o slug que identifica o
// que o público vê: um projecto que mudou de endereço tem duas entradas para limpar, e quem
// chamar isto duas vezes com os dois slugs está correcto.
//
// O segundo argumento é novo no Next 16: exprime que idade de entrada ainda serve. `expire: 0`
// é "nada com esta etiqueta serve, purga já" — que é o que uma publicação exige, porque o dono
// carrega em Publicar e vai imediatamente ver o site.
//
// O `updateTag`, que seria a escolha natural, só funciona dentro de uma Server Action, e isto
// é chamado de rotas de API.
export function invalidateSite(slug: string): void {
  revalidateTag(etiqueta(slug), { expire: 0 });
}
