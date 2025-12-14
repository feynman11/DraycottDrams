import React from 'react';
import { X, MapPin, Droplets, Banknote, Calendar } from 'lucide-react';
import { Whisky } from '../types';
import { FlavorRadar } from './FlavorRadar';

interface Props {
  whisky: Whisky | null;
  onClose: () => void;
}

export const WhiskyDetail: React.FC<Props> = ({ whisky, onClose }) => {
  if (!whisky) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-slate-900/95 backdrop-blur-xl shadow-2xl border-l border-slate-700 transform transition-transform duration-300 z-40 overflow-y-auto">
      <div className="relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50"
        >
          <X size={20} />
        </button>

        <div className="h-48 w-full bg-gradient-to-br from-amber-900 to-slate-900 relative p-8 flex flex-col justify-end">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
            <h4 className="text-amber-400 text-sm font-bold tracking-widest uppercase mb-1">{whisky.distillery}</h4>
            <h2 className="text-4xl font-serif font-bold text-white shadow-sm">{whisky.name}</h2>
        </div>

        <div className="p-8 space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
                    <MapPin className="text-amber-500" size={20} />
                    <div>
                        <p className="text-xs text-slate-400">Region</p>
                        <p className="text-sm font-bold text-slate-200">{whisky.region}, {whisky.country}</p>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
                    <Droplets className="text-amber-500" size={20} />
                    <div>
                        <p className="text-xs text-slate-400">ABV / Type</p>
                        <p className="text-sm font-bold text-slate-200">{whisky.abv}% • {whisky.type}</p>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
                    <Calendar className="text-amber-500" size={20} />
                    <div>
                        <p className="text-xs text-slate-400">Age Statement</p>
                        <p className="text-sm font-bold text-slate-200">{whisky.age ? `${whisky.age} Years` : 'NAS'}</p>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
                    <Banknote className="text-amber-500" size={20} />
                    <div>
                        <p className="text-xs text-slate-400">Price Range</p>
                        <p className="text-sm font-bold text-slate-200">{whisky.priceRange}</p>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div>
                <h3 className="text-lg font-bold text-amber-500 mb-2 border-b border-slate-800 pb-2">Sommelier Notes</h3>
                <p className="text-slate-300 leading-relaxed font-light">{whisky.description}</p>
            </div>

            {/* Tasting Tags */}
            <div>
                <h3 className="text-lg font-bold text-amber-500 mb-3 border-b border-slate-800 pb-2">Tasting Profile</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                    {whisky.tastingNotes.map(note => (
                        <span key={note} className="px-3 py-1 bg-slate-800 text-slate-200 rounded-full text-xs border border-slate-700">
                            {note}
                        </span>
                    ))}
                </div>
                <FlavorRadar data={whisky.flavorProfile} />
            </div>
        </div>
      </div>
    </div>
  );
};