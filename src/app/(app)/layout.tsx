import Navbar from "@/components/common/Navbar";
import { ToastProvider } from "@/components/common/ToastProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Navbar />
      <main className="bg-ivory min-h-screen">{children}</main>
    </ToastProvider>
  );
}
