import { AppShell } from "@/components/layout/app-shell";
import { DistilleryList } from "@/components/distillery/distillery-list";

export default function DistilleriesPage() {
  return (
    <AppShell>
      <DistilleryList />
    </AppShell>
  );
}
