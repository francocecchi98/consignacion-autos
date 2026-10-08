"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Testimonial } from "@/components/Testimonials";

const FIELDS: { key: string; label: string; multi?: boolean; hint?: string }[] = [
  { key: "nombre", label: "Tu nombre" },
  { key: "zona", label: "Zona de trabajo" },
  { key: "comision", label: "Comisión (ej: 5%)" },
  { key: "whatsapp", label: "WhatsApp (con 549, sin + ni espacios)", hint: "Ej: 5492643188456" },
  { key: "titulo", label: "Título principal" },
  { key: "subtitulo", label: "Texto debajo del título", multi: true },
  { key: "sobre_mi", label: "Quién soy", multi: true },
  { key: "paso_1_titulo", label: "Paso 1 · título" },
  { key: "paso_1_texto", label: "Paso 1 · texto", multi: true },
  { key: "paso_2_titulo", label: "Paso 2 · título" },
  { key: "paso_2_texto", label: "Paso 2 · texto", multi: true },
  { key: "paso_3_titulo", label: "Paso 3 · título" },
  { key: "paso_3_texto", label: "Paso 3 · texto", multi: true },
  { key: "paso_4_titulo", label: "Paso 4 · título" },
  { key: "paso_4_texto", label: "Paso 4 · texto", multi: true },
  { key: "cta_texto", label: "Frase final (llamado a escribirte)" },
];

export default function Sitio() {
  const supabase = createClient();
  const [s, setS] = useState<Record<string, string>>({});
  const [ts, setTs] = useState<Testimonial[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("site_settings").select("key,value"),
      supabase.from("testimonials").select("*").order("sort_order"),
    ]);
    const o: Record<string, string> = {};
    (a ?? []).forEach((r) => (o[r.key] = r.value));
    setS(o);
    setTs((b ?? []) as Testimonial[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveTexts() {
    setSaving(true);
    await supabase.from("site_settings").upsert(Object.entries(s).map(([key, value]) => ({ key, value })));
    setSaving(false);
    setMsg("Guardado. Ya está publicado en tu sitio.");
    setTimeout(() => setMsg(""), 3000);
  }

  async function upload(file: File, folder: string): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) {
      alert("No se pudo subir: " + error.message);
      return null;
    }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function posterFromVideo(file: File, seconds = 1): Promise<File | null> {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      v.src = URL.createObjectURL(file);
      v.onloadedmetadata = () => { v.currentTime = Math.min(seconds, Math.max(0, v.duration - 0.1)); };
      v.onseeked = () => {
        const c = document.createElement("canvas");
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext("2d")?.drawImage(v, 0, 0);
        c.toBlob((b) => resolve(b ? new File([b], "poster.jpg", { type: "image/jpeg" }) : null), "image/jpeg", 0.85);
      };
      v.onerror = () => resolve(null);
    });
  }

  async function addMedia(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let order = (ts.at(-1)?.sort_order ?? 0) + 1;
    for (const f of Array.from(files)) {
      const isVideo = f.type.startsWith("video/");
      const url = await upload(f, isVideo ? "videos" : "fotos");
      if (!url) continue;
      let poster: string | null = null;
      if (isVideo) {
        const pf = await posterFromVideo(f, 1);
        if (pf) poster = await upload(pf, "posters");
      }
      await supabase.from("testimonials").insert({ kind: isVideo ? "video" : "foto", media_url: url, poster_url: poster, sort_order: order++ });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  async function changePhoto(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    const url = await upload(files[0], "perfil");
    if (url) {
      await supabase.from("site_settings").upsert({ key: "foto_perfil", value: url });
      setS((x) => ({ ...x, foto_perfil: url }));
    }
    setUploading(false);
  }

  async function updateT(id: string, patch: Partial<Testimonial>) {
    await supabase.from("testimonials").update(patch).eq("id", id);
    setTs((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  async function removeT(t: Testimonial) {
    if (!confirm("¿Quitar este elemento del sitio?")) return;
    await supabase.from("testimonials").delete().eq("id", t.id);
    load();
  }
  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= ts.length) return;
    const a = ts[idx], b = ts[j];
    await Promise.all([
      supabase.from("testimonials").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("testimonials").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl font-semibold">Mi sitio</h1>
          <p className="text-sm text-muted">Lo que cambiés acá se ve al instante en tu página pública.</p>
        </div>
        <a href="/" target="_blank" className="btn-ghost">Ver sitio ↗</a>
      </header>

      {/* Foto */}
      <section className="card flex items-center gap-4 p-4">
        {s.foto_perfil ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.foto_perfil} alt="" className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-bg" />
        )}
        <div>
          <div className="font-medium">Tu foto de perfil</div>
          <p className="text-xs text-muted">De frente, buena luz. Se ve grande en la portada.</p>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files)} />
          <button className="btn-ghost mt-2 !py-1 !px-3 text-xs" onClick={() => photoRef.current?.click()} disabled={uploading}>Cambiar foto</button>
        </div>
      </section>

      {/* Textos */}
      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Textos</h2>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            {f.multi ? (
              <textarea className="input" rows={3} value={s[f.key] ?? ""} onChange={(e) => setS((x) => ({ ...x, [f.key]: e.target.value }))} />
            ) : (
              <input className="input" value={s[f.key] ?? ""} onChange={(e) => setS((x) => ({ ...x, [f.key]: e.target.value }))} />
            )}
            {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={saveTexts} disabled={saving}>{saving ? "Guardando…" : "Guardar textos"}</button>
          {msg && <span className="text-sm text-ok">{msg}</span>}
        </div>
      </section>

      {/* Fotos y videos */}
      <section className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Fotos y videos de clientes</h2>
            <p className="text-xs text-muted">Subí fotos de entregas o videos. A los videos se les arma la portada sola (segundo 1).</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addMedia(e.target.files)} />
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Subiendo…" : "+ Subir"}</button>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ts.map((t, i) => (
            <li key={t.id} className={`flex gap-3 rounded-lg border border-line p-2 ${t.published ? "" : "opacity-60"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.poster_url ?? t.media_url} alt="" className="h-24 w-20 shrink-0 rounded-md object-cover bg-bg" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
                  {t.kind}
                  <div className="ml-auto flex gap-1">
                    <button className="rounded px-1 hover:bg-bg" onClick={() => move(i, -1)} title="Subir">↑</button>
                    <button className="rounded px-1 hover:bg-bg" onClick={() => move(i, 1)} title="Bajar">↓</button>
                  </div>
                </div>
                <input className="input !py-1 text-xs" placeholder="Título (ej: Peugeot 208)" defaultValue={t.title} onBlur={(e) => e.target.value !== t.title && updateT(t.id, { title: e.target.value })} />
                <input className="input !py-1 text-xs" placeholder="Comentario corto" defaultValue={t.caption} onBlur={(e) => e.target.value !== t.caption && updateT(t.id, { caption: e.target.value })} />
                <div className="flex gap-2 text-xs">
                  <button className="text-muted hover:text-ink" onClick={() => updateT(t.id, { published: !t.published })}>{t.published ? "Ocultar" : "Mostrar"}</button>
                  <button className="text-bad" onClick={() => removeT(t)}>Quitar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
