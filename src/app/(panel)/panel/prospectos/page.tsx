"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type Prospect, STATUS, statusLabel, statusColor, fmtDate, fmtMoney, today } from "@/lib/domain";

export default function Prospectos() {
  const supabase = createClient();
  const [rows, setRows] = useState<Prospect[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("activos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("prospects")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as Prospect[]);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((p) => {
      if (status === "activos" && (p.status === "cerrado" || p.status === "firmado")) return false;
      if (status !== "activos" && status !== "todos" && p.status !== status) return false;
      if (!s) return true;
      return [p.model, p.owner_name, p.notes, String(p.year ?? "")].join(" ").toLowerCase().includes(s);
    });
  }, [rows, q, status]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl font-semibold">Prospectos</h1>
          <p className="text-sm text-muted">{rows.length} en total · la planilla, pero viva</p>
        </div>
        <Link href="/panel/prospectos/nuevo" className="btn-primary">+ Nuevo</Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <input className="input sm:max-w-xs" placeholder="Buscar modelo, dueño, nota…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="activos">Activos</option>
          <option value="todos">Todos</option>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          Todavía no hay prospectos. Cargá el primero con el botón “Nuevo”.
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {filtered.map((p) => {
            const late = p.next_contact_at && p.next_contact_at < today() && !["firmado", "cerrado"].includes(p.status);
            return (
              <li key={p.id}>
                <Link href={`/panel/prospectos/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-bg">
                  <div className="min-w-0">
                    <div className="font-medium">{p.model} {p.year ?? ""} <span className="text-muted font-normal">· {fmtMoney(p.current_price ?? p.listed_price)}</span></div>
                    <div className="truncate text-sm text-muted">{p.owner_name || "Sin nombre"}{p.notes ? ` · ${p.notes}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={late ? "text-bad font-medium" : "text-muted"}>{p.next_contact_at ? `Próx. ${fmtDate(p.next_contact_at)}` : ""}</span>
                    <span className={`chip ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
