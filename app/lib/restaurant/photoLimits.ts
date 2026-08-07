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

// Returns a Portuguese message rather than a boolean, because every one of these ends up in
// front of a restaurant owner.
export function rejectPhoto(size: number, contentType: string, currentCount: number): string | null {
  if (!ALLOWED_TYPES[contentType]) return "Só aceitamos imagens JPG, PNG, WEBP ou HEIC.";
  if (size > MAX_PHOTO_BYTES) return "Essa fotografia é demasiado grande. O máximo é 10 MB.";
  if (size === 0) return "Esse ficheiro está vazio.";
  if (currentCount >= MAX_PHOTOS) return `Já tem ${MAX_PHOTOS} fotografias. Apague uma antes de adicionar outra.`;
  return null;
}
