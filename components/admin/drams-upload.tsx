import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { pickDramsSheet, readDramsRecords, type DramsSheetRow } from "@/lib/drams-sheet";
import type { DistilleryChoice, DistilleryMatch, ImportPlan, MatchMethod } from "@/worker/drams-import";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const CREATE = "__create__";

const METHOD_STYLE: Record<MatchMethod, { label: string; variant: "secondary" | "info" | "default" | "success" | "warning" }> = {
  exact: { label: "Exact", variant: "secondary" },
  fuzzy: { label: "Spelling", variant: "info" },
  ai: { label: "AI match", variant: "default" },
  new: { label: "New", variant: "success" },
  manual: { label: "Your choice", variant: "warning" },
};

function choiceFromMatch(match: DistilleryMatch): DistilleryChoice {
  return match.distilleryId ? { distilleryId: match.distilleryId } : { create: { ...match.create } };
}

// Upload the chair's sheet → preview what changes on the site → apply. Admins only.
export function DramsUpload({ onDone }: { onDone?: () => void }) {
  const utils = api.useUtils();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<DramsSheetRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [choices, setChoices] = useState<Record<string, DistilleryChoice>>({});
  const [choicesDirty, setChoicesDirty] = useState(false);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [showAllDistilleries, setShowAllDistilleries] = useState(false);
  const [showNotInSheet, setShowNotInSheet] = useState(false);
  const [dragging, setDragging] = useState(false);

  const preview = api.drams.previewImport.useMutation({
    onSuccess: (result) => {
      setPlan(result);
      setChoices(Object.fromEntries(result.distilleries.map((d) => [d.key, choiceFromMatch(d)])));
      setChoicesDirty(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const apply = api.drams.applyImport.useMutation({
    onSuccess: async (summary) => {
      toast.success(
        `Sheet applied: ${summary.newWhiskies} new drams, ${summary.updatedWhiskies} updated` +
          (summary.newGatherings ? `, ${summary.newGatherings} new gatherings` : "") +
          (summary.newDistilleries ? `, ${summary.newDistilleries} new distilleries` : ""),
      );
      await utils.invalidate();
      reset();
      onDone?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const reset = () => {
    setFileName(null);
    setRows(null);
    setPlan(null);
    setParseErrors([]);
    setExcluded(new Set());
  };

  const readFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer());
      const headersOf = (name: string) =>
        (XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1 })[0] ?? []).map(String);
      const sheetName = pickDramsSheet(workbook.SheetNames, headersOf);
      if (!sheetName) {
        setParseErrors(["Couldn't find the Drams sheet (a sheet with Gathering and Distillery columns)."]);
        return;
      }
      const result = readDramsRecords(XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }));
      setParseErrors(result.errors);
      if (result.rows.length === 0) return;
      setRows(result.rows);
      preview.mutate({ rows: result.rows, useAi: true });
    } catch (error) {
      setParseErrors([`Couldn't read ${file.name}: ${error instanceof Error ? error.message : "unknown error"}`]);
    }
  };

  const setChoice = (key: string, choice: DistilleryChoice) => {
    setChoices((c) => ({ ...c, [key]: choice }));
    setChoicesDirty(true);
  };

  const changedRows = useMemo(() => plan?.whiskies.filter((w) => w.status !== "unchanged") ?? [], [plan]);
  const includedChanges = changedRows.filter((w) => !excluded.has(w.row)).length;
  const gatheringChanges = plan?.gatherings.filter((g) => g.status !== "unchanged") ?? [];
  const reviewDistilleries = plan?.distilleries.filter((d) => showAllDistilleries || d.method !== "exact") ?? [];
  const busy = preview.isPending || apply.isPending;

  const applyRows = () => rows!.filter((r) => !excluded.has(r.row));

  return (
    <div className="space-y-5 rounded-xl border border-primary/30 bg-card p-4 animate-rise-in md:p-6">
      {/* File picker */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) readFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-(--duration-fast) focus-within:ring-2 focus-within:ring-ring",
          dragging ? "border-primary bg-primary/10" : "border-border hover:border-border-strong hover:bg-muted/40"
        )}
      >
        <FileSpreadsheet className="h-8 w-8 text-success" />
        <span className="font-medium text-foreground">{fileName ?? "Drop the Drams spreadsheet here, or click to choose it"}</span>
        <span className="text-xs text-subtle">
          Reads the &quot;Drams&quot; sheet. Nothing changes on the site until you review the preview and apply it.
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = "";
          }}
        />
      </label>

      {parseErrors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {preview.isPending && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-busy>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Comparing {rows?.length} rows with the site and matching distilleries (AI may take a few seconds)…
        </div>
      )}

      {plan && rows && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "New drams", value: plan.summary.newWhiskies, tone: "text-success" },
              { label: "Updated drams", value: plan.summary.updatedWhiskies, tone: "text-primary" },
              { label: "Unchanged", value: plan.summary.unchangedWhiskies, tone: "text-foreground" },
              { label: "New gatherings / distilleries", value: `${plan.summary.newGatherings} / ${plan.summary.newDistilleries}`, tone: "text-info" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={cn("text-2xl font-semibold tabular-nums", s.tone)}>{s.value}</div>
              </div>
            ))}
          </div>

          {plan.warnings.length > 0 && (
            <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
              {plan.warnings.map((w, i) => (
                <p key={i} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />{w}</p>
              ))}
            </div>
          )}

          {/* Distillery matches */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                Distillery matches
                {plan.aiUsed && <Badge variant="default"><Sparkles /> AI-assisted</Badge>}
              </h3>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => setShowAllDistilleries((v) => !v)}>
                {showAllDistilleries ? "Hide exact matches" : `Show all ${plan.distilleries.length}`}
              </Button>
            </div>
            {reviewDistilleries.length === 0 ? (
              <p className="text-sm text-subtle">Every distillery in the sheet matched exactly.</p>
            ) : (
              <div className="space-y-2">
                {reviewDistilleries.map((d) => {
                  const choice = choices[d.key] ?? choiceFromMatch(d);
                  const creating = "create" in choice;
                  return (
                    <div key={d.key} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <div className="shrink-0 lg:w-56">
                          <div className="font-medium text-foreground">&ldquo;{d.sheetName}&rdquo;</div>
                          <div className="text-xs text-subtle">
                            {[d.sheetCountry, d.sheetRegion].filter(Boolean).join(" · ")} · {d.rowCount} row{d.rowCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <Badge variant={METHOD_STYLE[d.method].variant} className="self-start lg:self-center">
                          {METHOD_STYLE[d.method].label}
                          {d.method !== "exact" && d.method !== "manual" && d.confidence > 0 ? ` ${Math.round(d.confidence * 100)}%` : ""}
                        </Badge>
                        <Select
                          aria-label={`Match for ${d.sheetName}`}
                          value={creating ? CREATE : choice.distilleryId}
                          onChange={(e) =>
                            setChoice(d.key, e.target.value === CREATE ? { create: { ...d.create } } : { distilleryId: e.target.value })
                          }
                          className="min-w-0 flex-1"
                        >
                          {d.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({[c.country, c.region].filter(Boolean).join(", ")}) · {Math.round(c.score * 100)}%
                            </option>
                          ))}
                          {d.distilleryId && !d.candidates.some((c) => c.id === d.distilleryId) && (
                            <option value={d.distilleryId}>{d.matchedName}</option>
                          )}
                          <option value={CREATE}>＋ Create a new distillery</option>
                        </Select>
                      </div>
                      {creating && (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(["name", "country", "region"] as const).map((field) => (
                            <Input
                              key={field}
                              value={choice.create[field]}
                              placeholder={field[0].toUpperCase() + field.slice(1)}
                              aria-label={`New distillery ${field}`}
                              onChange={(e) => setChoice(d.key, { create: { ...choice.create, [field]: e.target.value } })}
                            />
                          ))}
                        </div>
                      )}
                      {d.reason && <p className="mt-2 flex gap-1 text-xs text-muted-foreground"><Sparkles size={12} className="mt-0.5 shrink-0 text-primary" />{d.reason}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {choicesDirty && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="secondary" onClick={() => preview.mutate({ rows, useAi: false, choices })} disabled={busy}>
                  <RefreshCw size={14} /> Refresh preview
                </Button>
                <span className="text-xs text-muted-foreground">You changed a match: refresh to see what it changes before applying.</span>
              </div>
            )}
          </section>

          {/* Gathering changes */}
          {gatheringChanges.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold text-foreground">Gatherings</h3>
              <ul className="space-y-1 text-sm">
                {gatheringChanges.map((g) => (
                  <li key={g.number} className="text-muted-foreground">
                    <span className="font-medium text-primary">Gathering {g.number}</span>{" "}
                    {g.status === "new" ? (
                      <span className="text-success">new: {g.date} · {g.theme ?? "no theme"} · hosted by {g.host}</span>
                    ) : (
                      g.changes.map((c) => (
                        <span key={c.field} className="mr-3">
                          {c.field}: <span className="text-subtle line-through">{c.from ?? "—"}</span> → <span className="text-foreground">{c.to}</span>
                        </span>
                      ))
                    )}
                  </li>
                ))}
              </ul>
              {plan.newMembers.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">New members will be added for: {plan.newMembers.join(", ")}</p>
              )}
            </section>
          )}

          {/* Dram changes */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Dram changes</h3>
              {changedRows.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground"
                  onClick={() => setExcluded(excluded.size ? new Set() : new Set(changedRows.map((w) => w.row)))}
                >
                  {excluded.size ? "Select all" : "Select none"}
                </Button>
              )}
            </div>
            {changedRows.length === 0 ? (
              <p className="text-sm text-subtle">The site already matches every dram in this sheet.</p>
            ) : (
              <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {changedRows.map((w) => (
                  <label key={w.row} className="flex cursor-pointer items-start gap-3 px-3 py-2 transition-colors hover:bg-accent/40">
                    <input
                      type="checkbox"
                      checked={!excluded.has(w.row)}
                      onChange={(e) => {
                        const next = new Set(excluded);
                        if (e.target.checked) next.delete(w.row); else next.add(w.row);
                        setExcluded(next);
                      }}
                      className="touch-exempt mt-1 accent-primary"
                    />
                    <div className="min-w-0 text-sm">
                      <div className="text-foreground">
                        <span className="mr-2 font-medium text-primary">G{w.gathering}</span>
                        <span className="font-medium">{w.distillery}</span> {w.variety}
                        <span className="text-subtle"> · {w.provider ?? "no provider"} · row {w.row}</span>
                        <Badge variant={w.status === "new" ? "success" : "warning"} className="ml-2">
                          {w.status === "new" ? "New" : "Update"}
                        </Badge>
                      </div>
                      {w.status === "new" ? (
                        <div className="text-xs text-muted-foreground">
                          {[w.abv && `${w.abv}%`, w.notes].filter(Boolean).join(" · ")}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {w.changes.map((c) => (
                            <span key={c.field}>
                              {c.field}: <span className="text-subtle line-through">{c.from ?? "—"}</span> → <span className="text-foreground">{c.to ?? "—"}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-subtle">Untick a row to keep the site&apos;s current value (e.g. where the sheet has a typo). Empty cells in the sheet never clear site data.</p>
          </section>

          {plan.notInSheet.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowNotInSheet((v) => !v)}
                aria-expanded={showNotInSheet}
                className="flex items-center gap-1 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showNotInSheet ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {plan.notInSheet.length} dram{plan.notInSheet.length === 1 ? " is" : "s are"} on the site but not in this sheet (left as they are)
              </button>
              {showNotInSheet && (
                <ul className="mt-2 space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {plan.notInSheet.map((w, i) => (
                    <li key={i}>G{w.gathering} · {w.distillery} {w.variety} · {w.provider}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            <Button
              onClick={() => apply.mutate({ rows: applyRows(), choices })}
              disabled={busy || choicesDirty || (includedChanges === 0 && gatheringChanges.length === 0)}
            >
              {apply.isPending ? <Loader2 size={16} className="animate-spin" /> : includedChanges ? <Upload size={16} /> : <CheckCircle2 size={16} />}
              Apply {includedChanges} dram change{includedChanges === 1 ? "" : "s"}
              {gatheringChanges.length ? ` and ${gatheringChanges.length} gathering${gatheringChanges.length === 1 ? "" : "s"}` : ""}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
