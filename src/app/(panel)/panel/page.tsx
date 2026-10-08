"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  type Prospect,
  type Script,
  today,
  addDays,
  fillScript,
  followUpStep,
  statusLabel,
  statusColor,
  fmtDate,
  daysBetween,
} from "@/lib/domain";
import { CopyButton } from "@/components/CopyButton";

export default function Hoy() {
  const supabase = createClient();
  const [due, setDue] = useState<Prospect[]>([]);
  const [recheck, setRecheck] = useState<Prospect[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [sentToday, setSentToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const t = today();

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: r }, { data: s }, { count }] = await Promise.all([
      supabase
        .from("prospects")
        .select("*")
        .lte("next_contact_at", t)
        .not("status", "in", '("firmado","cerrado")')
        .order("next_contact_at", { ascending: true }),
      supabase
        .from("prospects")
        .select("*")
        .in("status", ["sin_respuesta", "lista_2_meses"])
        .not("ml_url", "is", null)
        .lt("updated_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("updated_at", { ascending: true })
        .limit(15),
      supabase.from("scripts").select("*").order("sort_order"),
      supabase
        .from("interactions")
        .select("*", { count: "exact", head: true })
        .eq("kind", "mensaje")
        .gte("happened_at", t + "T00:00:00")
        .lte("happened_at", t + "T23:59:59"),
    ]);
    setDue((d ?? []) as Prospect[]);
    setRecheck((r ?? []) as Prospect[]);
    setScripts((s ?? []) as Script[]);
    setSentToday(count ?? 0);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scriptFor(p: Prospect): Script | undefined {
    const step = followUpStep(p.first_message_at, p.next_contact_at);
    const slug = step.startsWith("Día 3") ? "seg_dia3" : step.startsWith("Día 8") ? "seg_dia8" : step.startsWith("Día 20") ? "seg_dia20" : "seg_dia3";
    return scripts.find((s) => s.slug === slug);
  }

  async function markSent(p: Prospect) {
    const first = p.first_message_at ?? t;
    const elapsed = daysBetween(first, t);
    let next: string | null;
    let status = p.status;
    if (elapsed < 3) next = addDays(first, 3);
    else if (elapsed < 8) next = addDays(first, 8);
    else if (elapsed < 20) next = addDays(first, 20);
    else {
      next = addDays(t, 60);
      status = "lista_2_meses";
    }
    await supabase.from("interactions").insert({ prospect_id: p.id, kind: "mensaje", content: scriptFor(p)?.title ?? "Seguimiento" });
    await supabase.from("prospects").update({ next_contact_at: next, status, first_message_at: first }).eq("id", p.id);
    load();
  }

  async function markChecked(p: Prospect) {
    await supabase.from("prospects").update({ updated_at: new Date().toISOString() }).eq("id", p.id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="serif text-2xl font-semibold">Hoy</h1>
        <p className="text-sm text-muted">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </header>

      {/* Ritmo del día */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Mensajes nuevos hoy" value={`${sentToday}/10`} hint={sentToday >= 10 ? "¡Listo por hoy!" : "Objetivo: 10"} />
        <Stat label="Seguimientos pendientes" value={String(due.length)} hint="Primero estos" />
        <Stat label="Para revisar precio" value={String(recheck.length)} hint="Una vez por semana" />
      </div>

      {/* Seguimientos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Seguimientos de hoy</h2>
          <Link href="/panel/prospectos/nuevo" className="btn-primary !py-1.5 !px-3 text-xs">+ Nuevo prospecto</Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : due.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            Nada pendiente. Abrí Mercado Libre, filtrá por particular en tu zona y mandá los 10 de hoy.
          </div>
        ) : (
          <ul className="space-y-3">
            {due.map((p) => {
              const sc = scriptFor(p);
              const text = sc ? fillScript(sc.body, p) : "";
              const overdue = p.next_contact_at && p.next_contact_at < t;
              return (
                <li key={p.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/panel/prospectos/${p.id}`} className="font-semibold hover:underline">
                        {p.model} {p.year ?? ""}
                      </Link>
                      <div className="text-sm text-muted">
                        {p.owner_name || "Sin nombre"} · <span className={`chip ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">{followUpStep(p.first_message_at, p.next_contact_at)}</div>
                      <div className={overdue ? "text-bad" : "text-muted"}>{overdue ? "Atrasado · " : ""}{fmtDate(p.next_contact_at)}</div>
                    </div>
                  </div>
                  {text && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm">{text}</pre>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {text && <CopyButton text={text} label="Copiar mensaje" />}
                    {p.ml_url && (
                      <a href={p.ml_url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !px-3 text-xs">Ver publicación ↗</a>
                    )}
                    <button onClick={() => markSent(p)} className="btn-primary !py-1.5 !px-3 text-xs">Ya lo mandé</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Revisión semanal de precios */}
      <section>
        <h2 className="mb-1 font-semibold">¿Le bajó el precio?</h2>
        <p className="mb-3 text-sm text-muted">Los que no contestaron y hace más de una semana que no revisás. Si bajó el precio, es el mejor momento para escribirle.</p>
        {recheck.length === 0 ? (
          <div className="card p-4 text-sm text-muted">Nada para revisar esta semana.</div>
        ) : (
          <ul className="divide-y divide-line card">
            {recheck.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <Link href={`/panel/prospectos/${p.id}`} className="font-medium hover:underline">{p.model} {p.year ?? ""}</Link>
                  <span className="text-muted"> · publicado a {p.current_price ? "$" + Math.round(p.current_price).toLocaleString("es-AR") : "—"}</span>
                </div>
                <div className="flex gap-2">
                  {p.ml_url && <a href={p.ml_url} target="_blank" rel="noreferrer" className="btn-ghost !py-1 !px-2 text-xs">Ver ↗</a>}
                  <Link href={`/panel/prospectos/${p.id}?precio=1`} className="btn-ghost !py-1 !px-2 text-xs">Bajó el precio</Link>
                  <button onClick={() => markChecked(p)} className="btn-ghost !py-1 !px-2 text-xs">Sigue igual</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{hint}</div>
    </div>
  );
}
