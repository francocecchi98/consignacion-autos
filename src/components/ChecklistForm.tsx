"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST, RED_FLAGS, semaforo } from "@/lib/checklist";
import { today } from "@/lib/domain";

type Data = {
  id?: string;
  prospect_id: string | null;
  car: string;
  plate: string;
  visit_date: string;
  holder_name: string;
  holder_phone: string;
  km: string;
  items: Record<string, boolean>;
  notes: string;
};

const COLOR = {
  verde: "border-green-300 bg-green-50 text-green-900",
  amarillo: "border-amber-300 bg-amber-50 text-amber-900",
  rojo: "border-red-300 bg-red-50 text-red-900",
};

export function ChecklistForm({ initial }: { initial: Data }) {
  const router = useRouter();
  const supabase = createClient();
  const [d, setD] = useState<Data>(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef<string | undefined>(initial.id);

  const s = semaforo(d.items);

  // Guardado automático (debounce)
  useEffect(() => {
    if (d === initial) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  async function save() {
    setSaved("saving");
    const payload = {
      prospect_id: d.prospect_id,
      car: d.car,
      plate: d.plate || null,
      visit_date: d.visit_date || null,
      holder_name: d.holder_name || null,
      holder_phone: d.holder_phone || null,
      km: d.km ? Number(d.km.replace(/\D/g, "")) : null,
      items: d.items,
      notes: d.notes,
    };
    if (idRef.current) {
      await supabase.from("checklists").update(payload).eq("id", idRef.current);
    } else {
      const { data } = await supabase.from("checklists").insert(payload).select("id").single();
      if (data) {
        idRef.current = data.id;
        window.history.replaceState(null, "", `/panel/checklist/${data.id}`);
      }
    }
    setSaved("ok");
  }

  const toggle = (k: string) => setD((x) => ({ ...x, items: { ...x.items, [k]: !x.items[k] } }));
  const set = (k: keyof Data, v: string) => setD((x) => ({ ...x, [k]: v }));

  async function remove() {
    if (!idRef.current || !confirm("¿Borrar esta hoja?")) return;
    await supabase.from("checklists").delete().eq("id", idRef.current);
    router.replace("/panel/checklist");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/panel/checklist" className="text-sm text-muted hover:text-ink">← Visitas</Link>
        <div className="flex items-center gap-3 text-xs text-muted">
          {saved === "saving" ? "Guardando…" : saved === "ok" ? "Guardado ✓" : ""}
          <button onClick={() => window.print()} className="btn-ghost !py-1 !px-2 text-xs">Imprimir</button>
          {d.prospect_id && <Link href={`/panel/prospectos/${d.prospect_id}`} className="btn-ghost !py-1 !px-2 text-xs">Ver prospecto</Link>}
        </div>
      </div>

      <h1 className="serif text-2xl font-semibold">Hoja de la visita</h1>

      {/* Semáforo */}
      <div className={`rounded-xl border p-4 ${COLOR[s.level]}`}>
        <div className="text-xs uppercase tracking-wide opacity-70">Semáforo</div>
        <div className="text-lg font-semibold">{s.title}</div>
        <p className="text-sm">{s.text}</p>
      </div>

      {/* Datos */}
      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        {([
          ["car", "Auto", "Peugeot 208 2019"], ["plate", "Patente", "AB123CD"], ["visit_date", "Fecha", ""],
          ["holder_name", "Titular", "Como figura en el título"], ["holder_phone", "Teléfono", ""], ["km", "Kilómetros", ""],
        ] as const).map(([k, label, ph]) => (
          <div key={k}>
            <label className="label">{label}</label>
            <input className="input" type={k === "visit_date" ? "date" : "text"} placeholder={ph} value={d[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>

      <div className="card p-4 text-sm">
        <b>La pregunta que resuelve el 80%:</b> <i>“¿El auto está a tu nombre?”</i>
        <span className="text-muted"> Si la respuesta no es un sí limpio, pedí ver el título antes de seguir.</span>
      </div>

      {/* Grupos */}
      {CHECKLIST.map((g) => (
        <section key={g.group} className="card p-4">
          <h2 className="mb-3 font-semibold">{g.title}</h2>
          <ul className="space-y-2">
            {g.items.map((i) => (
              <li key={i.key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-bg">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--navy)]" checked={!!d.items[i.key]} onChange={() => toggle(i.key)} />
                  <span className={`text-sm ${d.items[i.key] ? "text-muted line-through" : ""}`}>
                    {i.label}
                    {i.blocking && !d.items[i.key] && <span className="ml-2 text-[10px] font-semibold uppercase text-bad">si falta, no se trabaja</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Cuándo no se trabaja el auto</h2>
        <p className="mb-2 text-xs text-muted">No son para negociar. Se agradece, se explica y se sale.</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {RED_FLAGS.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      <section className="card p-4">
        <label className="label">Notas (GNC, cambios de motor/color, qué falta, quién lo resuelve)</label>
        <textarea className="input" rows={4} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
      </section>

      <div className="flex justify-between print:hidden">
        <button className="btn-primary" onClick={save}>Guardar</button>
        {idRef.current && <button className="btn-danger" onClick={remove}>Borrar hoja</button>}
      </div>

      <p className="text-xs text-muted">
        Esta hoja es el criterio de revisión antes de publicar, no un trámite ni asesoramiento legal. Plazos y costos cambian por provincia: confirmá con el Registro Seccional o tu gestor antes de darle un número o una fecha al dueño.
      </p>
    </div>
  );
}

export function emptyChecklist(prospect_id: string | null = null, car = "", holder_name = "", km = ""): Data {
  return { prospect_id, car, plate: "", visit_date: today(), holder_name, holder_phone: "", km, items: {}, notes: "" };
}
