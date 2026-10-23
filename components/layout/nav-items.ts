import { Building2, Droplets, Map, Trophy, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: "/map" | "/distilleries" | "/library" | "/winners" | "/members";
  label: string;
  /** Shorter label for the mobile bar */
  short?: string;
  icon: LucideIcon;
  /** Only members and admins see this destination */
  membersOnly?: boolean;
}

// The one list behind the header links and the mobile bar
export const NAV_ITEMS: NavItem[] = [
  { to: "/map", label: "World Map", short: "Map", icon: Map },
  { to: "/distilleries", label: "Distilleries", icon: Building2 },
  { to: "/library", label: "Whiskies", icon: Droplets },
  { to: "/winners", label: "Winners", icon: Trophy },
  { to: "/members", label: "Members", icon: Users, membersOnly: true },
];

export const isActivePath = (pathname: string, to: NavItem["to"]) =>
  pathname === to || (to === "/map" && pathname === "/");
