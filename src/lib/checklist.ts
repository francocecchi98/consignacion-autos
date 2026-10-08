export type Group = "papeles" | "auto" | "deudas" | "acuerdo";

export const CHECKLIST: { group: Group; title: string; items: { key: string; label: string; blocking?: boolean }[] }[] = [
  {
    group: "papeles",
    title: "Los papeles",
    items: [
      { key: "titulo_original", label: "Título original, a nombre de la persona presente", blocking: true },
      { key: "cedula_vigente", label: "Cédula de identificación vigente", blocking: true },
      { key: "dni_coincide", label: "DNI del titular, coincide con el título", blocking: true },
      { key: "titulo_sin_tachaduras", label: "Título sin tachaduras ni enmiendas", blocking: true },
      { key: "reverso_leido", label: "Leí el reverso del título (prenda, embargo)", blocking: true },
    ],
  },
  {
    group: "auto",
    title: "El auto",
    items: [
      { key: "chasis_ok", label: "Número de chasis legible y coincide", blocking: true },
      { key: "motor_ok", label: "Número de motor legible y coincide", blocking: true },
      { key: "patente_ok", label: "Patente coincide con título y cédula", blocking: true },
      { key: "fotos_numeros", label: "Fotos de los dos números y del título" },
      { key: "grabado", label: "Grabado de autopartes (si aplica en la provincia)" },
      { key: "vtv", label: "VTV vigente" },
    ],
  },
  {
    group: "deudas",
    title: "Deudas y antecedentes",
    items: [
      { key: "informe_dominio", label: "Informe de dominio pedido" },
      { key: "sin_prenda", label: "Sin prenda" },
      { key: "sin_embargo", label: "Sin embargo ni inhibición", blocking: true },
      { key: "patentes", label: "Patentes consultadas" },
      { key: "multas", label: "Multas consultadas (provincia, CABA, nacionales)" },
      { key: "deuda_acordada", label: "Acordado por escrito quién paga esa deuda" },
    ],
  },
  {
    group: "acuerdo",
    title: "El acuerdo",
    items: [
      { key: "precio_definido", label: "Precio de venta definido y explicado" },
      { key: "comision_acordada", label: "Comisión acordada" },
      { key: "acuerdo_firmado", label: "Acuerdo de consignación firmado por los dos" },
      { key: "fotos_sacadas", label: "Fotos del auto sacadas" },
    ],
  },
];

export const RED_FLAGS = [
  "El titular no es el que te habla y no se puede conseguir",
  "Número de motor o chasis ilegible, golpeado o regrabado",
  "El auto tiene embargo o el titular tiene inhibición",
  "El titular falleció y no hay sucesión hecha",
  "Te ofrecen un Formulario 08 firmado del dueño anterior",
  "El dueño no quiere mostrar el título",
];

export type Semaforo = { level: "verde" | "amarillo" | "rojo"; title: string; text: string };

export function semaforo(items: Record<string, boolean>): Semaforo {
  const all = CHECKLIST.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
  const missingBlocking = all.filter((i) => i.blocking && !items[i.key]);
  if (missingBlocking.length > 0) {
    return {
      level: "rojo",
      title: "No se trabaja el auto",
      text: "Falta algo de los papeles o los números no coinciden. No firmás nada, no sacás fotos, no prometés nada. Decile qué falta y quién lo resuelve.",
    };
  }
  const missingSoft = all.filter((i) => !i.blocking && !items[i.key] && i.group !== "acuerdo");
  if (missingSoft.length > 0) {
    return {
      level: "amarillo",
      title: "No se publica todavía",
      text: "Falta algo de deudas, VTV o grabado. Decile qué falta, quién lo resuelve y volvés cuando esté. El acuerdo lo podés firmar igual.",
    };
  }
  return { level: "verde", title: "Se publica", text: "Todo tildado. Hoy mismo si podés." };
}
