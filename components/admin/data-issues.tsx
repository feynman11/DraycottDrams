"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { AlertTriangle, MapPin, Globe, Map, Trophy, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

type IssueTab = "coordinates" | "country" | "region" | "ranking" | "distilleries";

interface DataIssuesProps {
  onEditDistillery?: (distilleryName: string) => void;
}

export function DataIssues({ onEditDistillery }: DataIssuesProps) {
  const [activeTab, setActiveTab] = useState<IssueTab>("coordinates");
  const [expandedDistilleries, setExpandedDistilleries] = useState<Set<string>>(new Set());

  const { data, isLoading } = api.whisky.getDataIssues.useQuery();

  const toggleDistillery = (id: string) => {
    const newExpanded = new Set(expandedDistilleries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDistilleries(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="text-slate-400 py-8 text-center">
        Loading data issues...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-slate-400 py-8 text-center">
        No data available
      </div>
    );
  }

  const { summary } = data;
  const totalIssues = summary.totalMissingCoordinates + summary.totalMissingCountry + summary.totalMissingRegion;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveTab("coordinates")}
          className={`p-4 rounded-lg border transition-colors text-left ${
            activeTab === "coordinates"
              ? "bg-amber-900/30 border-amber-600"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-red-400" />
            <span className="text-sm text-slate-400">Missing Coordinates</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.totalMissingCoordinates}
          </div>
        </button>

        <button
          onClick={() => setActiveTab("country")}
          className={`p-4 rounded-lg border transition-colors text-left ${
            activeTab === "country"
              ? "bg-amber-900/30 border-amber-600"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-orange-400" />
            <span className="text-sm text-slate-400">Missing Country</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.totalMissingCountry}
          </div>
        </button>

        <button
          onClick={() => setActiveTab("region")}
          className={`p-4 rounded-lg border transition-colors text-left ${
            activeTab === "region"
              ? "bg-amber-900/30 border-amber-600"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Map size={18} className="text-yellow-400" />
            <span className="text-sm text-slate-400">Missing Region</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.totalMissingRegion}
          </div>
        </button>

        <button
          onClick={() => setActiveTab("ranking")}
          className={`p-4 rounded-lg border transition-colors text-left ${
            activeTab === "ranking"
              ? "bg-amber-900/30 border-amber-600"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-blue-400" />
            <span className="text-sm text-slate-400">Missing Ranking</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.totalMissingRanking}
          </div>
        </button>

        <button
          onClick={() => setActiveTab("distilleries")}
          className={`p-4 rounded-lg border transition-colors text-left ${
            activeTab === "distilleries"
              ? "bg-amber-900/30 border-amber-600"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-purple-400" />
            <span className="text-sm text-slate-400">Distilleries w/ Issues</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {summary.uniqueDistilleriesWithIssues}
          </div>
        </button>
      </div>

      {/* Total Issues Banner */}
      {totalIssues > 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={24} />
            <div>
              <p className="text-amber-200 font-medium">
                {totalIssues} whiskies have distillery data issues
              </p>
              <p className="text-amber-400/70 text-sm">
                These whiskies may not appear correctly on the map or in filtered views
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Issue List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-lg font-medium text-amber-400">
            {activeTab === "coordinates" && "Whiskies Missing Coordinates"}
            {activeTab === "country" && "Whiskies Missing Country"}
            {activeTab === "region" && "Whiskies Missing Region"}
            {activeTab === "ranking" && "Whiskies Missing Ranking"}
            {activeTab === "distilleries" && "Distilleries with Issues"}
          </h3>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {activeTab === "distilleries" ? (
            // Distillery view
            data.distilleriesWithIssues.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No distilleries with issues found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-slate-300 font-medium">Distillery</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Country</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Region</th>
                    <th className="text-center p-3 text-slate-300 font-medium">Coordinates</th>
                    <th className="text-center p-3 text-slate-300 font-medium">Whiskies</th>
                    <th className="text-center p-3 text-slate-300 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.distilleriesWithIssues.map((distillery) => (
                    <tr
                      key={distillery.id}
                      className="border-t border-slate-800 hover:bg-slate-800/30"
                    >
                      <td className="p-3 text-slate-200">{distillery.name}</td>
                      <td className="p-3 text-slate-400">
                        {distillery.country || <span className="text-red-400">Missing</span>}
                      </td>
                      <td className="p-3 text-slate-400">
                        {distillery.region || <span className="text-red-400">Missing</span>}
                      </td>
                      <td className="p-3 text-center">
                        {distillery.hasCoordinates ? (
                          <span className="text-green-400">Yes</span>
                        ) : (
                          <span className="text-red-400">No</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        {distillery.whiskyCount}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onEditDistillery?.(distillery.name)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-900/30 rounded transition-colors"
                        >
                          <ExternalLink size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            // Whisky issues view
            (() => {
              const issues =
                activeTab === "coordinates"
                  ? data.missingCoordinates
                  : activeTab === "country"
                  ? data.missingCountry
                  : activeTab === "region"
                  ? data.missingRegion
                  : data.missingRanking;

              if (issues.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400">
                    No issues found in this category
                  </div>
                );
              }

              // Group by distillery for better organization
              const byDistillery = issues.reduce((acc, whisky) => {
                const key = whisky.distillery;
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(whisky);
                return acc;
              }, {} as Record<string, typeof issues>);

              return (
                <div className="divide-y divide-slate-800">
                  {Object.entries(byDistillery)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([distilleryName, whiskies]) => (
                      <div key={distilleryName}>
                        <div className="flex items-center justify-between p-3 hover:bg-slate-800/30 transition-colors">
                          <button
                            onClick={() => toggleDistillery(distilleryName)}
                            className="flex items-center gap-3 flex-1"
                          >
                            {expandedDistilleries.has(distilleryName) ? (
                              <ChevronDown size={18} className="text-slate-400" />
                            ) : (
                              <ChevronRight size={18} className="text-slate-400" />
                            )}
                            <span className="text-slate-200 font-medium">
                              {distilleryName}
                            </span>
                            <span className="text-slate-500 text-sm">
                              ({whiskies[0].country || "Unknown"}, {whiskies[0].region || "Unknown"})
                            </span>
                          </button>
                          <div className="flex items-center gap-3">
                            <span className="text-amber-400 text-sm">
                              {whiskies.length} {whiskies.length === 1 ? "whisky" : "whiskies"}
                            </span>
                            <button
                              onClick={() => onEditDistillery?.(distilleryName)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-900/30 rounded transition-colors"
                            >
                              <ExternalLink size={14} />
                              Edit
                            </button>
                          </div>
                        </div>

                        {expandedDistilleries.has(distilleryName) && (
                          <div className="bg-slate-800/20 border-t border-slate-800">
                            <table className="w-full">
                              <thead>
                                <tr className="text-xs text-slate-500">
                                  <th className="text-left p-2 pl-10">Gathering</th>
                                  <th className="text-left p-2">Variety</th>
                                  <th className="text-left p-2">Provider</th>
                                </tr>
                              </thead>
                              <tbody>
                                {whiskies.map((whisky) => (
                                  <tr
                                    key={whisky.id}
                                    className="border-t border-slate-800/50 text-sm"
                                  >
                                    <td className="p-2 pl-10 text-slate-400">
                                      G{whisky.gathering}
                                      {whisky.theme && (
                                        <span className="text-slate-500 ml-2">
                                          ({whisky.theme})
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-slate-300">
                                      {whisky.variety || "-"}
                                    </td>
                                    <td className="p-2 text-slate-400">
                                      {whisky.provider}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
