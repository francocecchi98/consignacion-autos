"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChecklistForm, emptyChecklist } from "@/components/ChecklistForm";

function Inner() {
  const sp = useSearchParams();
  const prospectId = sp.get("prospecto");
  const [initial, setInitial] = useState<ReturnType<typeof emptyChecklist> | null>(null);

  useEffect(() => {
    if (!prospectId) {
      setInitial(emptyChecklist());
      return;
    }
    createClient()
      .from("prospects")
      .select("model,year,owner_name,km")
      .eq("id", prospectId)
      .single()
      .then(({ data }) => {
        setInitial(
          emptyChecklist(
            prospectId,
            data ? [data.model, data.year].filter(Boolean).join(" ") : "",
            data?.owner_name ?? "",
            data?.km ? String(data.km) : ""
          )
        );
      });
  }, [prospectId]);

  if (!initial) return <p className="text-sm text-muted">Cargando…</p>;
  return <ChecklistForm initial={initial} />;
}

export default function Nuevo() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
