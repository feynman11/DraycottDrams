"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Loader2, Trophy, Medal, Award, TrendingUp, Calendar, Wine, Home } from "lucide-react";
import { RankingBadge } from "@/components/whisky/ranking-badge";

export function MyResults() {
  const [selectedTab, setSelectedTab] = useState<"contributions" | "hosted">("contributions");

  const { data, isLoading } = api.member.getMyResults.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data?.member) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-amber-50 mb-1">My Results</h2>
          <p className="text-slate-400">
            View your whisky contributions and scores.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-400">
            Your account is not linked to a member profile yet.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Please contact an administrator to link your account.
          </p>
        </div>
      </div>
    );
  }

  const { member, contributions, hostedGatherings, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-amber-50 mb-1">My Results</h2>
        <p className="text-slate-400">
          Welcome back, <span className="text-amber-400">{member.name}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wine size={18} className="text-amber-400" />
            <span className="text-sm text-slate-400">Contributions</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.totalContributions}
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-amber-400" />
            <span className="text-sm text-slate-400">Wins</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {stats.wins}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Medal size={18} className="text-slate-300" />
            <span className="text-sm text-slate-400">Podiums</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.podiums}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-400" />
            <span className="text-sm text-slate-400">Avg Ranking</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.avgRanking !== null ? stats.avgRanking.toFixed(1) : "-"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home size={18} className="text-purple-400" />
            <span className="text-sm text-slate-400">Times Hosted</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {member.timesHosted}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedTab("contributions")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "contributions"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            My Contributions ({contributions.length})
          </button>
          <button
            onClick={() => setSelectedTab("hosted")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "hosted"
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Hosted Gatherings ({hostedGatherings.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === "contributions" ? (
        <div>
          {contributions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <p className="text-slate-400">No contributions found.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left p-3 text-slate-300 font-medium">Gathering</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Whisky</th>
                    <th className="text-left p-3 text-slate-300 font-medium hidden md:table-cell">Region</th>
                    <th className="text-center p-3 text-slate-300 font-medium">Ranking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {contributions.map((contribution) => (
                    <tr
                      key={contribution.id}
                      className={`hover:bg-slate-800/30 ${
                        contribution.ranking === 1 ? "bg-amber-900/10" : ""
                      }`}
                    >
                      <td className="p-3">
                        <div className="text-slate-200 font-medium">
                          G{contribution.gatheringNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(contribution.gatheringDate).toLocaleDateString()}
                        </div>
                        {contribution.gatheringTheme && (
                          <div className="text-xs text-slate-400 mt-1">
                            {contribution.gatheringTheme}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-slate-200 font-medium">
                          {contribution.distillery}
                        </div>
                        <div className="text-sm text-slate-400">
                          {contribution.variety}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contribution.abv}% ABV
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="text-slate-400 text-sm">
                          {contribution.region}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contribution.country}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {contribution.ranking !== null ? (
                          <RankingBadge ranking={contribution.ranking} size="md" />
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          {hostedGatherings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <p className="text-slate-400">No hosted gatherings found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hostedGatherings.map((gathering) => (
                <div
                  key={gathering.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-900/50 rounded-lg flex items-center justify-center">
                      <Home size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-200">
                        Gathering {gathering.number}
                      </div>
                      <div className="text-sm text-slate-400">
                        {new Date(gathering.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  {gathering.theme && (
                    <div className="text-sm text-amber-400 mt-2">
                      {gathering.theme}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Win Highlights */}
      {stats.wins > 0 && (
        <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border border-amber-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <Trophy size={20} />
            Winning Whiskies
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {contributions
              .filter((c) => c.ranking === 1)
              .map((win) => (
                <div
                  key={win.id}
                  className="bg-slate-900/50 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Trophy size={16} className="text-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 font-medium truncate">
                      {win.distillery} - {win.variety}
                    </div>
                    <div className="text-xs text-slate-400">
                      Gathering {win.gatheringNumber}
                      {win.gatheringTheme && ` - ${win.gatheringTheme}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
