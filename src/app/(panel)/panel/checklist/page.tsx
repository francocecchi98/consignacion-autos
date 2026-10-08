"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { semaforo } from "@/lib/checklist";
import { fmtDate } from "@/lib/domain";

type Row = { id: string; car: string; plate: string | null; visit_date: string | null; holder_name: string | null; items: Record<string, boolean>; updated_at: string };

const COLOR = { verde: "bg-green-100 text-green-800", amarillo: "bg-amber-100 text-amber-800", rojo: "bg-red-100 text-red-800" };

export default function Checklists() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase.from("checklists").select("*").order("updated_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as Row[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl font-semibold">Hoja de la visita</h1>
          <p className="text-sm text-muted">La revisión de papeles, antes de publicar. Se pasa en cinco minutos con el dueño al lado.</p>
        </div>
        <Link href="/panel/checklist/nuevo" className="btn-primary">+ Nueva visita</Link>
      </header>

      <div className="card p-4 text-sm">
        <b>La regla:</b> <span className="text-muted">si falta algo de la lista, el auto no se publica. No se publica igual, no se publica “mientras lo va resolviendo”.</span>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">Todavía no hiciste ninguna visita.</div>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((r) => {
            const s = semaforo(r.items ?? {});
            return (
              <li key={r.id}>
                <Link href={`/panel/checklist/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg">
                  <div>
                    <div className="font-medium">{r.car || "Sin auto"} {r.plate ? `· ${r.plate}` : ""}</div>
                    <div className="text-sm text-muted">{r.holder_name || "—"} · {fmtDate(r.visit_date)}</div>
                  </div>
                  <span className={`chip ${COLOR[s.level]}`}>{s.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
