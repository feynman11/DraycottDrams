"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Shield, UserCheck, Users, Plus, Save, X, Edit2, Trash2 } from "lucide-react";

export function MembersManagement() {
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [memberForm, setMemberForm] = useState<{ name: string; userId: string }>({ name: "", userId: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: users, isLoading, refetch: refetchUsers } = api.user.getAll.useQuery();
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = api.member.getAll.useQuery();
  const { data: gatherings } = api.gathering.getAll.useQuery();

  const updateStatusMutation = api.user.updateStatus.useMutation({
    onSuccess: () => {
      refetchUsers();
      setUpdatingUserId(null);
    },
    onError: () => {
      setUpdatingUserId(null);
    },
  });

  const createMemberMutation = api.member.create.useMutation({
    onSuccess: () => {
      refetchMembers();
      setIsCreatingMember(false);
      setMemberForm({ name: "", userId: "" });
    },
  });

  const updateMemberMutation = api.member.update.useMutation({
    onSuccess: () => {
      refetchMembers();
      setEditingMemberId(null);
      setMemberForm({ name: "", userId: "" });
    },
  });

  const deleteMemberMutation = api.member.delete.useMutation({
    onSuccess: () => {
      refetchMembers();
      setDeleteConfirmId(null);
    },
  });

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

  const handleCreateMember = () => {
    setIsCreatingMember(true);
    setMemberForm({ name: "", userId: "" });
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      userId: member.userId || "",
    });
  };

  const handleSaveMember = () => {
    if (isCreatingMember) {
      createMemberMutation.mutate({
        name: memberForm.name,
        userId: memberForm.userId || undefined,
      });
    } else if (editingMemberId) {
      updateMemberMutation.mutate({
        id: editingMemberId,
        name: memberForm.name,
        userId: memberForm.userId || null,
      });
    }
  };

  const handleCancelMember = () => {
    setIsCreatingMember(false);
    setEditingMemberId(null);
    setMemberForm({ name: "", userId: "" });
  };

  const handleDeleteMember = (id: string) => {
    deleteMemberMutation.mutate({ id });
  };

  if (isLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Calculate last hosts and next hosting
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate < today;
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }) || [];

  const futureGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate >= today;
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }) || [];

  // Get last hosts (most recent past gatherings)
  const lastHosts = pastGatherings.slice(0, 5).map((g) => ({
    member: g.host,
    gathering: g,
  }));

  // Get next hosting (upcoming future gatherings)
  const nextHosting = futureGatherings.slice(0, 5).map((g) => ({
    member: g.host,
    gathering: g,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-amber-50 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Members Management
          </h2>
          <p className="text-slate-400 mt-1">
            Manage members and link them to signed-in users. Members can host gatherings.
          </p>
        </div>
        <Button
          onClick={handleCreateMember}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add Member
        </Button>
      </div>

      {/* Last Hosts and Next Hosting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Last Hosts */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">Last Hosts</h3>
          {lastHosts.length === 0 ? (
            <p className="text-slate-400 text-sm">No past gatherings found.</p>
          ) : (
            <div className="space-y-3">
              {lastHosts.map((item, index) => (
                <div key={item.gathering.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <div className="text-slate-200 font-medium">{item.member?.name || "Unknown"}</div>
                    <div className="text-sm text-slate-400">
                      Gathering #{item.gathering.number} • {item.gathering.date ? new Date(item.gathering.date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">#{index + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Hosting */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">Next Hosting</h3>
          {nextHosting.length === 0 ? (
            <p className="text-slate-400 text-sm">No upcoming gatherings scheduled.</p>
          ) : (
            <div className="space-y-3">
              {nextHosting.map((item, index) => (
                <div key={item.gathering.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <div className="text-slate-200 font-medium">{item.member?.name || "Unknown"}</div>
                    <div className="text-sm text-slate-400">
                      Gathering #{item.gathering.number} • {item.gathering.date ? new Date(item.gathering.date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">#{index + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Member Form */}
      {isCreatingMember && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">Create New Member</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Link to User (Optional)</label>
                <select
                  value={memberForm.userId}
                  onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  <option value="">No user linked</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelMember}
                className="text-slate-400 border-slate-700"
              >
                <X size={16} className="mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMember}
                disabled={createMemberMutation.isPending || !memberForm.name}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {createMemberMutation.isPending ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : (
                  <Save size={16} className="mr-1" />
                )}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Members</h3>
        {!members || members.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center mb-6">
            <p className="text-slate-400">No members found.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">Linked User</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-amber-400">Times Hosted</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-amber-400">Last Hosted</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-amber-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/50 transition-colors">
                      {editingMemberId === member.id ? (
                        <td colSpan={5} className="px-6 py-4">
                          <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-slate-300 mb-1">Name</label>
                                <input
                                  type="text"
                                  value={memberForm.name}
                                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-slate-300 mb-1">Link to User</label>
                                <select
                                  value={memberForm.userId}
                                  onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                                >
                                  <option value="">No user linked</option>
                                  {users?.map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.name || user.email}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelMember}
                                className="text-slate-400 border-slate-700"
                              >
                                <X size={16} className="mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveMember}
                                disabled={updateMemberMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                {updateMemberMutation.isPending ? (
                                  <Loader2 size={16} className="mr-1 animate-spin" />
                                ) : (
                                  <Save size={16} className="mr-1" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-slate-200 font-medium">{member.name}</td>
                          <td className="px-6 py-4 text-slate-200">
                            {member.user ? (
                              <div className="flex items-center gap-2">
                                {member.user.image && (
                                  <img
                                    src={member.user.image}
                                    alt={member.user.name || member.user.email}
                                    className="w-6 h-6 rounded-full"
                                  />
                                )}
                                <span>{member.user.name || member.user.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Not linked</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-200">{member.timesHosted}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">
                            {member.lastHosted
                              ? new Date(member.lastHosted).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMember(member)}
                                className="text-slate-400 hover:text-amber-400"
                              >
                                <Edit2 size={16} />
                              </Button>
                              {deleteConfirmId === member.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteMember(member.id)}
                                    disabled={deleteMemberMutation.isPending}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    {deleteMemberMutation.isPending ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      "Confirm"
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-slate-400"
                                  >
                                    <X size={16} />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(member.id)}
                                  className="text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Users</h3>
        {!users || users.length === 0 ? (
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
                    </td>
                    <td className="px-6 py-4 text-center">
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
  );
}

