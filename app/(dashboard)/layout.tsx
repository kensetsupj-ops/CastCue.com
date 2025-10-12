import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-bg">
      <Sidebar />
      <div className="ml-[280px]">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
