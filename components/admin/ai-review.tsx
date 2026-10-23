import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import type { AcceptedSuggestion, Confidence, ReviewScope, Suggestion } from "@/worker/data-review";
import { ArrowLeftRight, Check, ExternalLink, Loader2, Sparkles, Square, X } from "lucide-react";

const SCOPES: { scope: ReviewScope; label: string; description: string }[] = [
  { scope: "distilleries", label: "Distilleries", description: "Country, region, founding year, website and description of every distillery the club has tasted." },
  { scope: "whiskies", label: "Drams", description: "ABV against the standard strength of well-known bottlings, and misspelt expression names." },
  { scope: "duplicates", label: "Duplicates", description: "Distilleries entered twice under different spellings, to merge into one." },
];

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-emerald-950 text-emerald-300 border-emerald-800",
  medium: "bg-amber-950 text-amber-300 border-amber-800",
  low: "bg-slate-800 text-slate-400 border-slate-700",
};

type Item = { suggestion: Suggestion; value: string; selected: boolean; error?: string };

// The AI reviews the site's data and suggests fixes; nothing changes until an admin applies them.
export function AIReview() {
  const utils = api.useUtils();
  const [scope, setScope] = useState<ReviewScope>("distilleries");
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [hideLow, setHideLow] = useState(false);
  const stopRef = useRef(false);

  const review = api.drams.review.useMutation();
  const applyMutation = api.drams.applySuggestions.useMutation();

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    setItems([]);
    setProgress(null);
    try {
      let offset: number | null = 0;
      while (offset !== null && !stopRef.current) {
        const page = await review.mutateAsync({ scope, offset });
        setItems((prev) => [
          ...prev,
          ...page.suggestions.map((s) => ({
            suggestion: s,
            value: s.kind === "update" ? s.suggested : "",
            selected: false, // the model can be confidently wrong: every change is opted into
          })),
        ]);
        offset = page.nextOffset;
        setProgress({ done: offset ?? page.total, total: page.total });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The review failed");
    } finally {
      setRunning(false);
    }
  };

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.suggestion.key === key ? { ...i, ...patch } : i)));

  const swapMerge = (key: string) =>
    setItems((prev) =>
      prev.map((i) => {
        const s = i.suggestion;
        if (s.key !== key || s.kind !== "merge") return i;
        return { ...i, suggestion: { ...s, keepId: s.removeId, keepName: s.removeName, removeId: s.keepId, removeName: s.keepName } };
      }),
    );

  const applySelected = async () => {
    const chosen = items.filter((i) => i.selected);
    const payload: AcceptedSuggestion[] = chosen.map(({ suggestion: s, value }) =>
      s.kind === "merge"
        ? { kind: "merge", keepId: s.keepId, removeId: s.removeId }
        : s.entity === "distillery"
          ? { kind: "update", entity: "distillery", targetId: s.targetId, field: s.field, value }
          : { kind: "update", entity: "whisky", targetId: s.targetId, field: s.field, value },
    );
    try {
      const results = await applyMutation.mutateAsync({ items: payload });
      const failed = new Map<string, string>();
      results.forEach((r, i) => { if (!r.ok) failed.set(chosen[i].suggestion.key, r.error ?? "Failed"); });
      const appliedKeys = new Set(chosen.map((c) => c.suggestion.key).filter((k) => !failed.has(k)));
      setItems((prev) =>
        prev
          .filter((i) => !appliedKeys.has(i.suggestion.key))
          .map((i) => (failed.has(i.suggestion.key) ? { ...i, error: failed.get(i.suggestion.key) } : i)),
      );
      if (appliedKeys.size) toast.success(`Applied ${appliedKeys.size} suggestion${appliedKeys.size === 1 ? "" : "s"}`);
      if (failed.size) toast.error(`${failed.size} could not be applied`);
      await utils.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't apply the suggestions");
    }
  };

  const shown = items.filter((i) => !hideLow || i.suggestion.confidence !== "low");
  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-amber-50 mb-1 flex items-center gap-2"><Sparkles className="text-violet-400" size={22} /> AI Data Review</h2>
        <p className="text-slate-400 text-sm">
          The AI sommelier checks the site&apos;s data against what it knows and suggests corrections. Review each one: nothing changes until you apply it.
          It doesn&apos;t suggest map coordinates, as recalled coordinates are often wrong.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SCOPES.map((s) => (
          <button
            key={s.scope}
            onClick={() => !running && setScope(s.scope)}
            disabled={running}
            className={`p-4 rounded-lg border text-left transition-colors ${
              scope === s.scope ? "bg-amber-900/30 border-amber-600" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="font-medium text-slate-100 mb-1">{s.label}</div>
            <div className="text-xs text-slate-400">{s.description}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Button onClick={() => { stopRef.current = true; }} className="bg-slate-700 hover:bg-slate-600 text-white">
            <Square size={14} className="mr-2" /> Stop
          </Button>
        ) : (
          <Button onClick={run} className="bg-violet-700 hover:bg-violet-600 text-white">
            <Sparkles size={16} className="mr-2" /> Review {SCOPES.find((s) => s.scope === scope)!.label.toLowerCase()}
          </Button>
        )}
        {progress && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {running && <Loader2 size={14} className="animate-spin text-violet-400" />}
            Reviewed {Math.min(progress.done, progress.total)} of {progress.total}
            <div className="w-32 h-1.5 bg-slate-800 rounded overflow-hidden">
              <div className="h-full bg-violet-500" style={{ width: `${progress.total ? (Math.min(progress.done, progress.total) / progress.total) * 100 : 100}%` }} />
            </div>
          </div>
        )}
        {items.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-400 ml-auto">
            <input type="checkbox" checked={hideLow} onChange={(e) => setHideLow(e.target.checked)} className="accent-amber-600" />
            Hide low confidence
          </label>
        )}
      </div>

      {!running && progress && items.length === 0 && (
        <p className="text-sm text-slate-400">No suggestions: the AI found nothing to change.</p>
      )}

      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((item) => {
            const s = item.suggestion;
            return (
              <div key={s.key} className={`bg-slate-900 border rounded-lg p-3 ${item.selected ? "border-amber-700/70" : "border-slate-800"}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => update(s.key, { selected: e.target.checked })}
                    className="mt-1 accent-amber-600"
                    aria-label="Select suggestion"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.kind === "merge" ? (
                        <span className="text-slate-100 font-medium">
                          Merge &ldquo;{s.removeName}&rdquo; into &ldquo;{s.keepName}&rdquo;
                          <span className="text-slate-500 font-normal"> · moves {s.whiskyCount} dram{s.whiskyCount === 1 ? "" : "s"}</span>
                        </span>
                      ) : (
                        <span className="text-slate-100 font-medium">
                          {s.label} <span className="text-slate-500 font-normal">· {s.field}</span>
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${CONFIDENCE_STYLE[s.confidence]}`}>{s.confidence}</span>
                    </div>
                    {s.kind === "update" && (
                      <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                        <span className="text-slate-500 line-through break-words md:max-w-[40%]">{s.current || "empty"}</span>
                        <span className="text-slate-500 hidden md:inline">→</span>
                        {s.field === "description" ? (
                          <textarea
                            value={item.value}
                            onChange={(e) => update(s.key, { value: e.target.value })}
                            rows={2}
                            className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200"
                          />
                        ) : (
                          <input
                            value={item.value}
                            onChange={(e) => update(s.key, { value: e.target.value })}
                            className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200"
                          />
                        )}
                        {s.field === "website" && (
                          <a href={item.value} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1 text-xs">
                            Check <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                    {s.reason && <p className="text-xs text-slate-400">{s.reason}</p>}
                    {item.error && <p className="text-xs text-red-400">{item.error}</p>}
                  </div>
                  <div className="flex gap-1">
                    {s.kind === "merge" && (
                      <button onClick={() => swapMerge(s.key)} title="Keep the other one" className="p-1.5 text-slate-400 hover:text-slate-200">
                        <ArrowLeftRight size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setItems((prev) => prev.filter((i) => i.suggestion.key !== s.key))}
                      title="Dismiss"
                      className="p-1.5 text-slate-400 hover:text-red-400"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="sticky bottom-0 bg-slate-950/95 border-t border-slate-800 py-3 flex items-center justify-end gap-3">
          <span className="text-sm text-slate-400">{selectedCount} selected</span>
          <Button onClick={applySelected} disabled={selectedCount === 0 || applyMutation.isPending || running} className="bg-amber-700 hover:bg-amber-600 text-white">
            {applyMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Check size={16} className="mr-2" />}
            Apply selected
          </Button>
        </div>
      )}
    </div>
  );
}
