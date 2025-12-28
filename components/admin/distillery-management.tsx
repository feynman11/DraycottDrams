"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, Edit2, Trash2, Save, X, Plus, Building2 } from "lucide-react";
import { type Distillery } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";

export function DistilleryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Distillery>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: distilleries, isLoading, refetch } = api.distillery.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    limit: 1000,
  });

  const createMutation = api.distillery.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setEditForm({});
    },
  });

  const updateMutation = api.distillery.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = api.distillery.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirmId(null);
    },
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      name: "",
      country: "",
      region: "",
      coordinates: undefined,
      description: "",
      website: "",
      founded: undefined,
    });
  };

  const handleEdit = (distillery: Distillery) => {
    setEditingId(distillery.id);
    setEditForm({
      name: distillery.name || "",
      country: distillery.country || "",
      region: distillery.region || "",
      coordinates: distillery.coordinates || undefined,
      description: distillery.description || "",
      website: distillery.website || "",
      founded: distillery.founded || undefined,
    });
  };

  const handleSave = () => {
    if (isCreating) {
      createMutation.mutate({
        name: editForm.name || "",
        country: editForm.country || "",
        region: editForm.region || "",
        coordinates: editForm.coordinates ?? undefined,
        description: editForm.description ?? undefined,
        website: editForm.website ?? undefined,
        founded: editForm.founded ?? undefined,
      });
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...editForm,
        coordinates: editForm.coordinates ?? undefined,
        description: editForm.description ?? undefined,
        website: editForm.website ?? undefined,
        founded: editForm.founded ?? undefined,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-amber-50 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Distillery Management
            {distilleries && (
              <span className="text-lg font-normal text-amber-400 ml-2">
                ({distilleries.length})
              </span>
            )}
          </h2>
          <p className="text-slate-400 mt-1">
            Create and manage distillery data. Distilleries are shared across all whiskies from the same distillery.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add Distillery
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search distilleries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">Create New Distillery</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Country *</label>
                <input
                  type="text"
                  value={editForm.country || ""}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Region *</label>
                <input
                  type="text"
                  value={editForm.region || ""}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Founded Year</label>
                <input
                  type="number"
                  value={editForm.founded || ""}
                  onChange={(e) => setEditForm({ ...editForm, founded: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.coordinates?.[0] || ""}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    coordinates: e.target.value ? [parseFloat(e.target.value), editForm.coordinates?.[1] || 0] : undefined
                  })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.coordinates?.[1] || ""}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    coordinates: e.target.value ? [editForm.coordinates?.[0] || 0, parseFloat(e.target.value)] : undefined
                  })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Website</label>
              <input
                type="url"
                value={editForm.website || ""}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Description</label>
              <textarea
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
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
                disabled={createMutation.isPending || !editForm.name || !editForm.country || !editForm.region}
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

      {!distilleries || distilleries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-400">No distilleries found.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Country</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Region</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-amber-400">Coordinates</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-amber-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {distilleries.map((distillery) => (
                  <tr key={distillery.id} className="hover:bg-slate-800/50 transition-colors">
                    {editingId === distillery.id ? (
                      <td colSpan={5} className="px-4 py-4">
                        <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Name</label>
                              <input
                                type="text"
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Country</label>
                              <input
                                type="text"
                                value={editForm.country || ""}
                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Region</label>
                              <input
                                type="text"
                                value={editForm.region || ""}
                                onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Founded</label>
                              <input
                                type="number"
                                value={editForm.founded || ""}
                                onChange={(e) => setEditForm({ ...editForm, founded: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Longitude</label>
                              <input
                                type="number"
                                step="any"
                                value={editForm.coordinates?.[0] || ""}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  coordinates: e.target.value ? [parseFloat(e.target.value), editForm.coordinates?.[1] || 0] : undefined
                                })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Latitude</label>
                              <input
                                type="number"
                                step="any"
                                value={editForm.coordinates?.[1] || ""}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  coordinates: e.target.value ? [editForm.coordinates?.[0] || 0, parseFloat(e.target.value)] : undefined
                                })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Website</label>
                            <input
                              type="url"
                              value={editForm.website || ""}
                              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Description</label>
                            <textarea
                              value={editForm.description || ""}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
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
                        <td className="px-4 py-3 text-slate-200 font-medium">{distillery.name}</td>
                        <td className="px-4 py-3 text-slate-200">{distillery.country}</td>
                        <td className="px-4 py-3 text-slate-200">{distillery.region}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {distillery.coordinates
                            ? `${distillery.coordinates[0].toFixed(4)}, ${distillery.coordinates[1].toFixed(4)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(distillery)}
                              className="text-slate-400 hover:text-amber-400"
                            >
                              <Edit2 size={16} />
                            </Button>
                            {deleteConfirmId === distillery.id ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(distillery.id)}
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
                                onClick={() => setDeleteConfirmId(distillery.id)}
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

