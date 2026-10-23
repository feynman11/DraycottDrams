import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, Plus, X } from "lucide-react";
import { type WhiskyWithGathering } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TastingFormProps {
  whisky: WhiskyWithGathering;
  onSuccess?: () => void;
}

// Five-star picker shared by the add and edit forms
export function StarRating({ value, onChange, size = 24 }: { value: number; onChange: (value: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
          className={cn(
            "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value >= star ? "text-primary" : "text-subtle hover:text-muted-foreground"
          )}
        >
          <Star size={size} className={value >= star ? "fill-current" : ""} />
        </button>
      ))}
    </div>
  );
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
        <Label>Rating *</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <Label htmlFor="tasting-date">Tasting date *</Label>
        <Input id="tasting-date" type="date" value={tastingDate} onChange={(e) => setTastingDate(e.target.value)} required />
      </div>

      <div>
        <Label htmlFor="tasting-notes">Notes</Label>
        <Textarea
          id="tasting-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add your tasting notes…"
        />
      </div>

      <div>
        <Label>Flavour notes</Label>
        <div className="space-y-2">
          {tastingNotes.map((tn, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <span className="flex-1 text-sm text-foreground">{tn.note}</span>
              <span className="text-sm text-muted-foreground">Intensity {tn.intensity}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${tn.note}`} onClick={() => removeTastingNote(index)}>
                <X size={16} />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a flavour note…"
              aria-label="Flavour note"
              className="flex-1"
            />
            <Input
              type="number"
              min="1"
              max="5"
              value={newIntensity}
              onChange={(e) => setNewIntensity(parseInt(e.target.value) || 3)}
              aria-label="Intensity, 1 to 5"
              className="w-20"
            />
            <Button type="button" variant="secondary" size="icon" aria-label="Add flavour note" onClick={addTastingNote}>
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={createMutation.isPending || rating === 0} className="w-full">
        {createMutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Saving…
          </>
        ) : (
          "Save tasting"
        )}
      </Button>
    </form>
  );
}
