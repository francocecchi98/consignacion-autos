"use client";

import { useState } from "react";

export type Testimonial = {
  id: string;
  kind: "foto" | "video";
  media_url: string;
  poster_url: string | null;
  title: string;
  caption: string;
  sort_order: number;
  published: boolean;
};

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [open, setOpen] = useState<Testimonial | null>(null);
  const videos = items.filter((t) => t.kind === "video");
  const fotos = items.filter((t) => t.kind === "foto");

  return (
    <div className="space-y-10">
      {videos.length > 0 && (
        <div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {videos.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpen(t)}
                className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-navy-deep text-left"
              >
                {t.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.poster_url} alt={t.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                ) : (
                  <video src={t.media_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                )}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-navy"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
                {t.title && (
                  <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-sm font-medium text-white">
                    {t.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {fotos.length > 0 && (
        <div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.map((t) => (
              <figure key={t.id} className="overflow-hidden rounded-xl bg-line">
                <button onClick={() => setOpen(t)} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.media_url} alt={t.title} loading="lazy" className="aspect-[3/4] w-full object-cover transition hover:scale-[1.02]" />
                </button>
                {(t.title || t.caption) && (
                  <figcaption className="bg-surface px-3 py-2 text-sm">
                    <span className="font-medium">{t.title}</span>
                    {t.caption && <span className="text-muted"> · {t.caption}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          <button className="absolute right-4 top-4 text-3xl text-white/80 hover:text-white" aria-label="Cerrar">×</button>
          <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {open.kind === "video" ? (
              <video
                src={open.media_url}
                poster={open.poster_url ?? undefined}
                controls
                autoPlay
                playsInline
                className="max-h-[90vh] max-w-full rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.media_url} alt={open.title} className="max-h-[90vh] max-w-full rounded-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
