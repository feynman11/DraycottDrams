"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, Edit2, Trash2, Save, X, BookOpen, Plus } from "lucide-react";
import { type WhiskyWithGathering } from "@/lib/types";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";

export function LibraryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WhiskyWithGathering & { distilleryId: string; gatheringId: string }>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: whiskies, isLoading, refetch } = api.whisky.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    limit: 1000,
  });

  const { data: distilleries } = api.distillery.getAll.useQuery({ limit: 1000 });
  const { data: gatherings } = api.gathering.getAll.useQuery();

  const createMutation = api.whisky.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setEditForm({});
    },
  });

  const updateMutation = api.whisky.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = api.whisky.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirmId(null);
    },
  });

  const handleEdit = (whisky: any) => {
    setEditingId(whisky.id);
    setEditForm({
      distilleryId: whisky.distilleryId || "",
      gatheringId: whisky.gatheringId || "",
      provider: whisky.provider || "",
      variety: whisky.variety || "",
      abv: whisky.abv?.toString() || "",
      notes: whisky.notes || "",
      name: whisky.name || "",
      type: whisky.type || "",
      age: whisky.age || undefined,
      priceRange: whisky.priceRange || "",
      description: whisky.description || "",
      flavourProfile: whisky.flavourProfile || undefined,
      imageUrl: whisky.imageUrl || "",
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      distilleryId: "",
      gatheringId: "",
      provider: "",
      variety: "",
      abv: "",
      notes: "",
    });
  };

  const handleSave = () => {
    if (isCreating) {
      if (!editForm.distilleryId || !editForm.gatheringId || !editForm.provider || !editForm.variety || !editForm.abv) {
        return;
      }
      createMutation.mutate({
        distilleryId: editForm.distilleryId,
        gatheringId: editForm.gatheringId,
        provider: editForm.provider,
        variety: editForm.variety,
        abv: editForm.abv,
        notes: editForm.notes || undefined,
        name: editForm.name || undefined,
        type: editForm.type || undefined,
        age: editForm.age || undefined,
        priceRange: editForm.priceRange || undefined,
        description: editForm.description || undefined,
        flavourProfile: editForm.flavourProfile || undefined,
        imageUrl: editForm.imageUrl || undefined,
      });
    } else if (editingId) {
      const updateData: any = {
        id: editingId,
        distilleryId: editForm.distilleryId,
        gatheringId: editForm.gatheringId,
        provider: editForm.provider,
        variety: editForm.variety,
        abv: editForm.abv,
        notes: editForm.notes || undefined,
        name: editForm.name || undefined,
        type: editForm.type || undefined,
        age: editForm.age || undefined,
        priceRange: editForm.priceRange || undefined,
        description: editForm.description || undefined,
        flavourProfile: editForm.flavourProfile || undefined,
        imageUrl: editForm.imageUrl || undefined,
      };
      // Convert null to undefined for optional fields
      if (updateData.notes === null) updateData.notes = undefined;
      updateMutation.mutate(updateData);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-amber-50 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Library Management
            {whiskies && (
              <span className="text-lg font-normal text-amber-400 ml-2">
                ({whiskies.length})
              </span>
            )}
          </h2>
          <p className="text-slate-400 mt-1">
            Edit and manage whisky data in the library. Only admins can modify whisky information.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreate}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Whisky
          </Button>
          <Link href="/import">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              Import CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">Create New Whisky</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Distillery *</label>
                <select
                  value={editForm.distilleryId || ""}
                  onChange={(e) => setEditForm({ ...editForm, distilleryId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  <option value="">Select a distillery...</option>
                  {distilleries?.map((distillery) => (
                    <option key={distillery.id} value={distillery.id}>
                      {distillery.name} ({distillery.region}, {distillery.country})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Gathering *</label>
                <select
                  value={editForm.gatheringId || ""}
                  onChange={(e) => setEditForm({ ...editForm, gatheringId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  <option value="">Select a gathering...</option>
                  {gatherings?.map((gathering) => (
                    <option key={gathering.id} value={gathering.id}>
                      #{gathering.number} - {gathering.host?.name || "Unknown"} ({gathering.date ? new Date(gathering.date).toLocaleDateString() : ""})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Provider *</label>
                <input
                  type="text"
                  value={editForm.provider || ""}
                  onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Variety *</label>
                <input
                  type="text"
                  value={editForm.variety || ""}
                  onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">ABV *</label>
                <input
                  type="text"
                  value={editForm.abv || ""}
                  onChange={(e) => setEditForm({ ...editForm, abv: e.target.value })}
                  placeholder="e.g., 46.0"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Notes</label>
                <textarea
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
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
                disabled={createMutation.isPending || !editForm.distilleryId || !editForm.gatheringId || !editForm.provider || !editForm.variety || !editForm.abv}
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, country, or region..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {!whiskies || whiskies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-400">No whiskies found.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Distillery</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Variety</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Region</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Gathering</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-amber-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {whiskies.map((whisky) => (
                  <tr key={whisky.id} className="hover:bg-slate-800/50 transition-colors">
                    {editingId === whisky.id ? (
                      <td colSpan={5} className="px-4 py-4">
                        <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Distillery</label>
                              <select
                                value={editForm.distilleryId || ""}
                                onChange={(e) => setEditForm({ ...editForm, distilleryId: e.target.value })}
                                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              >
                                <option value="">Select a distillery...</option>
                                {distilleries?.map((distillery) => (
                                  <option key={distillery.id} value={distillery.id}>
                                    {distillery.name} ({distillery.region}, {distillery.country})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Gathering</label>
                              <select
                                value={editForm.gatheringId || ""}
                                onChange={(e) => setEditForm({ ...editForm, gatheringId: e.target.value })}
                                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              >
                                <option value="">Select a gathering...</option>
                                {gatherings?.map((gathering) => (
                                  <option key={gathering.id} value={gathering.id}>
                                    #{gathering.number} - {gathering.host?.name || "Unknown"} ({gathering.date ? new Date(gathering.date).toLocaleDateString() : ""})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Provider</label>
                              <input
                                type="text"
                                value={editForm.provider || ""}
                                onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Variety</label>
                              <input
                                type="text"
                                value={editForm.variety || ""}
                                onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })}
                                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">ABV</label>
                              <input
                                type="text"
                                value={editForm.abv || ""}
                                onChange={(e) => setEditForm({ ...editForm, abv: e.target.value })}
                                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Notes</label>
                            <textarea
                              value={editForm.notes || ""}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                            />
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
                        <td className="px-4 py-3 text-slate-200">{whisky.distillery}</td>
                        <td className="px-4 py-3 text-slate-200">{whisky.variety}</td>
                        <td className="px-4 py-3 text-slate-200">{whisky.region}</td>
                        <td className="px-4 py-3 text-slate-200">#{whisky.gathering}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(whisky)}
                              className="text-slate-400 hover:text-amber-400"
                            >
                              <Edit2 size={16} />
                            </Button>
                            {deleteConfirmId === whisky.id ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(whisky.id)}
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
                                onClick={() => setDeleteConfirmId(whisky.id)}
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
  );
}

