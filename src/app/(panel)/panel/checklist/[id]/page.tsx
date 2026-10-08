"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChecklistForm } from "@/components/ChecklistForm";

export default function Editar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<React.ComponentProps<typeof ChecklistForm>["initial"] | null>(null);

  useEffect(() => {
    createClient()
      .from("checklists")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setInitial({
          id: data.id,
          prospect_id: data.prospect_id,
          car: data.car ?? "",
          plate: data.plate ?? "",
          visit_date: data.visit_date ?? "",
          holder_name: data.holder_name ?? "",
          holder_phone: data.holder_phone ?? "",
          km: data.km ? String(data.km) : "",
          items: data.items ?? {},
          notes: data.notes ?? "",
        });
      });
  }, [id]);

  if (!initial) return <p className="text-sm text-muted">Cargando…</p>;
  return <ChecklistForm initial={initial} />;
}
