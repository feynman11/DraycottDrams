import { useState, useEffect } from "react";
import { Loader2, Users, BookOpen, Trophy, Building2, Calendar, AlertTriangle, FileSpreadsheet, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Header } from "@/components/layout/header";
import { MembersManagement } from "@/components/admin/members-management";
import { LibraryManagement } from "@/components/admin/library-management";
import { DistilleryManagement } from "@/components/admin/distillery-management";
import { GatheringsManagement } from "@/components/admin/gatherings-management";
import { DataIssues } from "@/components/admin/data-issues";
import { MyResults } from "@/components/member/my-results";
import { DramsSheet } from "@/components/member/drams-sheet";
import { AIReview } from "@/components/admin/ai-review";

type Tab = "members" | "whiskys" | "distilleries" | "gatherings" | "results" | "issues" | "sheet" | "review";

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

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
        <Header />
        <main className="flex-1 relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        </main>
      </div>
    );
  }

  // Show unauthorized message if not a member or admin
  if (!!session && !session.user?.member && !session.user?.admin) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
        <Header />
        <main className="flex-1 relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-slate-950 p-8">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-amber-400 mb-2">Access Denied</h2>
              <p className="text-slate-400">You must be a member to access this page.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isAdmin = session?.user?.admin;
  const isMember = session?.user?.member;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        <div className="w-full h-full relative bg-slate-950">
          <div className="w-full h-full overflow-y-auto p-6 lg:p-12">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-amber-50 border-b border-slate-800 pb-4">
                  Management
                </h1>
              </div>

              {/* Tabs */}
              <div className="mb-6 border-b border-slate-800 overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                <div className="flex gap-2 min-w-max md:min-w-0">
                  {isMember && (
                    <button
                      onClick={() => setActiveTab("results")}
                      className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                        activeTab === "results"
                          ? "text-amber-400 border-b-2 border-amber-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Trophy size={18} className="flex-shrink-0" />
                      <span className="text-sm md:text-base">My Results</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("sheet")}
                    className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                      activeTab === "sheet"
                        ? "text-amber-400 border-b-2 border-amber-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileSpreadsheet size={18} className="flex-shrink-0" />
                    <span className="text-sm md:text-base">Drams Sheet</span>
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setActiveTab("members")}
                        className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                          activeTab === "members"
                            ? "text-amber-400 border-b-2 border-amber-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Users size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base">Members</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("whiskys")}
                        className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                          activeTab === "whiskys"
                            ? "text-amber-400 border-b-2 border-amber-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <BookOpen size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base">Whiskys</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("distilleries")}
                        className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                          activeTab === "distilleries"
                            ? "text-amber-400 border-b-2 border-amber-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Building2 size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base">Distilleries</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("gatherings")}
                        className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                          activeTab === "gatherings"
                            ? "text-amber-400 border-b-2 border-amber-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Calendar size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base">Gatherings</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("issues")}
                        className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                          activeTab === "issues"
                            ? "text-amber-400 border-b-2 border-amber-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <AlertTriangle size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base">Data Issues</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("review")}
                        className={`px-3 py-3 md:px-4 md:py-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-[120px] md:min-w-0 justify-center md:justify-start ${
                          activeTab === "review"
                            ? "text-amber-400 border-b-2 border-amber-400"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Sparkles size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base">AI Review</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === "results" && isMember && <MyResults />}
                {activeTab === "members" && isAdmin && <MembersManagement />}
                {activeTab === "whiskys" && isAdmin && <LibraryManagement />}
                {activeTab === "distilleries" && isAdmin && <DistilleryManagement initialSearch={distillerySearch} />}
                {activeTab === "gatherings" && isAdmin && <GatheringsManagement />}
                {activeTab === "sheet" && <DramsSheet canUpload={!!isAdmin} />}
                {activeTab === "issues" && isAdmin && <DataIssues onEditDistillery={handleEditDistillery} />}
                {activeTab === "review" && isAdmin && <AIReview />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

