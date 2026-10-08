import { PanelNav } from "@/components/PanelNav";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <PanelNav />
      <main className="flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pb-10">{children}</main>
    </div>
  );
}
