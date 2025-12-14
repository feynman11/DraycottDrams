"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { WhiskyCard } from "./whisky-card";

export function WhiskyLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
    search: searchTerm || undefined,
    region: selectedRegion || undefined,
    type: selectedType || undefined,
  });

  const { data: stats } = api.whisky.getStats.useQuery();

  const regions = stats?.regions || [];
  const types = stats?.types || [];

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-amber-500">Loading whisky library...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-6 lg:p-12 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-amber-50 border-b border-slate-800 pb-4">
          The Library
        </h2>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search whiskies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.region} value={region.region}>
                  {region.region} ({region.count})
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Types</option>
              {types.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.type} ({type.count})
                </option>
              ))}
            </select>

            {(searchTerm || selectedRegion || selectedType) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRegion("");
                  setSelectedType("");
                }}
                className="text-slate-400 border-slate-700 hover:bg-slate-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Whisky Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {whiskies?.map((whisky) => (
            <WhiskyCard key={whisky.id} whisky={whisky} />
          ))}
        </div>

        {whiskies?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No whiskies found matching your criteria.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedRegion("");
                setSelectedType("");
              }}
              className="mt-4 text-slate-400 border-slate-700 hover:bg-slate-800"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
