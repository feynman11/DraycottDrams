"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Users, Loader2, CheckCircle2, XCircle, Shield, UserCheck, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import Link from "next/link";

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const { data: users, isLoading, refetch } = api.user.getAll.useQuery(undefined, {
    enabled: (!!session?.user?.admin || !!session?.user?.member) && status === "authenticated",
  });

  const updateStatusMutation = api.user.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setUpdatingUserId(null);
    },
    onError: () => {
      setUpdatingUserId(null);
    },
  });

  // Redirect if not a member or admin
  useEffect(() => {
    if (status === "authenticated" && session && !session.user?.member && !session.user?.admin) {
      router.push("/");
    }
  }, [session, status, router]);

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
        <Header viewMode="library" onViewModeChange={() => {}} />
        <main className="flex-1 relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        </main>
      </div>
    );
  }

  // Show unauthorized message if not a member or admin
  if (status === "authenticated" && session && !session.user?.member && !session.user?.admin) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
        <Header viewMode="library" onViewModeChange={() => {}} />
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

  const handleToggleMember = (userId: string, currentMember: boolean) => {
    setUpdatingUserId(userId);
    updateStatusMutation.mutate({
      userId,
      member: !currentMember,
    });
  };

  const handleToggleAdmin = (userId: string, currentAdmin: boolean) => {
    setUpdatingUserId(userId);
    updateStatusMutation.mutate({
      userId,
      admin: !currentAdmin,
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Header viewMode="library" onViewModeChange={() => {}} />
      <main className="flex-1 relative overflow-hidden">
        <div className="w-full h-full relative bg-slate-950">
          <div className="w-full h-full overflow-y-auto p-6 lg:p-12">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-3xl font-bold text-amber-50 border-b border-slate-800 pb-4 flex items-center gap-3 flex-1">
                    <Users className="w-8 h-8" />
                    Members Management
                  </h1>
                  {session?.user?.member && (
                    <Link href="/import">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Upload size={18} className="mr-2" />
                        Import
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-slate-400">
                  Manage member and admin status for all users.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : !users || users.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
                  <p className="text-slate-400">No users found.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800 border-b border-slate-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                            User
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-amber-400">
                            Member
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-amber-400">
                            Admin
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                            Joined
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">
                            Last Login
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {user.image ? (
                                  <img
                                    src={user.image}
                                    alt={user.name || user.email}
                                    className="w-10 h-10 rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-slate-400" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-slate-200">
                                    {user.name || "No name"}
                                  </div>
                                  <div className="text-sm text-slate-400">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isAdmin ? (
                                <button
                                  onClick={() => handleToggleMember(user.id, user.member)}
                                  disabled={updatingUserId === user.id}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    user.member
                                      ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                  } ${updatingUserId === user.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  {updatingUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : user.member ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      Member
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      Not Member
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                                  user.member
                                    ? "bg-green-900/30 text-green-400"
                                    : "bg-slate-800 text-slate-400"
                                }`}>
                                  {user.member ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      Member
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      Not Member
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isAdmin ? (
                                <button
                                  onClick={() => handleToggleAdmin(user.id, user.admin)}
                                  disabled={updatingUserId === user.id}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    user.admin
                                      ? "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50"
                                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                  } ${updatingUserId === user.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  {updatingUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : user.admin ? (
                                    <>
                                      <Shield className="w-4 h-4" />
                                      Admin
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4" />
                                      Not Admin
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                                  user.admin
                                    ? "bg-amber-900/30 text-amber-400"
                                    : "bg-slate-800 text-slate-400"
                                }`}>
                                  {user.admin ? (
                                    <>
                                      <Shield className="w-4 h-4" />
                                      Admin
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4" />
                                      Not Admin
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-sm">
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-sm">
                              {user.lastLogin
                                ? new Date(user.lastLogin).toLocaleDateString()
                                : "Never"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

