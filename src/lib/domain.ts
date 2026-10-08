export type Status =
  | "por_contactar"
  | "sin_respuesta"
  | "contesto"
  | "llamada_hecha"
  | "visita_agendada"
  | "firmado"
  | "cerrado"
  | "lista_2_meses";

export const STATUS: { value: Status; label: string; color: string }[] = [
  { value: "por_contactar", label: "Por contactar", color: "bg-line text-ink" },
  { value: "sin_respuesta", label: "Sin respuesta", color: "bg-slate-100 text-slate-700" },
  { value: "contesto", label: "Contestó", color: "bg-blue-100 text-blue-800" },
  { value: "llamada_hecha", label: "Llamada hecha", color: "bg-indigo-100 text-indigo-800" },
  { value: "visita_agendada", label: "Visita agendada", color: "bg-amber-100 text-amber-800" },
  { value: "firmado", label: "Firmado", color: "bg-green-100 text-green-800" },
  { value: "cerrado", label: "Cerrado", color: "bg-neutral-200 text-neutral-700" },
  { value: "lista_2_meses", label: "Lista 2 meses", color: "bg-purple-100 text-purple-800" },
];

export const statusLabel = (s: string) => STATUS.find((x) => x.value === s)?.label ?? s;
export const statusColor = (s: string) => STATUS.find((x) => x.value === s)?.color ?? "bg-line";

export type Prospect = {
  id: string;
  owner_name: string;
  phone: string | null;
  model: string;
  year: number | null;
  km: number | null;
  listed_price: number | null;
  current_price: number | null;
  ml_url: string | null;
  listed_since: string | null;
  first_message_at: string | null;
  status: Status;
  next_contact_at: string | null;
  notes: string;
  zone: string | null;
  created_at: string;
  updated_at: string;
};

export type Interaction = {
  id: string;
  prospect_id: string;
  kind: "mensaje" | "respuesta" | "llamada" | "visita" | "baja_precio" | "nota" | "estado";
  content: string;
  happened_at: string;
};

export type Script = { id: string; slug: string; title: string; body: string; sort_order: number };

export const today = () => new Date().toISOString().slice(0, 10);

export function addDays(dateISO: string, days: number) {
  const d = new Date(dateISO + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const da = new Date(a + "T12:00:00").getTime();
  const db = new Date(b + "T12:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

/** Secuencia del artículo: día 0 → 3 → 8 → 20 → lista 2 meses */
export function nextFollowUp(firstMessageAt: string, fromDate = today()): { date: string; step: string } | null {
  const elapsed = daysBetween(firstMessageAt, fromDate);
  if (elapsed < 3) return { date: addDays(firstMessageAt, 3), step: "Seguimiento día 3" };
  if (elapsed < 8) return { date: addDays(firstMessageAt, 8), step: "Seguimiento día 8" };
  if (elapsed < 20) return { date: addDays(firstMessageAt, 20), step: "Seguimiento día 20 (última)" };
  return null;
}

export function followUpStep(firstMessageAt: string | null, nextContactAt: string | null): string {
  if (!firstMessageAt || !nextContactAt) return "";
  const d = daysBetween(firstMessageAt, nextContactAt);
  if (d <= 3) return "Día 3";
  if (d <= 8) return "Día 8";
  if (d <= 20) return "Día 20 · última";
  return "Lista 2 meses";
}

export function fillScript(body: string, p: Partial<Prospect>) {
  const nombre = (p.owner_name || "").trim().split(" ")[0] || "";
  const modelo = [p.model, p.year].filter(Boolean).join(" ");
  return body.replaceAll("{nombre}", nombre).replaceAll("{modelo}", modelo);
}

export const fmtMoney = (n: number | null | undefined) =>
  n == null ? "—" : "$" + Math.round(n).toLocaleString("es-AR");

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y.slice(2)}`;
};
