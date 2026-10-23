import { useMemo, useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FilterBar, SearchField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonRows } from "@/components/ui/skeleton";
import { DramsUpload } from "@/components/admin/drams-upload";
import { RankingBadge } from "@/components/whisky/ranking-badge";
import { DistilleryDetail } from "@/components/whisky/distillery-detail";
import { WhiskyDetail } from "@/components/whisky/whisky-detail";
import { rankingLabel } from "@/lib/drams-sheet";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Download, Upload, X } from "lucide-react";

type SortKey = "gathering" | "date" | "provider" | "country" | "region" | "distillery" | "variety" | "abv" | "host" | "ranking";

const COLUMNS: { key: SortKey | "theme"; label: string; sortable: boolean; className?: string }[] = [
  { key: "gathering", label: "#", sortable: true, className: "w-12 text-right" },
  { key: "theme", label: "Theme", sortable: false },
  { key: "date", label: "Date", sortable: true },
  { key: "provider", label: "Provider", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "region", label: "Region", sortable: true },
  { key: "distillery", label: "Distillery", sortable: true },
  { key: "variety", label: "Variety", sortable: true },
  { key: "abv", label: "ABV", sortable: true, className: "text-right" },
  { key: "host", label: "Host", sortable: true },
  { key: "ranking", label: "Position", sortable: true },
];

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

// The site's drams in the chair's spreadsheet layout; distilleries and whiskies open their detail
// panels, and admins can upload a new sheet from here.
export function DramsSheet({ canUpload }: { canUpload: boolean }) {
  const { data: rows, isLoading } = api.drams.getSheet.useQuery();
  const [search, setSearch] = useState("");
  const [gathering, setGathering] = useState<number | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "gathering", dir: "desc" });
  const [showUpload, setShowUpload] = useState(false);
  // Clicking a distillery or whisky opens the same detail panel as the Distilleries / Whiskies pages
  const [openDistilleryId, setOpenDistilleryId] = useState<string | null>(null);
  const [openWhiskyId, setOpenWhiskyId] = useState<string | null>(null);
  const { data: libraryWhiskies } = api.whisky.getAll.useQuery({ limit: 1000 }, { enabled: !!(openDistilleryId || openWhiskyId) });
  const openWhisky = libraryWhiskies?.find((w) => w.id === openWhiskyId) ?? null;
  const openDistilleryWhiskies = useMemo(
    () => libraryWhiskies?.filter((w) => w.distilleryId === openDistilleryId) ?? [],
    [libraryWhiskies, openDistilleryId],
  );
  const openDistilleryName = rows?.find((r) => r.distilleryId === openDistilleryId)?.distillery ?? null;

  const gatheringNumbers = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.gathering))].sort((a, b) => b - a),
    [rows],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (rows ?? []).filter((r) => {
      if (gathering !== "all" && r.gathering !== gathering) return false;
      if (!term) return true;
      return [r.theme, r.provider, r.country, r.region, r.distillery, r.variety, r.host]
        .some((v) => v?.toLowerCase().includes(term));
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    const value = (r: (typeof filtered)[number]): number | string => {
      switch (sort.key) {
        case "gathering": return r.gathering;
        case "date": return r.date.getTime();
        case "abv": return parseFloat(r.abv) || 0;
        case "ranking": return r.ranking ?? 99; // unranked (bonus) drams last
        case "host": return (r.host ?? "").toLowerCase();
        default: return (r[sort.key] ?? "").toLowerCase();
      }
    };
    // Ties fall back to gathering order, then position, so each gathering stays together
    return [...filtered].sort((a, b) => {
      const va = value(a), vb = value(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return (b.gathering - a.gathering) || ((a.ranking ?? 99) - (b.ranking ?? 99));
    });
  }, [rows, search, gathering, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "gathering" || key === "date" ? "desc" : "asc" }));

  const download = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(
      [...(rows ?? [])]
        .sort((a, b) => a.gathering - b.gathering || (a.ranking ?? 99) - (b.ranking ?? 99))
        .map((r) => ({
          Gathering: r.gathering,
          Theme: r.theme ?? "",
          Date: r.date,
          Provider: r.provider,
          Country: r.country,
          Region: r.region,
          Distillery: r.distillery,
          Variety: r.variety,
          ABV: (parseFloat(r.abv) || 0) / 100,
          Host: r.host ?? "",
          Notes: rankingLabel(r.ranking) ?? r.notes ?? "",
        })),
      { cellDates: true, dateNF: "d mmmm yyyy" },
    );
    // Show ABV as a percentage, as in the chair's sheet
    const range = XLSX.utils.decode_range(sheet["!ref"]!);
    for (let r = 1; r <= range.e.r; r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: 8 })];
      if (cell) cell.z = "0.0%";
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Drams");
    XLSX.writeFile(workbook, `Drams-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const gatheringCount = new Set(visible.map((r) => r.gathering)).size;

  return (
    <div className="space-y-4">
      <PageHeader
        as="h2"
        title="Drams sheet"
        description="Every dram the club has tasted, laid out like the chair's spreadsheet."
        aside={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={download} disabled={!rows?.length}>
              <Download size={16} /> Download .xlsx
            </Button>
            {canUpload && (
              <Button size="sm" onClick={() => setShowUpload((v) => !v)} aria-expanded={showUpload}>
                {showUpload ? <X size={16} /> : <Upload size={16} />}
                {showUpload ? "Close upload" : "Upload new sheet"}
              </Button>
            )}
          </div>
        }
      />

      {canUpload && showUpload && <DramsUpload onDone={() => setShowUpload(false)} />}

      <FilterBar>
        <SearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search distillery, variety, provider, theme…"
          aria-label="Search drams"
          className="md:max-w-md"
        />
        <Select
          value={gathering}
          onChange={(e) => setGathering(e.target.value === "all" ? "all" : Number(e.target.value))}
          aria-label="Gathering"
          className="col-span-2"
        >
          <option value="all">All gatherings</option>
          {gatheringNumbers.map((n) => (
            <option key={n} value={n}>Gathering {n}</option>
          ))}
        </Select>
      </FilterBar>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card"><SkeletonRows rows={8} cols={6} /></div>
      ) : (
        <>
          <p className="text-xs text-subtle">
            {visible.length} dram{visible.length === 1 ? "" : "s"} across {gatheringCount} gathering{gatheringCount === 1 ? "" : "s"}
          </p>
          <div className="relative overflow-hidden rounded-xl border border-border bg-card">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="sticky top-0 z-10 bg-popover shadow-[0_1px_0_var(--color-border)]">
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-subtle">
                    {COLUMNS.map((col) => (
                      <th key={col.key} className={cn("px-3 py-2.5", col.className)} aria-sort={sort.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key as SortKey)}
                            className="touch-exempt inline-flex items-center gap-1 rounded uppercase transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {col.label}
                            {sort.key === col.key && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => {
                    const newGroup = sort.key === "gathering" && i > 0 && visible[i - 1].gathering !== r.gathering;
                    return (
                      <tr
                        key={r.id}
                        className={cn("transition-colors hover:bg-accent/40", newGroup ? "border-t-2 border-border-strong" : "border-t border-border")}
                      >
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-primary">{r.gathering}</td>
                        <td className="max-w-[14rem] truncate px-3 py-2 text-muted-foreground" title={r.theme ?? ""}>{r.theme}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDate(r.date)}</td>
                        <td className="px-3 py-2 text-foreground">{r.provider}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.country}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.region}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => { setOpenWhiskyId(null); setOpenDistilleryId(r.distilleryId); }}
                            className="touch-exempt rounded text-left font-medium text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {r.distillery}
                          </button>
                        </td>
                        <td className="max-w-[18rem] px-3 py-2">
                          <button
                            type="button"
                            onClick={() => { setOpenDistilleryId(null); setOpenWhiskyId(r.id); }}
                            title={r.variety}
                            className="touch-exempt block max-w-full truncate rounded text-left text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {r.variety || "—"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{parseFloat(r.abv) ? `${parseFloat(r.abv)}%` : ""}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.host}</td>
                        <td className="px-3 py-2">
                          {r.ranking ? <RankingBadge ranking={r.ranking} size="sm" /> : <span className="text-xs text-subtle">Bonus</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-muted-foreground">No drams match.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DistilleryDetail
        distillery={openDistilleryName}
        whiskies={openDistilleryWhiskies}
        onClose={() => setOpenDistilleryId(null)}
      />
      <WhiskyDetail whisky={openWhisky} onClose={() => setOpenWhiskyId(null)} />
    </div>
  );
}
