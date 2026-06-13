"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc-client";
import { type Distillery } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X, Merge, ArrowRight, AlertTriangle, Loader2, MapPin } from "lucide-react";

interface MergeDistilleriesDialogProps {
  distilleries: Distillery[];
  /** Whisky counts keyed by distillery name. */
  whiskyCounts: Map<string, number>;
  onClose: () => void;
  onMerged: () => void;
}

export function MergeDistilleriesDialog({
  distilleries,
  whiskyCounts,
  onClose,
  onMerged,
}: MergeDistilleriesDialogProps) {
  const [keepId, setKeepId] = useState<string>("");
  const [mergeId, setMergeId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...distilleries].sort((a, b) => a.name.localeCompare(b.name)),
    [distilleries]
  );

  const byId = useMemo(() => {
    const map = new Map<string, Distillery>();
    sorted.forEach((d) => map.set(d.id, d));
    return map;
  }, [sorted]);

  const keep = keepId ? byId.get(keepId) : undefined;
  const merge = mergeId ? byId.get(mergeId) : undefined;

  const mergeMutation = api.distillery.merge.useMutation({
    onSuccess: () => {
      onMerged();
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const sameSelected = !!keepId && keepId === mergeId;
  const canMerge = !!keepId && !!mergeId && !sameSelected && !mergeMutation.isPending;

  const countFor = (name?: string) => (name ? whiskyCounts.get(name) || 0 : 0);

  const handleMerge = () => {
    if (!canMerge) return;
    setError(null);
    mergeMutation.mutate({ keepId, mergeId });
  };

  const renderOptions = (excludeId?: string) =>
    sorted
      .filter((d) => d.id !== excludeId)
      .map((d) => (
        <option key={d.id} value={d.id}>
          {d.name} ({countFor(d.name)} {countFor(d.name) === 1 ? "whisky" : "whiskies"})
        </option>
      ));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <h3 className="text-lg font-bold text-amber-50 flex items-center gap-2">
            <Merge className="w-5 h-5 text-amber-400" />
            Merge Distilleries
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-slate-400">
            Move all whiskies from one distillery into another. The distillery
            you <span className="text-amber-400 font-semibold">keep</span> retains its
            details; the other is deleted once its whiskies are moved over.
          </p>

          {/* Keep */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">
              Keep this distillery
            </label>
            <select
              value={keepId}
              onChange={(e) => {
                setKeepId(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select distillery to keep…</option>
              {renderOptions(mergeId)}
            </select>
          </div>

          {/* Merge */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Merge &amp; remove this distillery
            </label>
            <select
              value={mergeId}
              onChange={(e) => {
                setMergeId(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select distillery to remove…</option>
              {renderOptions(keepId)}
            </select>
          </div>

          {/* Preview */}
          {keep && merge && !sameSelected && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-red-400 uppercase tracking-wider mb-1">
                    Remove
                  </div>
                  <div className="text-sm font-semibold text-slate-200 truncate">
                    {merge.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin size={12} />
                    <span className="truncate">
                      {merge.region}, {merge.country}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {countFor(merge.name)}{" "}
                    {countFor(merge.name) === 1 ? "whisky" : "whiskies"} to move
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-amber-400 flex-shrink-0" />

                <div className="flex-1 min-w-0 text-right">
                  <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">
                    Keep
                  </div>
                  <div className="text-sm font-semibold text-amber-50 truncate">
                    {keep.name}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-slate-500 mt-1">
                    <MapPin size={12} />
                    <span className="truncate">
                      {keep.region}, {keep.country}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {countFor(keep.name) + countFor(merge.name)} whiskies after merge
                  </div>
                </div>
              </div>
            </div>
          )}

          {sameSelected && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle size={16} />
              Pick two different distilleries.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-3">
              <AlertTriangle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-800 bg-slate-900/80">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mergeMutation.isPending}
            className="text-slate-400 border-slate-700 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!canMerge}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold disabled:opacity-50"
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging…
              </>
            ) : (
              <>
                <Merge className="w-4 h-4 mr-2" />
                Merge Distilleries
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
