"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Edit2, Trash2, X, Save } from "lucide-react";
import { TastingForm } from "./tasting-form";
import { type WhiskyWithGathering } from "@/lib/types";

export function MyTastings() {
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);
  const [editingTastingId, setEditingTastingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [selectedGatheringId, setSelectedGatheringId] = useState<string | "">("");

  const { data: tastings, isLoading, refetch } = api.tasting.getUserTastings.useQuery({
    limit: 1000,
    gatheringId: selectedGatheringId || undefined,
  });

  const { data: whiskies } = api.whisky.getAll.useQuery({ limit: 1000 });

  // Get unique gatherings from tastings for filter dropdown
  const uniqueGatherings = useMemo(() => {
    if (!tastings) return [];
    const gatheringMap = new Map();
    tastings.forEach((item) => {
      if (item.gathering && !gatheringMap.has(item.gathering.id)) {
        gatheringMap.set(item.gathering.id, item.gathering);
      }
    });
    return Array.from(gatheringMap.values()).sort((a, b) => {
      // Sort by date closest to today
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const now = Date.now();
      return Math.abs(dateA - now) - Math.abs(dateB - now);
    });
  }, [tastings]);

  const updateMutation = api.tasting.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTastingId(null);
    },
  });

  const deleteMutation = api.tasting.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleEdit = (tasting: any) => {
    setEditingTastingId(tasting.tasting.id);
    setEditRating(tasting.tasting.rating);
    setEditNotes(tasting.tasting.notes || "");
  };

  const handleSave = () => {
    if (!editingTastingId) return;
    updateMutation.mutate({
      id: editingTastingId,
      rating: editRating,
      notes: editNotes || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this tasting?")) {
      deleteMutation.mutate({ id });
    }
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
      <div>
        <h2 className="text-2xl font-bold text-amber-50 mb-1">My Tastings</h2>
        <p className="text-slate-400">
          Add your scores and notes for whiskies you've tasted.
        </p>
      </div>

      {/* Add New Tasting */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Add New Tasting</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Whisky
          </label>
          <select
            value={selectedWhisky?.id || ""}
            onChange={(e) => {
              const whisky = whiskies?.find((w) => w.id === e.target.value);
              setSelectedWhisky(whisky || null);
            }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select a whisky...</option>
            {whiskies?.map((whisky) => (
              <option key={whisky.id} value={whisky.id}>
                {whisky.distillery} - {whisky.variety} (Gathering #{whisky.gathering})
              </option>
            ))}
          </select>
        </div>
        {selectedWhisky && (
          <TastingForm whisky={selectedWhisky} onSuccess={() => {
            setSelectedWhisky(null);
            refetch();
          }} />
        )}
      </div>

      {/* My Tastings List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-400">My Tasting History</h3>
          {uniqueGatherings.length > 0 && (
            <select
              value={selectedGatheringId}
              onChange={(e) => setSelectedGatheringId(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Gatherings</option>
              {uniqueGatherings.map((gathering) => (
                <option key={gathering.id} value={gathering.id}>
                  Gathering #{gathering.number} - {new Date(gathering.date).toLocaleDateString()}
                  {gathering.theme && ` - ${gathering.theme}`}
                </option>
              ))}
            </select>
          )}
        </div>
        {!tastings || tastings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">
              {selectedGatheringId
                ? "No tastings found for the selected gathering."
                : "You haven't added any tastings yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tastings.map((item) => (
              <div
                key={item.tasting.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4"
              >
                {editingTastingId === item.tasting.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Rating
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setEditRating(value)}
                            className={`p-2 rounded transition-colors ${
                              editRating >= value
                                ? "text-amber-400"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <Star
                              size={20}
                              className={editRating >= value ? "fill-current" : ""}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTastingId(null)}
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
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-200">
                          {item.whisky.distillery} - {item.whisky.name || item.whisky.variety}
                        </h4>
                        {item.gathering && (
                          <span className="text-xs px-2 py-1 bg-amber-900/30 text-amber-300 rounded border border-amber-800/50">
                            Gathering #{item.gathering.number}
                          </span>
                        )}
                      </div>
                      {item.gathering && (
                        <p className="text-xs text-slate-500">
                          {new Date(item.gathering.date).toLocaleDateString()}
                          {item.gathering.theme && ` • ${item.gathering.theme}`}
                        </p>
                      )}
                      <p className="text-sm text-slate-400 mt-1">
                        Tasted on {new Date(item.tasting.tastingDate).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            size={16}
                            className={
                              item.tasting.rating >= value
                                ? "text-amber-400 fill-current"
                                : "text-slate-500"
                            }
                          />
                        ))}
                        <span className="ml-2 text-sm text-slate-400">
                          {item.tasting.rating}/5
                        </span>
                      </div>
                      {item.tasting.notes && (
                        <p className="text-sm text-slate-300 mt-2">{item.tasting.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="text-slate-400 hover:text-amber-400"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.tasting.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

