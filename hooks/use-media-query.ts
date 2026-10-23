import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query, for components that render different trees per breakpoint
 * (a portal can't be hidden with a responsive class on its trigger).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}
