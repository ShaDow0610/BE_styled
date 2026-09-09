import Navbar from "@/components/common/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="bg-ivory min-h-screen">{children}</main>
    </>
  );
}
