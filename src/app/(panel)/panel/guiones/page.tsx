"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Script } from "@/lib/domain";
import { CopyButton } from "@/components/CopyButton";

export default function Guiones() {
  const supabase = createClient();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function load() {
    const { data } = await supabase.from("scripts").select("*").order("sort_order");
    setScripts((data ?? []) as Script[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(id: string) {
    await supabase.from("scripts").update({ body: draft }).eq("id", id);
    setEditId(null);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="serif text-2xl font-semibold">Guiones</h1>
        <p className="text-sm text-muted">
          Los mensajes que usás todos los días. <code className="rounded bg-bg px-1">{"{nombre}"}</code> y <code className="rounded bg-bg px-1">{"{modelo}"}</code> se completan solos desde cada prospecto. Editalos para que suenen a vos: el que mejor convierte es el que suena a vos.
        </p>
      </header>

      <div className="card p-4 text-sm">
        <div className="mb-1 font-semibold">Reglas del primer mensaje</div>
        <ul className="grid gap-1 text-muted sm:grid-cols-2">
          <li>· Menos de 80 palabras</li>
          <li>· Nada de precio todavía</li>
          <li>· Nada de crítica al auto o al precio</li>
          <li>· Un solo mensaje, no cinco seguidos</li>
          <li>· Sin links ni archivos</li>
          <li>· Horario normal: de 9 a 21</li>
        </ul>
      </div>

      {scripts.map((s) => (
        <div key={s.id} className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{s.title}</h2>
            <div className="flex gap-2">
              <CopyButton text={s.body} />
              {editId === s.id ? (
                <>
                  <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => save(s.id)}>Guardar</button>
                  <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setEditId(null)}>Cancelar</button>
                </>
              ) : (
                <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => { setEditId(s.id); setDraft(s.body); }}>Editar</button>
              )}
            </div>
          </div>
          {editId === s.id ? (
            <textarea className="input font-sans" rows={Math.max(4, s.body.split("\n").length + 1)} value={draft} onChange={(e) => setDraft(e.target.value)} />
          ) : (
            <pre className="whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-relaxed font-sans">{s.body}</pre>
          )}
          {s.slug === "primer_mensaje" && editId !== s.id && (
            <p className="mt-2 text-xs text-muted">{s.body.split(/\s+/).length} palabras</p>
          )}
        </div>
      ))}
    </div>
  );
}
