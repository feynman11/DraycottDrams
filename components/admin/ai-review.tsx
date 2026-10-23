import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import type { AcceptedSuggestion, Confidence, ReviewScope, Suggestion } from "@/worker/data-review";
import { ArrowLeftRight, Check, ExternalLink, Loader2, Sparkles, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SCOPES: { scope: ReviewScope; label: string; description: string }[] = [
  { scope: "distilleries", label: "Distilleries", description: "Country, region, founding year, website and description of every distillery the club has tasted." },
  { scope: "whiskies", label: "Drams", description: "ABV against the standard strength of well-known bottlings, and misspelt expression names." },
  { scope: "duplicates", label: "Duplicates", description: "Distilleries entered twice under different spellings, to merge into one." },
];

const CONFIDENCE_VARIANT: Record<Confidence, "success" | "warning" | "secondary"> = {
  high: "success",
  medium: "warning",
  low: "secondary",
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
  const pct = progress ? (progress.total ? (Math.min(progress.done, progress.total) / progress.total) * 100 : 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        as="h2"
        title="AI data review"
        description="The AI sommelier checks the site's data against what it knows and suggests corrections. Review each one: nothing changes until you apply it. It doesn't suggest map coordinates, as recalled coordinates are often wrong."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="radiogroup" aria-label="What to review">
        {SCOPES.map((s) => {
          const selected = scope === s.scope;
          return (
            <button
              key={s.scope}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => !running && setScope(s.scope)}
              disabled={running}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                selected ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:border-border-strong"
              )}
            >
              <div className="mb-1 font-medium text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Button variant="secondary" onClick={() => { stopRef.current = true; }}>
            <Square size={14} /> Stop
          </Button>
        ) : (
          <Button onClick={run}>
            <Sparkles size={16} /> Review {SCOPES.find((s) => s.scope === scope)!.label.toLowerCase()}
          </Button>
        )}
        {progress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            {running && <Loader2 size={14} className="animate-spin text-primary" />}
            Reviewed {Math.min(progress.done, progress.total)} of {progress.total}
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary transition-[width] duration-(--duration-base)" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {items.length > 0 && (
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={hideLow} onChange={(e) => setHideLow(e.target.checked)} className="touch-exempt accent-primary" />
            Hide low confidence
          </label>
        )}
      </div>

      {!running && progress && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No suggestions: the AI found nothing to change.</p>
      )}

      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((item) => {
            const s = item.suggestion;
            return (
              <div key={s.key} className={cn("rounded-xl border bg-card p-3 transition-colors", item.selected ? "border-primary/50" : "border-border")}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => update(s.key, { selected: e.target.checked })}
                    className="touch-exempt mt-1 accent-primary"
                    aria-label="Select suggestion"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.kind === "merge" ? (
                        <span className="font-medium text-foreground">
                          Merge &ldquo;{s.removeName}&rdquo; into &ldquo;{s.keepName}&rdquo;
                          <span className="font-normal text-subtle"> · moves {s.whiskyCount} dram{s.whiskyCount === 1 ? "" : "s"}</span>
                        </span>
                      ) : (
                        <span className="font-medium text-foreground">
                          {s.label} <span className="font-normal text-subtle">· {s.field}</span>
                        </span>
                      )}
                      <Badge variant={CONFIDENCE_VARIANT[s.confidence]}>{s.confidence}</Badge>
                    </div>
                    {s.kind === "update" && (
                      <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center">
                        <span className="break-words text-subtle line-through md:max-w-[40%]">{s.current || "empty"}</span>
                        <span className="hidden text-subtle md:inline">→</span>
                        {s.field === "description" ? (
                          <Textarea
                            value={item.value}
                            onChange={(e) => update(s.key, { value: e.target.value })}
                            rows={2}
                            aria-label="Suggested value"
                            className="flex-1"
                          />
                        ) : (
                          <Input
                            value={item.value}
                            onChange={(e) => update(s.key, { value: e.target.value })}
                            aria-label="Suggested value"
                            className="h-9 flex-1"
                          />
                        )}
                        {s.field === "website" && (
                          <a href={item.value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded text-xs text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            Check <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                    {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {s.kind === "merge" && (
                      <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => swapMerge(s.key)} aria-label="Keep the other one">
                        <ArrowLeftRight size={16} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => setItems((prev) => prev.filter((i) => i.suggestion.key !== s.key))}
                      aria-label="Dismiss"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="sticky bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] z-10 flex items-center justify-end gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button onClick={applySelected} disabled={selectedCount === 0 || applyMutation.isPending || running}>
            {applyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Apply selected
          </Button>
        </div>
      )}
    </div>
  );
}
