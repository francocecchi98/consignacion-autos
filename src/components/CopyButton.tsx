"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      alert("No se pudo copiar. Seleccioná el texto y copialo a mano.");
    }
  }
  return (
    <button type="button" onClick={copy} className={`btn-ghost !py-1.5 !px-3 text-xs ${className}`}>
      {done ? "✓ Copiado" : label}
    </button>
  );
}
