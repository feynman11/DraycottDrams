import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { pickDramsSheet, readDramsRecords, type DramsSheetRow } from "@/lib/drams-sheet";
import type { DistilleryChoice, DistilleryMatch, ImportPlan, MatchMethod } from "@/worker/drams-import";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";

const CREATE = "__create__";

const METHOD_STYLE: Record<MatchMethod, { label: string; className: string }> = {
  exact: { label: "Exact", className: "bg-slate-800 text-slate-300 border-slate-700" },
  fuzzy: { label: "Spelling", className: "bg-sky-950 text-sky-300 border-sky-800" },
  ai: { label: "AI match", className: "bg-violet-950 text-violet-300 border-violet-800" },
  new: { label: "New", className: "bg-emerald-950 text-emerald-300 border-emerald-800" },
  manual: { label: "Your choice", className: "bg-amber-950 text-amber-300 border-amber-800" },
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 md:p-6 space-y-5">
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
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
          dragging ? "border-amber-500 bg-amber-950/20" : "border-slate-700 hover:border-slate-500"
        }`}
      >
        <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
        <span className="text-slate-200 font-medium">{fileName ?? "Drop the Drams spreadsheet here, or click to choose it"}</span>
        <span className="text-xs text-slate-500">
          Reads the &quot;Drams&quot; sheet. Nothing changes on the site until you review the preview and apply it.
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = "";
          }}
        />
      </label>

      {parseErrors.length > 0 && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-3 text-sm text-red-300 space-y-1">
          {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {preview.isPending && (
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          Comparing {rows?.length} rows with the site and matching distilleries (AI may take a few seconds)…
        </div>
      )}

      {plan && rows && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "New drams", value: plan.summary.newWhiskies, tone: "text-emerald-400" },
              { label: "Updated drams", value: plan.summary.updatedWhiskies, tone: "text-amber-400" },
              { label: "Unchanged", value: plan.summary.unchangedWhiskies, tone: "text-slate-300" },
              { label: "New gatherings / distilleries", value: `${plan.summary.newGatherings} / ${plan.summary.newDistilleries}`, tone: "text-sky-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="text-xs text-slate-400">{s.label}</div>
                <div className={`text-2xl font-bold ${s.tone}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {plan.warnings.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-900/60 rounded-lg p-3 text-sm text-amber-200 space-y-1">
              {plan.warnings.map((w, i) => (
                <p key={i} className="flex gap-2"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{w}</p>
              ))}
            </div>
          )}

          {/* Distillery matches */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-amber-400 flex items-center gap-2">
                Distillery matches
                {plan.aiUsed && <span className="text-xs font-normal text-violet-300 flex items-center gap-1"><Sparkles size={12} /> AI-assisted</span>}
              </h3>
              <button onClick={() => setShowAllDistilleries((v) => !v)} className="text-xs text-slate-400 hover:text-slate-200">
                {showAllDistilleries ? "Hide exact matches" : `Show all ${plan.distilleries.length}`}
              </button>
            </div>
            {reviewDistilleries.length === 0 ? (
              <p className="text-sm text-slate-500">Every distillery in the sheet matched exactly.</p>
            ) : (
              <div className="space-y-2">
                {reviewDistilleries.map((d) => {
                  const choice = choices[d.key] ?? choiceFromMatch(d);
                  const creating = "create" in choice;
                  return (
                    <div key={d.key} className="bg-slate-800/40 border border-slate-700/70 rounded-lg p-3">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                        <div className="lg:w-56 flex-shrink-0">
                          <div className="text-slate-100 font-medium">&ldquo;{d.sheetName}&rdquo;</div>
                          <div className="text-xs text-slate-500">
                            {[d.sheetCountry, d.sheetRegion].filter(Boolean).join(" · ")} · {d.rowCount} row{d.rowCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <span className={`self-start lg:self-center text-xs px-2 py-0.5 rounded border ${METHOD_STYLE[d.method].className}`}>
                          {METHOD_STYLE[d.method].label}
                          {d.method !== "exact" && d.method !== "manual" && d.confidence > 0 ? ` ${Math.round(d.confidence * 100)}%` : ""}
                        </span>
                        <select
                          value={creating ? CREATE : choice.distilleryId}
                          onChange={(e) =>
                            setChoice(d.key, e.target.value === CREATE ? { create: { ...d.create } } : { distilleryId: e.target.value })
                          }
                          className="flex-1 min-w-0 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200"
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
                        </select>
                      </div>
                      {creating && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                          {(["name", "country", "region"] as const).map((field) => (
                            <input
                              key={field}
                              value={choice.create[field]}
                              placeholder={field[0].toUpperCase() + field.slice(1)}
                              onChange={(e) => setChoice(d.key, { create: { ...choice.create, [field]: e.target.value } })}
                              className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200"
                            />
                          ))}
                        </div>
                      )}
                      {d.reason && <p className="text-xs text-slate-400 mt-2 flex gap-1"><Sparkles size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />{d.reason}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {choicesDirty && (
              <div className="mt-3 flex items-center gap-3">
                <Button size="sm" onClick={() => preview.mutate({ rows, useAi: false, choices })} disabled={busy} className="bg-slate-700 hover:bg-slate-600 text-white">
                  <RefreshCw size={14} className="mr-2" /> Refresh preview
                </Button>
                <span className="text-xs text-slate-400">You changed a match: refresh to see what it changes before applying.</span>
              </div>
            )}
          </section>

          {/* Gathering changes */}
          {gatheringChanges.length > 0 && (
            <section>
              <h3 className="font-semibold text-amber-400 mb-2">Gatherings</h3>
              <ul className="space-y-1 text-sm">
                {gatheringChanges.map((g) => (
                  <li key={g.number} className="text-slate-300">
                    <span className="text-amber-400 font-medium">Gathering {g.number}</span>{" "}
                    {g.status === "new" ? (
                      <span className="text-emerald-400">new: {g.date} · {g.theme ?? "no theme"} · hosted by {g.host}</span>
                    ) : (
                      g.changes.map((c) => (
                        <span key={c.field} className="mr-3">
                          {c.field}: <span className="line-through text-slate-500">{c.from ?? "—"}</span> → <span className="text-amber-200">{c.to}</span>
                        </span>
                      ))
                    )}
                  </li>
                ))}
              </ul>
              {plan.newMembers.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">New members will be added for: {plan.newMembers.join(", ")}</p>
              )}
            </section>
          )}

          {/* Dram changes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-amber-400">Dram changes</h3>
              {changedRows.length > 0 && (
                <button
                  onClick={() => setExcluded(excluded.size ? new Set() : new Set(changedRows.map((w) => w.row)))}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  {excluded.size ? "Select all" : "Select none"}
                </button>
              )}
            </div>
            {changedRows.length === 0 ? (
              <p className="text-sm text-slate-500">The site already matches every dram in this sheet.</p>
            ) : (
              <div className="border border-slate-800 rounded-lg divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {changedRows.map((w) => (
                  <label key={w.row} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!excluded.has(w.row)}
                      onChange={(e) => {
                        const next = new Set(excluded);
                        if (e.target.checked) next.delete(w.row); else next.add(w.row);
                        setExcluded(next);
                      }}
                      className="mt-1 accent-amber-600"
                    />
                    <div className="min-w-0 text-sm">
                      <div className="text-slate-200">
                        <span className="text-amber-400 font-medium mr-2">G{w.gathering}</span>
                        <span className="font-medium">{w.distillery}</span> {w.variety}
                        <span className="text-slate-500"> · {w.provider ?? "no provider"} · row {w.row}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${w.status === "new" ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"}`}>
                          {w.status === "new" ? "New" : "Update"}
                        </span>
                      </div>
                      {w.status === "new" ? (
                        <div className="text-xs text-slate-400">
                          {[w.abv && `${w.abv}%`, w.notes].filter(Boolean).join(" · ")}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 flex flex-wrap gap-x-3">
                          {w.changes.map((c) => (
                            <span key={c.field}>
                              {c.field}: <span className="line-through text-slate-500">{c.from ?? "—"}</span> → <span className="text-amber-200">{c.to ?? "—"}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">Untick a row to keep the site&apos;s current value (e.g. where the sheet has a typo). Empty cells in the sheet never clear site data.</p>
          </section>

          {plan.notInSheet.length > 0 && (
            <section>
              <button onClick={() => setShowNotInSheet((v) => !v)} className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1">
                {showNotInSheet ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {plan.notInSheet.length} dram{plan.notInSheet.length === 1 ? " is" : "s are"} on the site but not in this sheet (left as they are)
              </button>
              {showNotInSheet && (
                <ul className="mt-2 text-xs text-slate-400 space-y-0.5 pl-5">
                  {plan.notInSheet.map((w, i) => (
                    <li key={i}>G{w.gathering} · {w.distillery} {w.variety} · {w.provider}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end border-t border-slate-800 pt-4">
            <Button variant="ghost" onClick={reset} disabled={busy} className="text-slate-400 hover:bg-slate-800">Cancel</Button>
            <Button
              onClick={() => apply.mutate({ rows: applyRows(), choices })}
              disabled={busy || choicesDirty || (includedChanges === 0 && gatheringChanges.length === 0)}
              className="bg-amber-700 hover:bg-amber-600 text-white"
            >
              {apply.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : includedChanges ? <Upload size={16} className="mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
              Apply {includedChanges} dram change{includedChanges === 1 ? "" : "s"}
              {gatheringChanges.length ? ` and ${gatheringChanges.length} gathering${gatheringChanges.length === 1 ? "" : "s"}` : ""}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
