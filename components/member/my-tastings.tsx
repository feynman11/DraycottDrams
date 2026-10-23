import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Loader2, Star, Edit2, Trash2, X, Save, Wine } from "lucide-react";
import { TastingForm, StarRating } from "./tasting-form";
import { type WhiskyWithGathering } from "@/lib/types";

export function MyTastings() {
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);
  const [editingTastingId, setEditingTastingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [selectedGatheringId, setSelectedGatheringId] = useState<string | "">("");

  const { data: tastings, isLoading, refetch } = api.tasting.getUserTastings.useQuery({
    limit: 1000,
    gatheringId: selectedGatheringId || undefined,
  });

  const { data: whiskies } = api.whisky.getAll.useQuery({ limit: 1000 });

  // Get unique gatherings from tastings for filter dropdown
  const uniqueGatherings = useMemo(() => {
    if (!tastings) return [];
    const gatheringMap = new Map();
    tastings.forEach((item) => {
      if (item.gathering && !gatheringMap.has(item.gathering.id)) {
        gatheringMap.set(item.gathering.id, item.gathering);
      }
    });
    return Array.from(gatheringMap.values()).sort((a, b) => {
      // Sort by date closest to today
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const now = Date.now();
      return Math.abs(dateA - now) - Math.abs(dateB - now);
    });
  }, [tastings]);

  const updateMutation = api.tasting.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTastingId(null);
    },
  });

  const deleteMutation = api.tasting.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleEdit = (tasting: any) => {
    setEditingTastingId(tasting.tasting.id);
    setEditRating(tasting.tasting.rating);
    setEditNotes(tasting.tasting.notes || "");
  };

  const handleSave = () => {
    if (!editingTastingId) return;
    updateMutation.mutate({
      id: editingTastingId,
      rating: editRating,
      notes: editNotes || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this tasting?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card" aria-busy><SkeletonRows rows={4} cols={3} /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader as="h2" title="My tastings" description="Add your scores and notes for whiskies you've tasted." />

      {/* Add New Tasting */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Add a tasting</h3>
        <div className="mb-4">
          <Label htmlFor="tasting-whisky">Whisky</Label>
          <Select
            id="tasting-whisky"
            value={selectedWhisky?.id || ""}
            onChange={(e) => {
              const whisky = whiskies?.find((w) => w.id === e.target.value);
              setSelectedWhisky(whisky || null);
            }}
          >
            <option value="">Select a whisky…</option>
            {whiskies?.map((whisky) => (
              <option key={whisky.id} value={whisky.id}>
                {whisky.distillery} - {whisky.variety} (Gathering #{whisky.gathering})
              </option>
            ))}
          </Select>
        </div>
        {selectedWhisky && (
          <TastingForm whisky={selectedWhisky} onSuccess={() => {
            setSelectedWhisky(null);
            refetch();
          }} />
        )}
      </div>

      {/* My Tastings List */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Tasting history</h3>
          {uniqueGatherings.length > 0 && (
            <Select aria-label="Gathering" value={selectedGatheringId} onChange={(e) => setSelectedGatheringId(e.target.value)} className="w-full sm:w-72">
              <option value="">All gatherings</option>
              {uniqueGatherings.map((gathering) => (
                <option key={gathering.id} value={gathering.id}>
                  Gathering #{gathering.number} - {new Date(gathering.date).toLocaleDateString()}
                  {gathering.theme && ` - ${gathering.theme}`}
                </option>
              ))}
            </Select>
          )}
        </div>
        {!tastings || tastings.length === 0 ? (
          <EmptyState
            icon={<Wine />}
            title={selectedGatheringId ? "No tastings for this gathering" : "You haven't added any tastings yet"}
          />
        ) : (
          <div className="space-y-3">
            {tastings.map((item) => (
              <div key={item.tasting.id} className="rounded-xl border border-border bg-card p-4">
                {editingTastingId === item.tasting.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Rating</Label>
                      <StarRating value={editRating} onChange={setEditRating} size={20} />
                    </div>
                    <div>
                      <Label htmlFor={`notes-${item.tasting.id}`}>Notes</Label>
                      <Textarea id={`notes-${item.tasting.id}`} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingTastingId(null)}>
                        <X size={16} />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {item.whisky.distillery} - {item.whisky.name || item.whisky.variety}
                        </h4>
                        {item.gathering && <Badge>Gathering #{item.gathering.number}</Badge>}
                      </div>
                      {item.gathering && (
                        <p className="mt-0.5 text-xs text-subtle">
                          {new Date(item.gathering.date).toLocaleDateString()}
                          {item.gathering.theme && ` • ${item.gathering.theme}`}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tasted on {new Date(item.tasting.tastingDate).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center gap-1" aria-label={`${item.tasting.rating} out of 5`}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            size={16}
                            className={item.tasting.rating >= value ? "fill-current text-primary" : "text-subtle"}
                          />
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">{item.tasting.rating}/5</span>
                      </div>
                      {item.tasting.notes && <p className="mt-2 text-sm text-foreground/90">{item.tasting.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Edit tasting" onClick={() => handleEdit(item)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Delete tasting" className="hover:text-destructive" onClick={() => handleDelete(item.tasting.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
