"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addDays, fillScript, today, type Script } from "@/lib/domain";
import { CopyButton } from "@/components/CopyButton";

export default function Nuevo() {
  const router = useRouter();
  const supabase = createClient();
  const [f, setF] = useState({
    owner_name: "",
    model: "",
    year: "",
    km: "",
    listed_price: "",
    ml_url: "",
    listed_since: "",
    notes: "",
    sent: true,
  });
  const [script, setScript] = useState<Script | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    supabase.from("scripts").select("*").eq("slug", "primer_mensaje").single().then(({ data }) => setScript(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = script ? fillScript(script.body, { owner_name: f.owner_name, model: f.model, year: f.year ? Number(f.year) : null }) : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const t = today();
    const { data, error } = await supabase
      .from("prospects")
      .insert({
        owner_name: f.owner_name.trim(),
        model: f.model.trim(),
        year: f.year ? Number(f.year) : null,
        km: f.km ? Number(f.km.replace(/\D/g, "")) : null,
        listed_price: f.listed_price ? Number(f.listed_price.replace(/\D/g, "")) : null,
        current_price: f.listed_price ? Number(f.listed_price.replace(/\D/g, "")) : null,
        ml_url: f.ml_url.trim() || null,
        listed_since: f.listed_since || null,
        notes: f.notes.trim(),
        first_message_at: f.sent ? t : null,
        status: f.sent ? "sin_respuesta" : "por_contactar",
        next_contact_at: f.sent ? addDays(t, 3) : t,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      alert("No se pudo guardar: " + error?.message);
      return;
    }
    if (f.sent) await supabase.from("interactions").insert({ prospect_id: data.id, kind: "mensaje", content: "Primer mensaje" });
    if (f.listed_price) await supabase.from("price_checks").insert({ prospect_id: data.id, price: Number(f.listed_price.replace(/\D/g, "")) });
    router.replace(`/panel/prospectos/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="serif text-2xl font-semibold">Nuevo prospecto</h1>
      <p className="text-sm text-muted">Anotalo antes de escribir. Estos datos van en el primer mensaje.</p>

      <form onSubmit={save} className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="card space-y-4 p-5">
          <div className="grid grid-cols-[1fr_90px] gap-3">
            <div>
              <label className="label">Modelo *</label>
              <input className="input" required placeholder="Peugeot 208 Allure" value={f.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div>
              <label className="label">Año</label>
              <input className="input" inputMode="numeric" placeholder="2019" value={f.year} onChange={(e) => set("year", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Nombre del dueño</label>
            <input className="input" placeholder="Como figura en ML" value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kilómetros</label>
              <input className="input" inputMode="numeric" placeholder="85000" value={f.km} onChange={(e) => set("km", e.target.value)} />
            </div>
            <div>
              <label className="label">Precio publicado</label>
              <input className="input" inputMode="numeric" placeholder="15000000" value={f.listed_price} onChange={(e) => set("listed_price", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Link de la publicación</label>
            <input className="input" type="url" placeholder="https://auto.mercadolibre.com.ar/…" value={f.ml_url} onChange={(e) => set("ml_url", e.target.value)} />
          </div>
          <div>
            <label className="label">Publicado desde (aprox.)</label>
            <input className="input" type="date" value={f.listed_since} onChange={(e) => set("listed_since", e.target.value)} />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={3} placeholder="Fotos malas, dice 'escucho ofertas', +30 días…" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.sent} onChange={(e) => set("sent", e.target.checked)} />
            Ya le mandé el primer mensaje hoy
          </label>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
            <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancelar</button>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Primer mensaje listo para pegar</h2>
            {preview && <CopyButton text={preview} />}
          </div>
          <pre className="whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-relaxed">{preview || "Cargando guion…"}</pre>
          <p className="mt-3 text-xs text-muted">
            Menos de 80 palabras, sin precio, sin crítica, sin links. Un solo mensaje y esperás. Horario 9 a 21.
          </p>
        </div>
      </form>
    </div>
  );
}
