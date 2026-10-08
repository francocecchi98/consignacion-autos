import { createClient } from "@/lib/supabase/server";
import { Testimonials, type Testimonial } from "@/components/Testimonials";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Settings = Record<string, string>;

async function getData() {
  const supabase = await createClient();
  const [{ data: s, error: e1 }, { data: t, error: e2 }] = await Promise.all([
    supabase.from("site_settings").select("key,value"),
    supabase
      .from("testimonials")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true }),
  ]);
  if (e1 || e2) console.error("site data error", e1 ?? e2);
  const settings: Settings = {};
  (s ?? []).forEach((r) => (settings[r.key] = r.value));
  return { settings, testimonials: (t ?? []) as Testimonial[] };
}

export default async function Home() {
  const { settings: s, testimonials } = await getData();
  const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(
    "Hola Franco, vi tu página. Quiero que me cuentes cómo vendés mi auto."
  )}`;
  const pasos = [1, 2, 3, 4].map((i) => ({
    titulo: s[`paso_${i}_titulo`],
    texto: s[`paso_${i}_texto`],
  }));

  return (
    <main className="flex-1">
      {/* Barra */}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="serif text-lg font-semibold tracking-tight">
            {s.nombre?.split(" ")[0]} Cecchi
          </span>
          <nav className="hidden gap-6 text-sm text-muted sm:flex">
            <a href="#como" className="hover:text-ink">Cómo trabajo</a>
            <a href="#clientes" className="hover:text-ink">Entregas</a>
            <a href="#contenido" className="hover:text-ink">Videos</a>
            <a href="#preguntas" className="hover:text-ink">Preguntas</a>
          </nav>
          <a href={wa} className="btn-primary !py-1.5 !px-3 text-xs sm:text-sm">
            WhatsApp
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-16 pt-12 sm:grid-cols-[1.2fr_1fr] sm:items-center sm:pt-20">
        <div>
          <p className="mb-4 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            Consignación de autos · {s.zona}
          </p>
          <h1 className="serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {s.titulo}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {s.subtitulo}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={wa} className="btn-primary !px-5 !py-3 text-base">
              Contame cómo lo hacés
            </a>
            <a href="#como" className="btn-ghost !px-5 !py-3 text-base">
              Ver cómo trabajo
            </a>
          </div>
          <ul className="mt-8 grid gap-2 text-sm text-muted sm:grid-cols-3">
            <li className="flex items-center gap-2"><Check /> El auto queda en tu casa</li>
            <li className="flex items-center gap-2"><Check /> Vos no ponés un peso</li>
            <li className="flex items-center gap-2"><Check /> Comisión {s.comision} solo si se vende</li>
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-accent-soft" />
          {s.foto_perfil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.foto_perfil}
              alt={s.nombre}
              className="aspect-[4/5] w-full rounded-[1.5rem] object-cover shadow-lg"
            />
          ) : null}
          <div className="absolute bottom-4 left-4 rounded-lg bg-white/95 px-3 py-2 text-sm shadow">
            <div className="font-semibold">{s.nombre}</div>
            <div className="text-xs text-muted">{s.zona}</div>
          </div>
        </div>
      </section>

      {/* Sobre mí */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="serif text-2xl font-semibold sm:text-3xl">Quién soy</h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted whitespace-pre-line">
            {s.sobre_mi}
          </p>
        </div>
      </section>

      {/* Cómo trabajo */}
      <section id="como" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="serif text-2xl font-semibold sm:text-3xl">Cómo trabajo</h2>
        <p className="mt-2 text-muted">Cuatro pasos. Vos solo tenés que abrirme la puerta.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {pasos.map((p, i) => (
            <li key={i} className="card p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold">{p.titulo}</h3>
              <p className="mt-2 leading-relaxed text-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Entregas (fotos) */}
      <section id="clientes" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="serif text-2xl font-semibold sm:text-3xl">{s.entregas_titulo}</h2>
          <p className="mt-2 max-w-2xl text-muted">{s.entregas_texto}</p>
          <div className="mt-8">
            <Testimonials items={testimonials.filter((t) => t.kind === "foto")} />
          </div>
          {s.entregas_cierre && (
            <p className="mt-8 text-center text-lg text-muted serif italic">{s.entregas_cierre}</p>
          )}
        </div>
      </section>

      {/* Videos / contenido */}
      {testimonials.some((t) => t.kind === "video") && (
        <section id="contenido" className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="serif text-2xl font-semibold sm:text-3xl">{s.videos_titulo}</h2>
          <p className="mt-2 max-w-2xl text-muted">{s.videos_texto}</p>
          <div className="mt-8">
            <Testimonials items={testimonials.filter((t) => t.kind === "video")} />
          </div>
        </section>
      )}

      {/* Preguntas */}
      <section id="preguntas" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="serif text-2xl font-semibold sm:text-3xl">Preguntas frecuentes</h2>
        <dl className="mt-8 divide-y divide-line">
          {[
            ["¿Me comprás el auto?", "No. Yo lo vendo por vos y cobro comisión cuando se vende. El auto sigue siendo tuyo hasta que aparezca el comprador."],
            ["¿Cuánto cobrás?", `${s.comision} del precio de venta, y solo si se vende. Si no se vende, no me pagás nada.`],
            ["¿Tenés local?", "No tengo local, trabajo solo y por eso puedo cobrar menos que una agencia. El auto no se mueve de tu casa."],
            ["¿Qué pasa con los papeles?", "Antes de publicar revisamos juntos título, cédula, deudas e informe de dominio. Si falta algo, te digo qué es y quién lo resuelve. La transferencia la hace un gestor."],
            ["¿Y si quiero seguir intentando solo?", "Perfecto. Si en dos o tres semanas seguís con el auto, escribime y lo trabajamos. No te cuesta nada probar."],
          ].map(([q, a]) => (
            <div key={q} className="py-5">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 leading-relaxed text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA final */}
      <section className="bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="serif text-2xl font-semibold sm:text-3xl">{s.cta_texto}</h2>
            <p className="mt-2 text-white/70">Escribime y te cuento en cuánto se vende tu auto de verdad.</p>
          </div>
          <a href={wa} className="btn bg-accent text-navy-deep hover:bg-accent/90 !px-6 !py-3 text-base">
            Escribirme por WhatsApp
          </a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-xs text-muted">
        <span>© {new Date().getFullYear()} {s.nombre} · {s.zona}</span>
        <Link href="/login" className="hover:text-ink">Acceso</Link>
      </footer>
    </main>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ok">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
