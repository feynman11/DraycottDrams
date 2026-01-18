"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Building2, Trophy, Medal, TrendingUp, MapPin, Filter } from "lucide-react";

export function DistilleryPerformance() {
  const [sortBy, setSortBy] = useState<"wins" | "avgRanking" | "entries">("wins");
  const [filterRegion, setFilterRegion] = useState<string>("");

  const { data: distilleries, isLoading } = api.whisky.getDistilleryPerformance.useQuery();
  const { data: stats } = api.whisky.getStats.useQuery();

  const regions = stats?.regions || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-amber-500">Loading distillery data...</div>
      </div>
    );
  }

  if (!distilleries || distilleries.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto text-slate-600 mb-4" size={48} />
        <p className="text-slate-400">No ranking data available yet</p>
      </div>
    );
  }

  // Filter by region
  let filteredDistilleries = filterRegion
    ? distilleries.filter(d => d.region === filterRegion)
    : distilleries;

  // Only show distilleries with ranking data
  filteredDistilleries = filteredDistilleries.filter(d => d.avgRanking !== null);

  // Sort
  const sortedDistilleries = [...filteredDistilleries].sort((a, b) => {
    if (sortBy === "wins") {
      return Number(b.wins) - Number(a.wins);
    } else if (sortBy === "avgRanking") {
      if (a.avgRanking === null) return 1;
      if (b.avgRanking === null) return -1;
      return a.avgRanking - b.avgRanking;
    } else {
      return b.totalEntries - a.totalEntries;
    }
  });

  // Get top performers for highlight cards
  const topByWins = [...filteredDistilleries]
    .filter(d => Number(d.wins) > 0)
    .sort((a, b) => Number(b.wins) - Number(a.wins))
    .slice(0, 5);

  const topByAvgRank = [...filteredDistilleries]
    .filter(d => d.avgRanking !== null && d.totalEntries >= 2)
    .sort((a, b) => (a.avgRanking || 999) - (b.avgRanking || 999))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="text-green-400" size={20} />
        <h2 className="text-xl font-bold text-slate-100">Distillery Performance</h2>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        See which distilleries consistently produce winning whiskies
      </p>

      {/* Top Performers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Most Wins */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-amber-400" size={18} />
            <h3 className="font-semibold text-slate-200">Most Wins</h3>
          </div>
          <div className="space-y-3">
            {topByWins.map((distillery, index) => (
              <div key={distillery.distilleryId} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${
                  index === 0 ? "text-amber-400" :
                  index === 1 ? "text-slate-300" :
                  index === 2 ? "text-amber-600" :
                  "text-slate-500"
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{distillery.distillery}</p>
                  <p className="text-xs text-slate-500">{distillery.region}, {distillery.country}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded">
                  <Trophy size={12} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">{distillery.wins}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Average Ranking */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-400" size={18} />
            <h3 className="font-semibold text-slate-200">Best Average Ranking</h3>
            <span className="text-xs text-slate-500">(min 2 entries)</span>
          </div>
          <div className="space-y-3">
            {topByAvgRank.map((distillery, index) => (
              <div key={distillery.distilleryId} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${
                  index === 0 ? "text-green-400" :
                  index === 1 ? "text-green-500" :
                  index === 2 ? "text-green-600" :
                  "text-slate-500"
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{distillery.distillery}</p>
                  <p className="text-xs text-slate-500">{distillery.totalEntries} entries</p>
                </div>
                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <span className="text-sm font-bold text-green-400">
                    {distillery.avgRanking?.toFixed(1)}
                  </span>
                  <span className="text-xs text-green-500">avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Regions</option>
          {regions.map((region) => (
            <option key={region.region} value={region.region}>
              {region.region}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="wins">Sort by Wins</option>
          <option value="avgRanking">Sort by Average Ranking</option>
          <option value="entries">Sort by Total Entries</option>
        </select>
      </div>

      {/* Full Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-4">Distillery</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-4">Region</th>
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy size={12} className="text-amber-400" />
                    Wins
                  </div>
                </th>
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">
                  <div className="flex items-center justify-center gap-1">
                    <Medal size={12} className="text-slate-400" />
                    Podiums
                  </div>
                </th>
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">Entries</th>
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">Avg Rank</th>
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">Performance</th>
              </tr>
            </thead>
            <tbody>
              {sortedDistilleries.map((distillery) => (
                <tr
                  key={distillery.distilleryId}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4">
                    <span className="font-medium text-slate-200">{distillery.distillery}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <MapPin size={12} />
                      <span>{distillery.region}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${Number(distillery.wins) > 0 ? "text-amber-400" : "text-slate-500"}`}>
                      {distillery.wins}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-medium ${Number(distillery.podiums) > 0 ? "text-slate-300" : "text-slate-500"}`}>
                      {distillery.podiums}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-400">
                    {distillery.totalEntries}
                  </td>
                  <td className="p-4 text-center">
                    <AvgRankIndicator avgRank={distillery.avgRanking} />
                  </td>
                  <td className="p-4">
                    <PerformanceBar
                      wins={Number(distillery.wins)}
                      podiums={Number(distillery.podiums)}
                      total={distillery.totalEntries}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AvgRankIndicator({ avgRank }: { avgRank: number | null }) {
  if (avgRank === null) return <span className="text-slate-600">-</span>;

  const color =
    avgRank <= 2 ? "text-green-400" :
    avgRank <= 3 ? "text-amber-400" :
    avgRank <= 4 ? "text-orange-400" :
    "text-slate-400";

  return (
    <span className={`font-medium ${color}`}>
      {avgRank.toFixed(1)}
    </span>
  );
}

interface PerformanceBarProps {
  wins: number;
  podiums: number;
  total: number;
}

function PerformanceBar({ wins, podiums, total }: PerformanceBarProps) {
  if (total === 0) return <span className="text-slate-600">-</span>;

  const winPercent = (wins / total) * 100;
  const podiumPercent = (podiums / total) * 100;
  const otherPodiumPercent = podiumPercent - winPercent;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden flex">
        {/* Wins (gold) */}
        <div
          className="h-full bg-amber-400"
          style={{ width: `${winPercent}%` }}
        />
        {/* Other podiums (silver) */}
        <div
          className="h-full bg-slate-400"
          style={{ width: `${otherPodiumPercent}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">
        {Math.round(podiumPercent)}%
      </span>
    </div>
  );
}
