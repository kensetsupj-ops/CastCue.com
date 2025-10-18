"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FeedbackButton } from "@/components/FeedbackButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-bg dark:bg-gray-900">
      <Sidebar />
      <div className="ml-[280px]">
        <main className="p-8">{children}</main>
      </div>
      <FeedbackButton />
    </div>
  );
}
