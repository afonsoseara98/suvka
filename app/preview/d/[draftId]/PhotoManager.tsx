"use client";

import { buttonClasses } from "@/app/ui/Button";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_PHOTOS, isOwnPhoto } from "@/app/lib/restaurant/photoLimits";
import type { GalleryImage } from "@/app/types/landing";

type Props = {
  draftId: string;
  gallery: GalleryImage[];
};

// Replacing the stock photographs with the restaurant's own.
//
// This is the step that turns a convincing demo into a publishable site. Everything else
// on the page is already the owner's words; the pictures were the last thing that belonged
// to somebody else.
//
// Deliberately not an editor. Add, remove, done - because the owner is standing in a
// kitchen with a phone, not sitting at a desk with a mouse.
/* eslint-disable @next/next/no-img-element */
export default function PhotoManager({ draftId, gallery }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const owned = gallery.filter((image) => isOwnPhoto(image.url));
  const full = owned.length >= MAX_PHOTOS;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);

    try {
      // One at a time rather than in parallel: the server counts what is already there to
      // enforce the limit, and six simultaneous requests would each see the same count.
      for (const file of Array.from(files).slice(0, MAX_PHOTOS)) {
        const body = new FormData();
        body.append("draftId", draftId);
        body.append("photo", file);

        const response = await fetch("/api/restaurant/photos", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) {
          setError(data?.message ?? "Não foi possível enviar a fotografia.");
          break;
        }
      }
      // The preview is server-rendered from the draft, so refreshing is what shows the new
      // photograph in place, at the size and crop it will actually have.
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Não foi possível contactar o servidor.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(url: string) {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/restaurant/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, url }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-5xl px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">As suas fotografias</p>
            <p className="text-xs text-zinc-500">
              {owned.length === 0
                ? "As fotos atuais são de banco de imagens. Adicione as do seu restaurante."
                : `${owned.length} de ${MAX_PHOTOS} fotografias suas.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy || full}
            className={buttonClasses("secondary", "md")}
          >
            {busy ? "A enviar…" : full ? `Máximo ${MAX_PHOTOS}` : "Adicionar fotos"}
          </button>

          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            hidden
            onChange={(e) => upload(e.target.files)}
          />
        </div>

        {/* Drag and drop for the owner at a desk; the button above for the one on a phone,
            where dropping a file is not a gesture that exists. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!full) upload(e.dataTransfer.files);
          }}
          className={`mt-3 rounded-xl border border-dashed px-4 py-3 text-center text-xs transition ${
            dragging ? "border-zinc-500 bg-zinc-900 text-zinc-300" : "border-zinc-800 text-zinc-600"
          }`}
        >
          Arraste fotografias para aqui
        </div>

        {owned.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {owned.map((image) => (
              <div key={image.url} className="relative">
                <img
                  src={image.url}
                  alt=""
                  className="h-16 w-16 rounded-lg border border-zinc-800 object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(image.url)}
                  disabled={busy}
                  aria-label="Apagar fotografia"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300 transition hover:bg-red-500 hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
