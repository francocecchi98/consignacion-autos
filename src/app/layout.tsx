import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Franco Cecchi · Vendo tu auto por vos",
  description:
    "Venta de autos de particulares a consignación en San Juan. El auto queda en tu casa, vos no ponés nada, cobro solo cuando se vende.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
