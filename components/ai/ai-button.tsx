import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

// Floating sommelier launcher; sits above the mobile tab bar
export function AIButton({ onClick, isOpen }: AIButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close the AI sommelier" : "Ask the AI sommelier"}
      aria-expanded={isOpen}
      className={cn(
        "fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-[transform,background-color,box-shadow] duration-(--duration-base) ease-(--ease-spring) hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 md:right-6",
        "bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom)+1rem)] md:bottom-6",
        isOpen ? "bg-accent text-foreground" : "bg-primary shadow-glow"
      )}
    >
      {isOpen ? <X size={20} /> : <Sparkles size={20} />}
    </button>
  );
}
