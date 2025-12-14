"use client";

import { GlassWater, Map, List, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";

interface HeaderProps {
  viewMode: 'map' | 'library';
  onViewModeChange: (mode: 'map' | 'library') => void;
}

export function Header({ viewMode, onViewModeChange }: HeaderProps) {
  const { data: session, status } = useSession();

  return (
    <header className="flex-none h-16 bg-slate-900 border-b border-amber-900/30 flex items-center justify-between px-6 shadow-lg z-20 relative">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-600/20 rounded-full border border-amber-600/50">
          <GlassWater className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-amber-50 tracking-wide">Draycott Drams</h1>
          <p className="text-xs text-amber-500/80 uppercase tracking-widest">Est. 2023</p>
        </div>
      </div>

      <nav className="flex items-center gap-4">
        <Button
          variant={viewMode === 'map' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('map')}
          className={viewMode === 'map' ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
        >
          <Map size={18} className="mr-2" />
          <span className="hidden sm:inline">World Map</span>
        </Button>
        <Button
          variant={viewMode === 'library' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('library')}
          className={viewMode === 'library' ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
        >
          <List size={18} className="mr-2" />
          <span className="hidden sm:inline">Library</span>
        </Button>

        <div className="w-px h-8 bg-slate-700 mx-2" />

        {status === 'loading' ? (
          <div className="w-8 h-8 bg-slate-700 rounded-full animate-pulse" />
        ) : session?.user ? (
          <div className="flex items-center gap-2">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-8 h-8 rounded-full"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-slate-400 hover:text-slate-200"
            >
              <LogOut size={18} />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signIn('google')}
            className="text-slate-400 hover:text-slate-200"
          >
            <User size={18} className="mr-2" />
            Sign In
          </Button>
        )}
      </nav>
    </header>
  );
}
