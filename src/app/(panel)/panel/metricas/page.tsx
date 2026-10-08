"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Interaction, type Prospect, STATUS, statusLabel } from "@/lib/domain";

export default function Metricas() {
  const supabase = createClient();
  const [ps, setPs] = useState<Prospect[]>([]);
  const [ints, setInts] = useState<Interaction[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    Promise.all([
      supabase.from("prospects").select("*"),
      supabase.from("interactions").select("*").gte("happened_at", new Date(Date.now() - 90 * 86400000).toISOString()),
    ]).then(([a, b]) => {
      setPs((a.data ?? []) as Prospect[]);
      setInts((b.data ?? []) as Interaction[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const since = new Date(Date.now() - days * 86400000);
  const sinceISO = since.toISOString().slice(0, 10);
  const inRange = ps.filter((p) => p.first_message_at && p.first_message_at >= sinceISO);
  const contacted = inRange.length;
  const replied = inRange.filter((p) => !["por_contactar", "sin_respuesta", "lista_2_meses"].includes(p.status)).length;
  const calls = inRange.filter((p) => ["llamada_hecha", "visita_agendada", "firmado", "cerrado"].includes(p.status)).length;
  const visits = ints.filter((i) => i.kind === "visita" && i.happened_at >= since.toISOString()).length;
  const signed = inRange.filter((p) => p.status === "firmado").length;
  const msgs = ints.filter((i) => i.kind === "mensaje" && i.happened_at >= since.toISOString()).length;
  const weeks = Math.max(1, days / 7);

  const replyRate = contacted ? (replied / contacted) * 10 : 0;
  const visitsPerWeek = visits / weeks;

  const diag =
    contacted < 10
      ? { tone: "neutral", text: "Todavía hay pocos mensajes para sacar conclusiones. Primero el volumen: 10 por día, de lunes a viernes." }
      : replyRate < 2
      ? { tone: "bad", text: "Te contestan menos de 2 de cada 10. El problema es el mensaje. Cambiá la primera línea antes de cambiar nada más." }
      : visitsPerWeek < 1
      ? { tone: "warn", text: "Te contestan pero no sacás visitas. El problema es la llamada, no el chat. Preguntá primero, cerrá la visita, no el acuerdo." }
      : { tone: "ok", text: "Los dos números están sanos. Mantené el ritmo: seguimientos primero, después los 10 nuevos." };

  const TONE = { neutral: "bg-bg", bad: "bg-red-50 text-red-900", warn: "bg-amber-50 text-amber-900", ok: "bg-green-50 text-green-900" } as const;

  // Mensajes por día (últimas 2 semanas)
  const perDay: { d: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    perDay.push({ d, n: ints.filter((x) => x.kind === "mensaje" && x.happened_at.slice(0, 10) === d).length });
  }
  const max = Math.max(10, ...perDay.map((x) => x.n));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl font-semibold">Los dos números</h1>
          <p className="text-sm text-muted">Si no sabés cuál está roto, no sabés qué arreglar.</p>
        </div>
        <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Última semana</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Big label="De cada 10, te contestan" value={replyRate.toFixed(1)} sub={`${replied} de ${contacted} contactados`} ok={replyRate >= 2} hint="Si es menos de 2, el problema es el mensaje." />
        <Big label="Visitas por semana" value={visitsPerWeek.toFixed(1)} sub={`${visits} visitas en ${Math.round(weeks)} semana${weeks > 1 ? "s" : ""}`} ok={visitsPerWeek >= 1} hint="Si contestan pero no hay visitas, el problema es la llamada." />
      </div>

      <div className={`rounded-xl p-4 text-sm ${TONE[diag.tone as keyof typeof TONE]}`}>{diag.text}</div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Small label="Mensajes enviados" value={msgs} />
        <Small label="Contactados" value={contacted} />
        <Small label="Llamadas" value={calls} />
        <Small label="Firmados" value={signed} />
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Mensajes por día · últimas dos semanas (objetivo: 10)</h2>
        <div className="flex h-32 items-end gap-1">
          {perDay.map((x) => {
            const dow = new Date(x.d + "T12:00:00").getDay();
            const weekend = dow === 0 || dow === 6;
            return (
              <div key={x.d} className="flex flex-1 flex-col items-center gap-1" title={`${x.d}: ${x.n}`}>
                <div className="w-full rounded-t bg-navy" style={{ height: `${(x.n / max) * 100}%`, opacity: weekend ? 0.35 : x.n >= 10 ? 1 : 0.7 }} />
                <span className="text-[9px] text-muted">{x.d.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Embudo (todos los prospectos)</h2>
        <ul className="space-y-1 text-sm">
          {STATUS.map((s) => {
            const n = ps.filter((p) => p.status === s.value).length;
            return (
              <li key={s.value} className="flex items-center gap-3">
                <span className="w-32 text-muted">{statusLabel(s.value)}</span>
                <div className="h-3 flex-1 rounded bg-bg"><div className="h-3 rounded bg-navy/70" style={{ width: `${ps.length ? (n / ps.length) * 100 : 0}%` }} /></div>
                <span className="w-8 text-right font-medium">{n}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Big({ label, value, sub, ok, hint }: { label: string; value: string; sub: string; ok: boolean; hint: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-4xl font-semibold ${ok ? "text-ok" : "text-bad"}`}>{value}</div>
      <div className="text-sm text-muted">{sub}</div>
      <div className="mt-2 text-xs text-muted">{hint}</div>
    </div>
  );
}
function Small({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
