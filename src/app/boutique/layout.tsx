import BoutiqueHeader from "./components/BoutiqueHeader";
import BoutiqueFooter from "./components/BoutiqueFooter";

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <BoutiqueHeader />
      <main className="flex-1">{children}</main>
      <BoutiqueFooter />
    </div>
  );
}
