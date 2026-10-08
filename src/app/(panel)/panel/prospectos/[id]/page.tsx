"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  type Prospect,
  type Interaction,
  type Script,
  STATUS,
  type Status,
  addDays,
  today,
  fillScript,
  fmtDate,
  fmtMoney,
  followUpStep,
  statusColor,
  statusLabel,
} from "@/lib/domain";
import { CopyButton } from "@/components/CopyButton";

const KIND_LABEL: Record<Interaction["kind"], string> = {
  mensaje: "Mensaje enviado",
  respuesta: "Respondió",
  llamada: "Llamada",
  visita: "Visita",
  baja_precio: "Bajó el precio",
  nota: "Nota",
  estado: "Cambio de estado",
};

export default function Detalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = createClient();
  const [p, setP] = useState<Prospect | null>(null);
  const [edit, setEdit] = useState<Partial<Prospect>>({});
  const [ints, setInts] = useState<Interaction[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [note, setNote] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [showPrice, setShowPrice] = useState(sp.get("precio") === "1");
  const [editing, setEditing] = useState(false);

  async function load() {
    const [{ data: pr }, { data: it }, { data: sc }] = await Promise.all([
      supabase.from("prospects").select("*").eq("id", id).single(),
      supabase.from("interactions").select("*").eq("prospect_id", id).order("happened_at", { ascending: false }),
      supabase.from("scripts").select("*").order("sort_order"),
    ]);
    setP(pr as Prospect);
    setEdit(pr as Prospect);
    setInts((it ?? []) as Interaction[]);
    setScripts((sc ?? []) as Script[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) return <p className="text-sm text-muted">Cargando…</p>;

  const t = today();

  async function log(kind: Interaction["kind"], content: string) {
    await supabase.from("interactions").insert({ prospect_id: id, kind, content });
  }

  async function setStatus(status: Status) {
    const patch: Partial<Prospect> = { status };
    if (status === "contesto") patch.next_contact_at = t;
    if (status === "llamada_hecha") patch.next_contact_at = addDays(t, 1);
    if (status === "lista_2_meses") patch.next_contact_at = addDays(t, 60);
    if (status === "firmado" || status === "cerrado") patch.next_contact_at = null;
    await supabase.from("prospects").update(patch).eq("id", id);
    await log("estado", statusLabel(status));
    load();
  }

  async function sendScript(s: Script) {
    const first = p!.first_message_at ?? t;
    const patch: Partial<Prospect> = { first_message_at: first };
    if (s.slug === "primer_mensaje") {
      patch.status = "sin_respuesta";
      patch.next_contact_at = addDays(t, 3);
    } else if (s.slug === "seg_dia3") patch.next_contact_at = addDays(first, 8);
    else if (s.slug === "seg_dia8") patch.next_contact_at = addDays(first, 20);
    else if (s.slug === "seg_dia20") {
      patch.next_contact_at = addDays(t, 60);
      patch.status = "lista_2_meses";
    } else if (s.slug === "seg_bajo_precio") patch.next_contact_at = addDays(t, 3);
    else if (s.slug === "resp_lo_vendo_yo") {
      patch.next_contact_at = addDays(t, 21);
    }
    await supabase.from("prospects").update(patch).eq("id", id);
    await log("mensaje", s.title);
    load();
  }

  async function addNote() {
    if (!note.trim()) return;
    await log("nota", note.trim());
    setNote("");
    load();
  }

  async function priceDrop() {
    const n = Number(newPrice.replace(/\D/g, ""));
    if (!n) return;
    await supabase.from("price_checks").insert({ prospect_id: id, price: n });
    await supabase.from("prospects").update({ current_price: n, next_contact_at: t }).eq("id", id);
    await log("baja_precio", `De ${fmtMoney(p!.current_price)} a ${fmtMoney(n)}`);
    setNewPrice("");
    setShowPrice(false);
    load();
  }

  async function saveEdit() {
    const { id: _id, created_at, updated_at, ...rest } = edit as Prospect;
    void _id; void created_at; void updated_at;
    await supabase.from("prospects").update({
      ...rest,
      year: rest.year ? Number(rest.year) : null,
      km: rest.km ? Number(rest.km) : null,
      listed_price: rest.listed_price ? Number(rest.listed_price) : null,
      current_price: rest.current_price ? Number(rest.current_price) : null,
      ml_url: rest.ml_url || null,
      phone: rest.phone || null,
      listed_since: rest.listed_since || null,
      first_message_at: rest.first_message_at || null,
      next_contact_at: rest.next_contact_at || null,
    }).eq("id", id);
    setEditing(false);
    load();
  }

  async function remove() {
    if (!confirm("¿Borrar este prospecto y todo su historial?")) return;
    await supabase.from("prospects").delete().eq("id", id);
    router.replace("/panel/prospectos");
  }

  const suggested = scripts.filter((s) => {
    const step = followUpStep(p.first_message_at, p.next_contact_at);
    if (p.status === "por_contactar") return s.slug === "primer_mensaje";
    if (p.status === "sin_respuesta") {
      if (step.startsWith("Día 3")) return s.slug === "seg_dia3";
      if (step.startsWith("Día 8")) return s.slug === "seg_dia8";
      if (step.startsWith("Día 20")) return s.slug === "seg_dia20";
      return s.slug === "seg_bajo_precio";
    }
    if (p.status === "contesto") return s.slug.startsWith("resp_");
    if (p.status === "llamada_hecha" || p.status === "visita_agendada") return s.slug === "llamada" || s.slug.startsWith("visita_");
    if (p.status === "lista_2_meses") return s.slug === "seg_bajo_precio";
    return false;
  });
  const others = scripts.filter((s) => !suggested.includes(s));

  const drop = p.listed_price && p.current_price && p.current_price < p.listed_price;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/panel/prospectos" className="text-sm text-muted hover:text-ink">← Prospectos</Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="serif text-2xl font-semibold">{p.model} {p.year ?? ""}</h1>
          <p className="text-muted">
            {p.owner_name || "Sin nombre"}{p.phone ? ` · ${p.phone}` : ""} · {p.km ? `${p.km.toLocaleString("es-AR")} km · ` : ""}
            {fmtMoney(p.current_price ?? p.listed_price)}
            {drop && <span className="ml-2 chip bg-green-100 text-green-800">↓ bajó de {fmtMoney(p.listed_price)}</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
            {p.listed_since && <span>Publicado desde {fmtDate(p.listed_since)}</span>}
            {p.first_message_at && <span>· 1er mensaje {fmtDate(p.first_message_at)}</span>}
            {p.next_contact_at && <span>· Próximo contacto <b className={p.next_contact_at < t ? "text-bad" : ""}>{fmtDate(p.next_contact_at)}</b> ({followUpStep(p.first_message_at, p.next_contact_at)})</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {p.ml_url && <a href={p.ml_url} target="_blank" rel="noreferrer" className="btn-ghost">Publicación ↗</a>}
          {p.phone && <a href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn-ghost">WhatsApp</a>}
          <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>{editing ? "Cerrar" : "Editar"}</button>
        </div>
      </header>

      {editing && (
        <div className="card grid gap-3 p-5 sm:grid-cols-2">
          {([
            ["model", "Modelo", "text"], ["year", "Año", "number"], ["owner_name", "Dueño", "text"], ["phone", "Teléfono (con 54 9…)", "text"],
            ["km", "Km", "number"], ["listed_price", "Precio original", "number"], ["current_price", "Precio actual", "number"], ["ml_url", "Link ML", "url"],
            ["listed_since", "Publicado desde", "date"], ["first_message_at", "Primer mensaje", "date"], ["next_contact_at", "Próximo contacto", "date"], ["zone", "Zona", "text"],
          ] as const).map(([k, label, type]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input className="input" type={type} value={(edit[k] as string | number | null) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="label">Notas (por qué vende, apuro, qué dijo)</label>
            <textarea className="input" rows={3} value={edit.notes ?? ""} onChange={(e) => setEdit((x) => ({ ...x, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" onClick={saveEdit}>Guardar cambios</button>
            <button className="btn-danger ml-auto" onClick={remove}>Borrar prospecto</button>
          </div>
        </div>
      )}

      {/* Estado */}
      <section className="card p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Estado</div>
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`chip !px-3 !py-1.5 border ${p.status === s.value ? "border-navy ring-2 ring-navy/20 " + s.color : "border-line bg-white text-muted hover:bg-bg"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {p.notes && <p className="mt-3 rounded-lg bg-bg p-3 text-sm whitespace-pre-wrap">{p.notes}</p>}
      </section>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        {/* Guiones */}
        <section className="space-y-3">
          <h2 className="font-semibold">Qué mandarle ahora</h2>
          {suggested.length === 0 && <p className="text-sm text-muted">Este prospecto está {statusLabel(p.status).toLowerCase()}. No hay mensaje pendiente.</p>}
          {suggested.map((s) => {
            const text = fillScript(s.body, p);
            return (
              <div key={s.id} className="card p-4">
                <div className="mb-2 text-sm font-semibold">{s.title}</div>
                <pre className="whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-relaxed">{text}</pre>
                <div className="mt-2 flex gap-2">
                  <CopyButton text={text} label="Copiar" />
                  {(s.slug.startsWith("seg_") || s.slug === "primer_mensaje" || s.slug === "resp_lo_vendo_yo") && (
                    <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => sendScript(s)}>Ya lo mandé</button>
                  )}
                </div>
              </div>
            );
          })}
          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-medium">Otros guiones</summary>
            <div className="mt-3 space-y-3">
              {others.map((s) => {
                const text = fillScript(s.body, p);
                return (
                  <div key={s.id}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted">
                      {s.title} <CopyButton text={text} />
                    </div>
                    <pre className="whitespace-pre-wrap rounded-lg bg-bg p-3 text-xs">{text}</pre>
                  </div>
                );
              })}
            </div>
          </details>
        </section>

        {/* Historial */}
        <section className="space-y-3">
          <h2 className="font-semibold">Historial</h2>
          <div className="card p-3">
            <div className="flex gap-2">
              <input className="input" placeholder="Anotar algo (qué dijo, por qué vende…)" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
              <button className="btn-ghost shrink-0" onClick={addNote}>Anotar</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-ghost !py-1 !px-2 text-xs" onClick={async () => { await log("respuesta", "Contestó"); setStatus("contesto"); }}>Contestó</button>
              <button className="btn-ghost !py-1 !px-2 text-xs" onClick={async () => { await log("llamada", "Llamada hecha"); setStatus("llamada_hecha"); }}>Llamada hecha</button>
              <button className="btn-ghost !py-1 !px-2 text-xs" onClick={async () => { await log("visita", "Visita"); setStatus("visita_agendada"); }}>Visita</button>
              <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => setShowPrice((v) => !v)}>Bajó el precio</button>
            </div>
            {showPrice && (
              <div className="mt-2 flex gap-2">
                <input className="input" inputMode="numeric" placeholder="Nuevo precio" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                <button className="btn-primary shrink-0" onClick={priceDrop}>Registrar</button>
              </div>
            )}
          </div>
          <ul className="card divide-y divide-line text-sm">
            {ints.length === 0 && <li className="p-3 text-muted">Sin movimientos todavía.</li>}
            {ints.map((i) => (
              <li key={i.id} className="flex gap-3 px-3 py-2">
                <span className="w-24 shrink-0 text-xs text-muted">{new Date(i.happened_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} {new Date(i.happened_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span><b className="font-medium">{KIND_LABEL[i.kind]}</b>{i.content && i.content !== KIND_LABEL[i.kind] ? ` · ${i.content}` : ""}</span>
              </li>
            ))}
          </ul>
          <Link href={`/panel/checklist/nuevo?prospecto=${p.id}`} className="btn-ghost w-full">📋 Hoja de la visita para este auto</Link>
        </section>
      </div>
    </div>
  );
}
