"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/panel", label: "Hoy", icon: "☀️" },
  { href: "/panel/prospectos", label: "Prospectos", icon: "🚗" },
  { href: "/panel/guiones", label: "Guiones", icon: "💬" },
  { href: "/panel/checklist", label: "Papeles", icon: "📋" },
  { href: "/panel/metricas", label: "Números", icon: "📈" },
  { href: "/panel/sitio", label: "Mi sitio", icon: "🌐" },
];

export function PanelNav() {
  const path = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === "/panel" ? path === href : path.startsWith(href));

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface sm:flex">
        <div className="px-5 py-5">
          <div className="serif text-lg font-semibold">Panel</div>
          <div className="text-xs text-muted">Consignación</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                active(i.href) ? "bg-navy text-white" : "text-ink hover:bg-bg"
              }`}
            >
              <span>{i.icon}</span>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 px-3 py-4 text-sm">
          <Link href="/" className="block rounded-lg px-3 py-2 text-muted hover:bg-bg">Ver sitio público ↗</Link>
          <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-bg">Salir</button>
        </div>
      </aside>

      {/* Celular */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-line bg-surface sm:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
              active(i.href) ? "text-navy font-semibold" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
