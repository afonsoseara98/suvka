// The rules about photographs, with no filesystem in sight.
//
// Split from photoStore.ts because the upload UI is a client component and importing the
// limits from the same module as the disk implementation dragged `fs/promises` into the
// browser bundle. Both tsc and eslint were happy; the page returned 500 at runtime. Same
// class of failure as passing a function across the RSC boundary - a bundler boundary that
// type checking cannot see.
//
// Everything here is shared by the browser, the route and the tests.

// A restaurant's dish photograph off a modern phone is 2-5 MB. Ten is generous for one and
// small enough that six of them cannot fill a disk by accident.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// The formats a phone camera and a Mac actually produce. Deliberately a whitelist: an
// upload endpoint that accepts whatever it is handed is one that will one day be handed a
// .svg containing a script, served back from our own origin.
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export const MAX_PHOTOS = 6;

// Where uploaded photographs live in a URL. The one place that knows the prefix, so a
// future object store changes it here and nowhere else.
export const UPLOAD_PREFIX = "/uploads/";

export function isOwnPhoto(url: string): boolean {
  return url.startsWith(UPLOAD_PREFIX);
}

// AS FOTOGRAFIAS QUE UM RASCUNHO TROUXE CONSIGO
//
// Só as que estão em /uploads/ — as do banco de imagens vivem no servidor da Pexels e não
// são nossas para apagar. Devolve as chaves de armazenamento, que é o que o PhotoStore
// aceita.
//
// Isto existe porque um rascunho abandonado deixava os ficheiros para sempre: o
// `deleteMany` apagava a linha e o disco ficava com até 6 × 10 MB por cada pré-visualização
// que alguém começou e não terminou.
//
// E o disco que enche é o mesmo que guarda as fotografias dos restaurantes que PAGAM — a
// única coisa neste produto que não se gera outra vez. Um sistema operativo que perde a
// custódia do que lhe foi confiado não é um sistema operativo.
export function photoKeysOf(gallery: ReadonlyArray<{ url: string }> | undefined | null): string[] {
  if (!gallery) return [];
  return gallery
    .filter((image) => isOwnPhoto(image.url))
    .map((image) => image.url.slice(UPLOAD_PREFIX.length))
    .filter((key) => key.length > 0);
}

// Returns a Portuguese message rather than a boolean, because every one of these ends up in
// front of a restaurant owner.
export function rejectPhoto(size: number, contentType: string, currentCount: number): string | null {
  if (!ALLOWED_TYPES[contentType]) return "Só aceitamos imagens JPG, PNG, WEBP ou HEIC.";
  if (size > MAX_PHOTO_BYTES) return "Essa fotografia é demasiado grande. O máximo é 10 MB.";
  if (size === 0) return "Esse ficheiro está vazio.";
  if (currentCount >= MAX_PHOTOS) return `Já tem ${MAX_PHOTOS} fotografias. Apague uma antes de adicionar outra.`;
  return null;
}
