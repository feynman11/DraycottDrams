"use client";

import { X, MapPin, Droplets, Calendar, Globe, Building2, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { api } from "@/lib/trpc-client";
import { useMemo } from "react";
import { type WhiskyWithGathering } from "@/lib/types";

interface DistilleryDetailProps {
  distillery: string;
  whiskies: WhiskyWithGathering[];
  onClose: () => void;
}

export function DistilleryDetail({ distillery, whiskies, onClose }: DistilleryDetailProps) {
  if (!distillery || whiskies.length === 0) return null;

  const firstWhisky = whiskies[0];
  const distilleryId = (firstWhisky as any).distilleryId || (firstWhisky as any).distillery?.id;
  
  // Fetch distillery details - try by ID first, then by name
  const { data: distilleryDetailsById } = api.distillery.getById.useQuery(
    { id: distilleryId },
    { enabled: !!distilleryId }
  );
  
  const { data: distilleriesList } = api.distillery.getAll.useQuery(
    { search: distillery, limit: 1 },
    { enabled: !distilleryDetailsById && !!distillery }
  );
  
  const distilleryDetails = distilleryDetailsById || distilleriesList?.[0];

  // Group whiskies by gathering for better display
  const whiskiesByGathering = useMemo(() => {
    return whiskies.reduce((acc, whisky) => {
      const key = whisky.gathering;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(whisky);
      return acc;
    }, {} as Record<number, WhiskyWithGathering[]>);
  }, [whiskies]);

  const gatherings = Object.keys(whiskiesByGathering)
    .map(Number)
    .sort((a, b) => a - b);

  const region = firstWhisky.region;
  const country = firstWhisky.country;

  // Calculate statistics
  const totalGatherings = gatherings.length;
  const totalWhiskies = whiskies.length;
  const dateRange = useMemo(() => {
    const dates = whiskies.map(w => new Date(w.date).getTime()).filter(Boolean);
    if (dates.length === 0) return null;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return { min: minDate, max: maxDate };
  }, [whiskies]);

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-slate-900/95 backdrop-blur-xl shadow-2xl border-l border-slate-700 transform transition-transform duration-300 z-[100] overflow-y-auto">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50"
        >
          <X size={20} />
        </button>

        <div className="h-56 w-full bg-gradient-to-br from-amber-900 to-slate-900 relative p-8 flex flex-col justify-end">
          <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
          <h4 className="text-amber-400 text-sm font-bold tracking-widest uppercase mb-2">{distillery}</h4>
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-3">
            <MapPin size={16} />
            <span>{region}, {country}</span>
            {distilleryDetails?.founded && (
              <>
                <span className="text-slate-500">•</span>
                <Building2 size={14} />
                <span>Founded {distilleryDetails.founded}</span>
              </>
            )}
          </div>
          {distilleryDetails?.description && (
            <p className="text-slate-300 text-sm mb-3 line-clamp-2">{distilleryDetails.description}</p>
          )}
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp size={14} />
              <span>{totalGatherings} {totalGatherings === 1 ? 'gathering' : 'gatherings'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets size={14} />
              <span>{totalWhiskies} {totalWhiskies === 1 ? 'whisky' : 'whiskies'}</span>
            </div>
            {dateRange && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{dateRange.min.getFullYear()} - {dateRange.max.getFullYear()}</span>
              </div>
            )}
          </div>
          {distilleryDetails?.website && (
            <a
              href={distilleryDetails.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs mt-2 transition-colors"
            >
              <Globe size={12} />
              <span>Visit Website</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>

        <div className="px-8 pt-8 pb-8 space-y-6">
          {gatherings.map((gathering) => {
            const gatheringWhiskies = whiskiesByGathering[gathering];
            const firstGatheringWhisky = gatheringWhiskies[0];
            const theme = firstGatheringWhisky.theme;
            const date = firstGatheringWhisky.date;
            const host = firstGatheringWhisky.host;

            return (
              <div key={gathering} className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                {/* Gathering Header */}
                <div className="mb-4 pb-3 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 font-medium">Gathering #{gathering}</p>
                      {host && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Users size={12} />
                          <span>{host}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar size={14} />
                      <span>
                        {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {theme && (
                    <p className="text-lg font-bold text-amber-400">{theme}</p>
                  )}
                </div>

                {/* Whiskies from this gathering */}
                <div className="space-y-3">
                  {gatheringWhiskies.map((whisky) => {
                    const age = whisky.age;
                    const type = whisky.type;
                    const tastingNotes = whisky.tastingNotes;
                    const flavourProfile = whisky.flavourProfile;
                    const description = whisky.description;

                    return (
                      <div key={whisky.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-200">{whisky.variety || 'No variety specified'}</p>
                            {whisky.name && whisky.name !== whisky.variety && (
                              <p className="text-xs text-slate-400 mt-0.5">{whisky.name}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Droplets size={12} className="text-amber-500" />
                                <span>{whisky.abv}% ABV</span>
                              </div>
                              {age && (
                                <div className="text-xs text-slate-400">
                                  {age} {age === 1 ? 'year' : 'years'} old
                                </div>
                              )}
                              {type && (
                                <div className="text-xs text-slate-400">
                                  {type}
                                </div>
                              )}
                              <div className="text-xs text-slate-500">
                                Provider: {whisky.provider}
                              </div>
                            </div>
                          </div>
                        </div>
                        {description && (
                          <p className="text-xs text-slate-300 mt-2">{description}</p>
                        )}
                        {whisky.notes && (
                          <p className="text-xs text-slate-400 mt-2 italic">{whisky.notes}</p>
                        )}
                        {tastingNotes && Array.isArray(tastingNotes) && tastingNotes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-1.5">Tasting Notes:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {tastingNotes.map((note, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-amber-900/30 text-amber-300 text-xs rounded border border-amber-800/50"
                                >
                                  {note}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {flavourProfile && typeof flavourProfile === 'object' && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-400 mb-2">Flavour Profile:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(flavourProfile).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                  <span className="text-xs text-slate-400 capitalize">{key}:</span>
                                  <div className="flex-1 mx-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-500"
                                      style={{ width: `${(value as number) * 20}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 w-6 text-right">{value as number}/5</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



