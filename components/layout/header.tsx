import { Map, Building2, Droplets, User, LogOut, Users, Menu, X, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

export function Header() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = useLocation({ select: (location) => location.pathname });

  const signIn = () =>
    authClient.signIn.social({ provider: "google", callbackURL: window.location.href });
  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMembersPage = pathname === "/members";
  const isMapPage = pathname === "/map" || pathname === "/";
  const isWhiskiesPage = pathname === "/library";
  const isDistilleriesPage = pathname === "/distilleries";
  const isWinnersPage = pathname === "/winners";

  return (
    <header className="flex-none h-16 bg-slate-900 border-b border-amber-900/30 flex items-center justify-between px-6 shadow-lg z-20 relative">
      <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
        <div className="flex-shrink-0">
          <img
            src="/logo.png"
            alt="Draycott Drambusters Logo"
            className="h-10 w-auto"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-amber-50 tracking-wide whitespace-nowrap">Draycott Drambusters</h1>
          <p className="hidden sm:block text-xs text-amber-500/80 uppercase tracking-widest">Est. 2019</p>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-4 flex-shrink-0 ml-6">
        <Button
          variant={isMapPage ? 'default' : 'ghost'}
          size="sm"
          className={isMapPage ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
          asChild
        >
          <Link to="/map" className="flex items-center">
            <Map size={18} className="mr-2" />
            <span>World Map</span>
          </Link>
        </Button>
        <Button
          variant={isDistilleriesPage ? 'default' : 'ghost'}
          size="sm"
          className={isDistilleriesPage ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
          asChild
        >
          <Link to="/distilleries" className="flex items-center">
            <Building2 size={18} className="mr-2" />
            <span>Distilleries</span>
          </Link>
        </Button>
        <Button
          variant={isWhiskiesPage ? 'default' : 'ghost'}
          size="sm"
          className={isWhiskiesPage ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
          asChild
        >
          <Link to="/library" className="flex items-center">
            <Droplets size={18} className="mr-2" />
            <span>Whiskies</span>
          </Link>
        </Button>
        <Button
          variant={isWinnersPage ? 'default' : 'ghost'}
          size="sm"
          className={isWinnersPage ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
          asChild
        >
          <Link to="/winners" className="flex items-center">
            <Trophy size={18} className="mr-2" />
            <span>Winners</span>
          </Link>
        </Button>

        {session?.user?.admin || session?.user?.member ? (
          <Button
            variant={isMembersPage ? 'default' : 'ghost'}
            size="sm"
            className={isMembersPage ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
            asChild
          >
            <Link to="/members" className="flex items-center">
              <Users size={18} className="mr-2" />
              <span>Members</span>
            </Link>
          </Button>
        ) : null}

        <div className="w-px h-8 bg-slate-700 mx-2" />

        {isPending ? (
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
            onClick={() => signIn()}
            className="text-slate-400 hover:text-slate-200"
          >
            <User size={18} className="mr-2" />
            <span>Sign In</span>
          </Button>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-slate-200"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-slate-900 border-b border-amber-900/30 shadow-lg z-30 md:hidden">
          <nav className="flex flex-col py-2">
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isMapPage
                  ? 'bg-amber-700/20 text-amber-400 border-l-2 border-amber-700'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Map size={18} />
              <span>World Map</span>
            </Link>
            <Link
              to="/distilleries"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isDistilleriesPage
                  ? 'bg-amber-700/20 text-amber-400 border-l-2 border-amber-700'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Building2 size={18} />
              <span>Distilleries</span>
            </Link>
            <Link
              to="/library"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isWhiskiesPage
                  ? 'bg-amber-700/20 text-amber-400 border-l-2 border-amber-700'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Droplets size={18} />
              <span>Whiskies</span>
            </Link>
            <Link
              to="/winners"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isWinnersPage
                  ? 'bg-amber-700/20 text-amber-400 border-l-2 border-amber-700'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Trophy size={18} />
              <span>Winners</span>
            </Link>
            {session?.user?.admin || session?.user?.member ? (
              <Link
                to="/members"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isMembersPage
                    ? 'bg-amber-700/20 text-amber-400 border-l-2 border-amber-700'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Users size={18} />
                <span>Members</span>
              </Link>
            ) : null}
            <div className="w-full h-px bg-slate-700 my-2" />
            {session?.user ? (
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-6 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  signIn();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-6 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <User size={18} />
                <span>Sign In</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
