import { useMemo, useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { DramsUpload } from "@/components/admin/drams-upload";
import { RankingBadge } from "@/components/whisky/ranking-badge";
import { DistilleryDetail } from "@/components/whisky/distillery-detail";
import { WhiskyDetail } from "@/components/whisky/whisky-detail";
import { rankingLabel } from "@/lib/drams-sheet";
import { ArrowDown, ArrowUp, Download, Loader2, Search, Upload, X } from "lucide-react";

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
  const openDistilleryWhiskies = libraryWhiskies?.filter((w) => w.distilleryId === openDistilleryId) ?? [];
  const openDistilleryName = rows?.find((r) => r.distilleryId === openDistilleryId)?.distillery ?? "";

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
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-amber-50 mb-1">Drams Sheet</h2>
          <p className="text-slate-400 text-sm">Every dram the club has tasted, laid out like the chair&apos;s spreadsheet.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={download} disabled={!rows?.length} className="text-slate-300 hover:bg-slate-800 border border-slate-700">
            <Download size={16} className="mr-2" /> Download .xlsx
          </Button>
          {canUpload && (
            <Button size="sm" onClick={() => setShowUpload((v) => !v)} className="bg-amber-700 hover:bg-amber-600 text-white">
              {showUpload ? <X size={16} className="mr-2" /> : <Upload size={16} className="mr-2" />}
              {showUpload ? "Close upload" : "Upload new sheet"}
            </Button>
          )}
        </div>
      </div>

      {canUpload && showUpload && <DramsUpload onDone={() => setShowUpload(false)} />}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search distillery, variety, provider, theme…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-600"
          />
        </div>
        <select
          value={gathering}
          onChange={(e) => setGathering(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-600"
          aria-label="Gathering"
        >
          <option value="all">All gatherings</option>
          {gatheringNumbers.map((n) => (
            <option key={n} value={n}>Gathering {n}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {visible.length} dram{visible.length === 1 ? "" : "s"} across {gatheringCount} gathering{gatheringCount === 1 ? "" : "s"}
          </p>
          <div className="overflow-auto max-h-[70vh] border border-slate-800 rounded-lg">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={`px-3 py-2 font-medium ${col.className ?? ""}`}>
                      {col.sortable ? (
                        <button onClick={() => toggleSort(col.key as SortKey)} className="inline-flex items-center gap-1 hover:text-amber-400">
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
                      className={`hover:bg-slate-800/50 ${newGroup ? "border-t-2 border-slate-700" : "border-t border-slate-800/60"}`}
                    >
                      <td className="px-3 py-1.5 text-right text-amber-400 font-medium">{r.gathering}</td>
                      <td className="px-3 py-1.5 text-slate-400 max-w-[14rem] truncate" title={r.theme ?? ""}>{r.theme}</td>
                      <td className="px-3 py-1.5 text-slate-400">{formatDate(r.date)}</td>
                      <td className="px-3 py-1.5 text-slate-200">{r.provider}</td>
                      <td className="px-3 py-1.5 text-slate-400">{r.country}</td>
                      <td className="px-3 py-1.5 text-slate-400">{r.region}</td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => { setOpenWhiskyId(null); setOpenDistilleryId(r.distilleryId); }}
                          className="text-amber-50 font-medium hover:text-amber-400 hover:underline underline-offset-2 text-left"
                        >
                          {r.distillery}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 max-w-[18rem]">
                        <button
                          onClick={() => { setOpenDistilleryId(null); setOpenWhiskyId(r.id); }}
                          title={r.variety}
                          className="block max-w-full truncate text-slate-200 hover:text-amber-400 hover:underline underline-offset-2 text-left"
                        >
                          {r.variety || "—"}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-300 tabular-nums">{parseFloat(r.abv) ? `${parseFloat(r.abv)}%` : ""}</td>
                      <td className="px-3 py-1.5 text-slate-400">{r.host}</td>
                      <td className="px-3 py-1.5">
                        {r.ranking ? <RankingBadge ranking={r.ranking} size="sm" /> : <span className="text-xs text-slate-500">Bonus</span>}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-slate-500">No drams match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openDistilleryId && openDistilleryWhiskies.length > 0 && (
        <DistilleryDetail
          distillery={openDistilleryName}
          whiskies={openDistilleryWhiskies}
          onClose={() => setOpenDistilleryId(null)}
        />
      )}
      <WhiskyDetail whisky={openWhisky} onClose={() => setOpenWhiskyId(null)} />
    </div>
  );
}
