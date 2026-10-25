import { useState, useEffect } from "react";
import { LogIn, Users, BookOpen, Trophy, Building2, Calendar, AlertTriangle, FileSpreadsheet, Sparkles, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MembersManagement } from "@/components/admin/members-management";
import { LibraryManagement } from "@/components/admin/library-management";
import { DistilleryManagement } from "@/components/admin/distillery-management";
import { GatheringsManagement } from "@/components/admin/gatherings-management";
import { DataIssues } from "@/components/admin/data-issues";
import { MyResults } from "@/components/member/my-results";
import { DramsSheet } from "@/components/member/drams-sheet";
import { AIReview } from "@/components/admin/ai-review";

type Tab = "members" | "whiskys" | "distilleries" | "gatherings" | "results" | "issues" | "sheet" | "review";

// Which tabs each role sees, in order
const TABS: { value: Tab; label: string; icon: React.ReactNode; role: "member" | "admin" | "any" }[] = [
  { value: "results", label: "My results", icon: <Trophy />, role: "member" },
  { value: "sheet", label: "Drams sheet", icon: <FileSpreadsheet />, role: "any" },
  { value: "members", label: "Members", icon: <Users />, role: "admin" },
  { value: "whiskys", label: "Whiskies", icon: <BookOpen />, role: "admin" },
  { value: "distilleries", label: "Distilleries", icon: <Building2 />, role: "admin" },
  { value: "gatherings", label: "Gatherings", icon: <Calendar />, role: "admin" },
  { value: "issues", label: "Data issues", icon: <AlertTriangle />, role: "admin" },
  { value: "review", label: "AI review", icon: <Sparkles />, role: "admin" },
];

export default function MembersPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("results");
  const [distillerySearch, setDistillerySearch] = useState<string>("");

  // Handler for editing a distillery from DataIssues
  const handleEditDistillery = (distilleryName: string) => {
    setDistillerySearch(distilleryName);
    setActiveTab("distilleries");
  };

  // Redirect if not a member or admin
  useEffect(() => {
    if (!!session && !session.user?.member && !session.user?.admin) {
      navigate({ to: "/" });
    }
  }, [session, navigate]);

  // Set default tab based on role
  useEffect(() => {
    if (!!session) {
      if (session.user?.admin) {
        setActiveTab("members");
      } else if (session.user?.member) {
        setActiveTab("results");
      }
    }
  }, [session]);

  const isAdmin = !!session?.user?.admin;
  const isMember = !!session?.user?.member;

  // Show loading while checking auth
  if (isPending) {
    return (
      <AppShell>
        <PageContainer aria-busy>
          <Skeleton className="mb-8 h-12 w-64" />
          <Skeleton className="mb-6 h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </PageContainer>
      </AppShell>
    );
  }

  // Signed out: offer to sign in rather than an empty management page
  if (!session) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            icon={<Lock />}
            title="Members only"
            description="Sign in to see your results and the drams sheet."
            action={
              <Button onClick={() => navigate({ to: "/signin", search: { callbackUrl: "/members" } })}>
                <LogIn size={16} /> Sign in
              </Button>
            }
            className="mx-auto max-w-md"
          />
        </PageContainer>
      </AppShell>
    );
  }

  // Show unauthorized message if not a member or admin
  if (!isMember && !isAdmin) {
    return (
      <AppShell>
        <PageContainer>
          <EmptyState
            icon={<Lock />}
            title="Access denied"
            description="You must be a member to access this page. Ask an admin to link your account."
            className="mx-auto max-w-md"
          />
        </PageContainer>
      </AppShell>
    );
  }

  const tabs = TABS.filter((t) => t.role === "any" || (t.role === "member" && isMember) || (t.role === "admin" && isAdmin));

  return (
    <AppShell>
      <PageContainer className="max-w-6xl">
        <PageHeader
          title={isAdmin ? "Management" : "Members"}
          description={isAdmin ? "Members, drams, distilleries and gatherings." : "Your results and the club's drams sheet."}
          className="mb-6"
        />

        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} label="Members sections" className="mb-6" />

        <div key={activeTab} className="animate-fade-in">
          {activeTab === "results" && isMember && <MyResults />}
          {activeTab === "members" && isAdmin && <MembersManagement />}
          {activeTab === "whiskys" && isAdmin && <LibraryManagement />}
          {activeTab === "distilleries" && isAdmin && <DistilleryManagement initialSearch={distillerySearch} />}
          {activeTab === "gatherings" && isAdmin && <GatheringsManagement />}
          {activeTab === "sheet" && <DramsSheet canUpload={isAdmin} />}
          {activeTab === "issues" && isAdmin && <DataIssues onEditDistillery={handleEditDistillery} />}
          {activeTab === "review" && isAdmin && <AIReview />}
        </div>
      </PageContainer>
    </AppShell>
  );
}
