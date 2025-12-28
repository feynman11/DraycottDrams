"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Plus, X } from "lucide-react";
import { type WhiskyWithGathering } from "@/lib/types";

interface TastingFormProps {
  whisky: WhiskyWithGathering;
  onSuccess?: () => void;
}

export function TastingForm({ whisky, onSuccess }: TastingFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [tastingDate, setTastingDate] = useState(new Date().toISOString().split('T')[0]);
  const [tastingNotes, setTastingNotes] = useState<Array<{ note: string; intensity: number }>>([]);
  const [newNote, setNewNote] = useState("");
  const [newIntensity, setNewIntensity] = useState(3);

  const createMutation = api.tasting.create.useMutation({
    onSuccess: () => {
      setRating(0);
      setNotes("");
      setTastingDate(new Date().toISOString().split('T')[0]);
      setTastingNotes([]);
      setNewNote("");
      setNewIntensity(3);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    createMutation.mutate({
      whiskyId: whisky.id,
      rating,
      notes: notes || undefined,
      tastingDate: new Date(tastingDate),
      tastingNotes: tastingNotes.length > 0 ? tastingNotes : undefined,
    });
  };

  const addTastingNote = () => {
    if (newNote.trim()) {
      setTastingNotes([...tastingNotes, { note: newNote, intensity: newIntensity }]);
      setNewNote("");
      setNewIntensity(3);
    }
  };

  const removeTastingNote = (index: number) => {
    setTastingNotes(tastingNotes.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Rating *
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`p-2 rounded transition-colors ${
                rating >= value
                  ? "text-amber-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Star
                size={24}
                className={rating >= value ? "fill-current" : ""}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Tasting Date *
        </label>
        <input
          type="date"
          value={tastingDate}
          onChange={(e) => setTastingDate(e.target.value)}
          required
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Add your tasting notes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Flavour Notes
        </label>
        <div className="space-y-2">
          {tastingNotes.map((tn, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-slate-800 rounded"
            >
              <span className="flex-1 text-slate-200 text-sm">{tn.note}</span>
              <span className="text-slate-400 text-sm">Intensity: {tn.intensity}</span>
              <button
                type="button"
                onClick={() => removeTastingNote(index)}
                className="text-red-400 hover:text-red-300"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add flavour note..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="number"
              min="1"
              max="5"
              value={newIntensity}
              onChange={(e) => setNewIntensity(parseInt(e.target.value) || 3)}
              className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="1-5"
            />
            <Button
              type="button"
              onClick={addTastingNote}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={createMutation.isPending || rating === 0}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
      >
        {createMutation.isPending ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Tasting"
        )}
      </Button>
    </form>
  );
}

