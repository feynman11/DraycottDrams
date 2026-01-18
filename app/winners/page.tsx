"use client";

import { WinnersCircle } from "@/components/whisky/winners-circle";
import { Header } from "@/components/layout/header";

export default function WinnersPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Header />

      <main className="flex-1 min-h-0 relative overflow-hidden">
        <WinnersCircle />
      </main>
    </div>
  );
}
