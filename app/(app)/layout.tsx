import { BarreNavigationBasse } from "@/components/layout/BarreNavigationBasse";
import { BarreSuperieure } from "@/components/layout/BarreSuperieure";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F7F5]">
      <BarreSuperieure />
      <div className="pb-24">{children}</div>
      <BarreNavigationBasse />
    </div>
  );
}
