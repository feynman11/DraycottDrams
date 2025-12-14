"use client";

import { MessageCircle } from "lucide-react";

interface AIButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AIButton({ onClick, isOpen }: AIButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute bottom-6 right-6 z-30 p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center ${
        isOpen
          ? 'bg-amber-700 text-white shadow-amber-900/40'
          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
      }`}
      title="Ask the AI Sommelier"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}
