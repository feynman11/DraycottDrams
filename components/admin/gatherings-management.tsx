"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, Edit2, Trash2, Save, X, Plus, Calendar } from "lucide-react";

export function GatheringsManagement() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<{ number: number; dateString: string; hostId: string; theme: string }>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: gatherings, isLoading, refetch } = api.gathering.getAll.useQuery();
  const { data: members } = api.member.getAll.useQuery();

  const createMutation = api.gathering.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setEditForm({});
    },
  });

  const updateMutation = api.gathering.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = api.gathering.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirmId(null);
    },
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      number: undefined,
      dateString: new Date().toISOString().split('T')[0],
      hostId: "",
      theme: "",
    });
  };

  const handleEdit = (gathering: any) => {
    setEditingId(gathering.id);
    setEditForm({
      number: gathering.number,
      dateString: gathering.date ? new Date(gathering.date).toISOString().split('T')[0] : "",
      hostId: gathering.hostId || "",
      theme: gathering.theme || "",
    });
  };

  const handleSave = () => {
    if (isCreating) {
      if (!editForm.number || !editForm.dateString || !editForm.hostId) return;
      createMutation.mutate({
        number: editForm.number,
        date: new Date(editForm.dateString),
        hostId: editForm.hostId,
        theme: editForm.theme || undefined,
      });
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        number: editForm.number,
        date: editForm.dateString ? new Date(editForm.dateString) : undefined,
        hostId: editForm.hostId,
        theme: editForm.theme || undefined,
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Split gatherings into past and future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pastGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate < today;
  }) || [];

  const futureGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate >= today;
  }) || [];

  const renderGatheringsTable = (gatheringsList: typeof gatherings) => {
    if (!gatheringsList || gatheringsList.length === 0) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-400">No gatherings found.</p>
        </div>
      );
    }

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Host</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Theme</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-amber-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {gatheringsList.map((gathering) => (
                <tr key={gathering.id} className="hover:bg-slate-800/50 transition-colors">
                  {editingId === gathering.id ? (
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Number</label>
                            <input
                              type="number"
                              value={editForm.number || ""}
                              onChange={(e) => setEditForm({ ...editForm, number: parseInt(e.target.value) || undefined })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Date</label>
                            <input
                              type="date"
                              value={editForm.dateString || ""}
                              onChange={(e) => setEditForm({ ...editForm, dateString: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Host</label>
                            <select
                              value={editForm.hostId || ""}
                              onChange={(e) => setEditForm({ ...editForm, hostId: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                            >
                              <option value="">Select a member...</option>
                              {members?.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Theme</label>
                            <input
                              type="text"
                              value={editForm.theme || ""}
                              onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            className="text-slate-400 border-slate-700"
                          >
                            <X size={16} className="mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            {updateMutation.isPending ? (
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
                      <td className="px-4 py-3 text-slate-200 font-medium">#{gathering.number}</td>
                      <td className="px-4 py-3 text-slate-200">
                        {gathering.date ? new Date(gathering.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-200">{gathering.host?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-200">{gathering.theme || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(gathering)}
                            className="text-slate-400 hover:text-amber-400"
                          >
                            <Edit2 size={16} />
                          </Button>
                          {deleteConfirmId === gathering.id ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(gathering.id)}
                                disabled={deleteMutation.isPending}
                                className="text-red-400 hover:text-red-300"
                              >
                                {deleteMutation.isPending ? (
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
                              onClick={() => setDeleteConfirmId(gathering.id)}
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-amber-50 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Gatherings Management
            {gatherings && (
              <span className="text-lg font-normal text-amber-400 ml-2">
                ({gatherings.length})
              </span>
            )}
          </h2>
          <p className="text-slate-400 mt-1">
            Create and manage tasting gatherings. Each gathering can have multiple whiskies.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add Gathering
        </Button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">Create New Gathering</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Number *</label>
                <input
                  type="number"
                  value={editForm.number || ""}
                  onChange={(e) => setEditForm({ ...editForm, number: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={editForm.dateString || ""}
                  onChange={(e) => setEditForm({ ...editForm, dateString: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Host *</label>
                <select
                  value={editForm.hostId || ""}
                  onChange={(e) => setEditForm({ ...editForm, hostId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  <option value="">Select a member...</option>
                  {members?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Theme</label>
                <input
                  type="text"
                  value={editForm.theme || ""}
                  onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-slate-400 border-slate-700"
              >
                <X size={16} className="mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={createMutation.isPending || !editForm.number || !editForm.dateString || !editForm.hostId}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {createMutation.isPending ? (
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

      {/* Future Gatherings */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Upcoming Gatherings</h3>
        {renderGatheringsTable(futureGatherings)}
      </div>

      {/* Past Gatherings */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Past Gatherings</h3>
        {renderGatheringsTable(pastGatherings)}
      </div>
    </div>
  );
}

