"use client";

import { api } from "@/lib/trpc-client";
import { Trophy, Medal, TrendingUp, Users } from "lucide-react";

export function ProviderLeaderboard() {
  const { data: leaderboard, isLoading } = api.whisky.getProviderLeaderboard.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-amber-500">Loading leaderboard...</div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto text-slate-600 mb-4" size={48} />
        <p className="text-slate-400">No ranking data available yet</p>
      </div>
    );
  }

  // Filter to only show providers with at least one ranked whisky
  const rankedProviders = leaderboard.filter(p => p.avgRanking !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="text-purple-400" size={20} />
        <h2 className="text-xl font-bold text-slate-100">Provider Leaderboard</h2>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        Track which members bring the best whiskies to gatherings
      </p>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {rankedProviders.slice(0, 3).map((provider, index) => (
          <TopProviderCard
            key={provider.provider}
            provider={provider}
            position={(index + 1) as 1 | 2 | 3}
          />
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-4">Rank</th>
                <th className="text-left text-xs text-slate-400 uppercase tracking-wider p-4">Provider</th>
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
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp size={12} className="text-green-400" />
                    Avg Rank
                  </div>
                </th>
                <th className="text-center text-xs text-slate-400 uppercase tracking-wider p-4">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {rankedProviders.map((provider, index) => {
                const winRate = provider.totalEntries > 0
                  ? ((Number(provider.wins) / provider.totalEntries) * 100).toFixed(0)
                  : 0;

                return (
                  <tr
                    key={provider.provider}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <RankBadge rank={index + 1} />
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-200">{provider.provider}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${Number(provider.wins) > 0 ? "text-amber-400" : "text-slate-500"}`}>
                        {provider.wins}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-medium ${Number(provider.podiums) > 0 ? "text-slate-300" : "text-slate-500"}`}>
                        {provider.podiums}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-400">
                      {provider.totalEntries}
                    </td>
                    <td className="p-4 text-center">
                      <AvgRankIndicator avgRank={provider.avgRanking} />
                    </td>
                    <td className="p-4 text-center">
                      <WinRateBar winRate={Number(winRate)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface TopProviderCardProps {
  provider: {
    provider: string;
    wins: number;
    podiums: number;
    totalEntries: number;
    avgRanking: number | null;
  };
  position: 1 | 2 | 3;
}

function TopProviderCard({ provider, position }: TopProviderCardProps) {
  const positionStyles = {
    1: {
      bg: "bg-gradient-to-br from-amber-900/50 to-yellow-900/30",
      border: "border-amber-500/50",
      icon: <Trophy className="text-amber-400" size={24} />,
      label: "1st Place",
    },
    2: {
      bg: "bg-gradient-to-br from-slate-700/50 to-slate-600/30",
      border: "border-slate-400/50",
      icon: <Medal className="text-slate-300" size={24} />,
      label: "2nd Place",
    },
    3: {
      bg: "bg-gradient-to-br from-amber-800/50 to-orange-900/30",
      border: "border-amber-600/50",
      icon: <Medal className="text-amber-600" size={24} />,
      label: "3rd Place",
    },
  };

  const styles = positionStyles[position];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-4 text-center`}>
      <div className="flex justify-center mb-2">{styles.icon}</div>
      <p className="text-xs text-slate-400 mb-1">{styles.label}</p>
      <p className="text-lg font-bold text-slate-100">{provider.provider}</p>
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex justify-center gap-4 text-xs">
          <div>
            <span className="text-amber-400 font-bold">{provider.wins}</span>
            <span className="text-slate-500 ml-1">wins</span>
          </div>
          <div>
            <span className="text-slate-300 font-bold">{provider.podiums}</span>
            <span className="text-slate-500 ml-1">podiums</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 font-bold">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 font-bold">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 text-slate-500 font-medium">
      {rank}
    </span>
  );
}

function AvgRankIndicator({ avgRank }: { avgRank: number | null }) {
  if (avgRank === null) return <span className="text-slate-600">-</span>;

  // Color based on average ranking (lower is better)
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

function WinRateBar({ winRate }: { winRate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          style={{ width: `${Math.min(winRate, 100)}%` }}
        />
      </div>
      <span className="text-xs text-slate-400">{winRate}%</span>
    </div>
  );
}
