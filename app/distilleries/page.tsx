"use client";

import { Header } from "@/components/layout/header";
import { DistilleryList } from "@/components/distillery/distillery-list";

export default function DistilleriesPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Header />

      <main className="flex-1 min-h-0 relative overflow-hidden">
        <DistilleryList />
      </main>
    </div>
  );
}

