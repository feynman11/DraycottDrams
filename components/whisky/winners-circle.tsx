"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Trophy, Medal, TrendingUp, Users, Building2, Calendar } from "lucide-react";
import { RankingBadge } from "./ranking-badge";
import { WhiskyDetail } from "./whisky-detail";
import { type WhiskyWithGathering } from "@/lib/types";
import { ProviderLeaderboard } from "./provider-leaderboard";
import { DistilleryPerformance } from "./distillery-performance";

export function WinnersCircle() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"winners" | "providers" | "distilleries">("winners");
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);

  const { data: winners, isLoading: winnersLoading } = api.whisky.getWinners.useQuery({
    year: selectedYear,
    region: selectedRegion || undefined,
  });

  const { data: stats, isLoading: statsLoading } = api.whisky.getRankingStats.useQuery();
  const { data: whiskyStats } = api.whisky.getStats.useQuery();

  const regions = whiskyStats?.regions || [];

  // Get unique years from winners
  const years = winners
    ? [...new Set(winners.map(w => new Date(w.date).getFullYear()))].sort((a, b) => b - a)
    : [];

  const isLoading = winnersLoading || statsLoading;

  return (
    <div className="w-full h-full bg-slate-950 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 lg:p-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Trophy className="text-amber-400" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-amber-50">Winners Circle</h1>
          </div>
          <p className="text-slate-400">
            Celebrating the best whiskies from every gathering
          </p>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Trophy className="text-amber-400" size={20} />}
              label="Total Winners"
              value={stats.totalRanked > 0 ? Math.floor(stats.gatheringsWithRankings) : 0}
            />
            <StatCard
              icon={<Calendar className="text-blue-400" size={20} />}
              label="Gatherings Ranked"
              value={stats.gatheringsWithRankings}
            />
            <StatCard
              icon={<Building2 className="text-green-400" size={20} />}
              label="Top Distillery"
              value={stats.topDistillery?.distillery || "N/A"}
              subtitle={stats.topDistillery ? `${stats.topDistillery.wins} wins` : undefined}
            />
            <StatCard
              icon={<Users className="text-purple-400" size={20} />}
              label="Top Provider"
              value={stats.topProvider?.provider || "N/A"}
              subtitle={stats.topProvider ? `${stats.topProvider.wins} wins` : undefined}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
          <TabButton
            active={activeTab === "winners"}
            onClick={() => setActiveTab("winners")}
            icon={<Trophy size={16} />}
            label="Winners"
          />
          <TabButton
            active={activeTab === "providers"}
            onClick={() => setActiveTab("providers")}
            icon={<Users size={16} />}
            label="Provider Leaderboard"
          />
          <TabButton
            active={activeTab === "distilleries"}
            onClick={() => setActiveTab("distilleries")}
            icon={<Building2 size={16} />}
            label="Distillery Stats"
          />
        </div>

        {/* Tab Content */}
        {activeTab === "winners" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={selectedYear || ""}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region.region} value={region.region}>
                    {region.region}
                  </option>
                ))}
              </select>
            </div>

            {/* Winners Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-amber-500">Loading winners...</div>
              </div>
            ) : winners && winners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {winners.map((winner) => (
                  <WinnerCard
                    key={winner.id}
                    winner={winner}
                    onClick={() => {
                      // Create a WhiskyWithGathering-like object for the detail view
                      setSelectedWhisky({
                        id: winner.id,
                        provider: winner.provider,
                        variety: winner.variety,
                        abv: winner.abv,
                        ranking: winner.ranking,
                        distillery: winner.distillery,
                        country: winner.country,
                        region: winner.region,
                        gathering: winner.gathering,
                        theme: winner.theme || '',
                        date: winner.date,
                        host: winner.host || '',
                      } as WhiskyWithGathering);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="mx-auto text-slate-600 mb-4" size={48} />
                <p className="text-slate-400">No winners found for the selected filters</p>
              </div>
            )}
          </>
        )}

        {activeTab === "providers" && <ProviderLeaderboard />}
        {activeTab === "distilleries" && <DistilleryPerformance />}
      </div>

      {/* Whisky Detail Panel */}
      <WhiskyDetail
        whisky={selectedWhisky}
        onClose={() => setSelectedWhisky(null)}
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}

function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-100">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active
          ? "bg-amber-600 text-white"
          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface WinnerCardProps {
  winner: {
    id: string;
    provider: string;
    variety: string;
    abv: string;
    ranking: number | null;
    distillery: string;
    country: string;
    region: string;
    gathering: number;
    theme: string | null;
    date: Date;
    host: string | null;
  };
  onClick: () => void;
}

function WinnerCard({ winner, onClick }: WinnerCardProps) {
  return (
    <button
      onClick={onClick}
      className="group bg-gradient-to-br from-amber-900/30 to-slate-900 border border-amber-600/30 rounded-xl p-0 overflow-hidden hover:border-amber-500/50 transition-all cursor-pointer shadow-lg hover:shadow-amber-900/20 text-left w-full"
    >
      {/* Gold bar at top */}
      <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 w-full" />

      <div className="p-5">
        {/* Trophy and gathering info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Trophy className="text-amber-400" size={16} />
            </div>
            <div>
              <p className="text-xs text-amber-500 font-semibold">Gathering {winner.gathering}</p>
              <p className="text-xs text-slate-500">{winner.theme}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            {new Date(winner.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Distillery and variety */}
        <h3 className="text-lg font-bold text-amber-400 group-hover:text-amber-300 transition-colors mb-1">
          {winner.distillery}
        </h3>
        <p className="text-sm text-slate-400 mb-2">{winner.variety}</p>

        {/* Provider */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            Provided by <span className="text-slate-400">{winner.provider}</span>
          </span>
          <span className="text-xs text-slate-600">{winner.region}, {winner.country}</span>
        </div>
      </div>
    </button>
  );
}
