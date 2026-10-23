import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { BookOpen, Plus } from "lucide-react";
import { type WhiskyWithGathering } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { EditRow, Field, FormActions, FormCard, FormGrid, RowActions } from "./admin-ui";

export function LibraryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WhiskyWithGathering & { distilleryId: string; gatheringId: string }>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: whiskies, isLoading, refetch } = api.whisky.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    limit: 1000,
  });

  const { data: distilleries } = api.distillery.getAll.useQuery({ limit: 1000 });
  const { data: gatherings } = api.gathering.getAll.useQuery();

  const createMutation = api.whisky.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setEditForm({});
    },
  });

  const updateMutation = api.whisky.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = api.whisky.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirmId(null);
    },
  });

  const handleEdit = (whisky: any) => {
    setEditingId(whisky.id);
    setEditForm({
      distilleryId: whisky.distilleryId || "",
      gatheringId: whisky.gatheringId || "",
      provider: whisky.provider || "",
      variety: whisky.variety || "",
      abv: whisky.abv?.toString() || "",
      notes: whisky.notes || "",
      name: whisky.name || "",
      type: whisky.type || "",
      age: whisky.age || undefined,
      priceRange: whisky.priceRange || "",
      description: whisky.description || "",
      flavourProfile: whisky.flavourProfile || undefined,
      imageUrl: whisky.imageUrl || "",
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      distilleryId: "",
      gatheringId: "",
      provider: "",
      variety: "",
      abv: "",
      notes: "",
    });
  };

  const handleSave = () => {
    if (isCreating) {
      if (!editForm.distilleryId || !editForm.gatheringId || !editForm.provider || !editForm.variety || !editForm.abv) {
        return;
      }
      createMutation.mutate({
        distilleryId: editForm.distilleryId,
        gatheringId: editForm.gatheringId,
        provider: editForm.provider,
        variety: editForm.variety,
        abv: editForm.abv,
        notes: editForm.notes || undefined,
        name: editForm.name || undefined,
        type: editForm.type || undefined,
        age: editForm.age || undefined,
        priceRange: editForm.priceRange || undefined,
        description: editForm.description || undefined,
        flavourProfile: editForm.flavourProfile || undefined,
        imageUrl: editForm.imageUrl || undefined,
      });
    } else if (editingId) {
      const updateData: any = {
        id: editingId,
        distilleryId: editForm.distilleryId,
        gatheringId: editForm.gatheringId,
        provider: editForm.provider,
        variety: editForm.variety,
        abv: editForm.abv,
        notes: editForm.notes || undefined,
        name: editForm.name || undefined,
        type: editForm.type || undefined,
        age: editForm.age || undefined,
        priceRange: editForm.priceRange || undefined,
        description: editForm.description || undefined,
        flavourProfile: editForm.flavourProfile || undefined,
        imageUrl: editForm.imageUrl || undefined,
      };
      // Convert null to undefined for optional fields
      if (updateData.notes === null) updateData.notes = undefined;
      updateMutation.mutate(updateData);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const incomplete = !editForm.distilleryId || !editForm.gatheringId || !editForm.provider || !editForm.variety || !editForm.abv;

  // The create and edit forms are the same fields
  const whiskyFields = (
    <>
      <FormGrid>
        <Field label="Distillery *" htmlFor="whisky-distillery">
          <Select id="whisky-distillery" value={editForm.distilleryId || ""} onChange={(e) => setEditForm({ ...editForm, distilleryId: e.target.value })}>
            <option value="">Select a distillery…</option>
            {distilleries?.map((distillery) => (
              <option key={distillery.id} value={distillery.id}>
                {distillery.name} ({distillery.region}, {distillery.country})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gathering *" htmlFor="whisky-gathering">
          <Select id="whisky-gathering" value={editForm.gatheringId || ""} onChange={(e) => setEditForm({ ...editForm, gatheringId: e.target.value })}>
            <option value="">Select a gathering…</option>
            {gatherings?.map((gathering) => (
              <option key={gathering.id} value={gathering.id}>
                #{gathering.number} - {gathering.host?.name || "Unknown"} ({gathering.date ? new Date(gathering.date).toLocaleDateString() : ""})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Provider *" htmlFor="whisky-provider">
          <Input id="whisky-provider" value={editForm.provider || ""} onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })} />
        </Field>
        <Field label="Variety *" htmlFor="whisky-variety">
          <Input id="whisky-variety" value={editForm.variety || ""} onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })} />
        </Field>
        <Field label="ABV *" htmlFor="whisky-abv">
          <Input id="whisky-abv" inputMode="decimal" value={editForm.abv || ""} onChange={(e) => setEditForm({ ...editForm, abv: e.target.value })} placeholder="e.g. 46.0" />
        </Field>
      </FormGrid>
      <Field label="Notes" htmlFor="whisky-notes" className="mt-4">
        <Textarea id="whisky-notes" value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
      </Field>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        as="h2"
        title="Whiskies"
        description={`Edit and manage whisky data in the library${whiskies ? ` (${whiskies.length})` : ""}.`}
        aside={
          <Button onClick={handleCreate} disabled={isCreating}>
            <Plus size={18} />
            Add whisky
          </Button>
        }
      />

      {isCreating && (
        <FormCard title="New whisky">
          {whiskyFields}
          <FormActions onCancel={handleCancel} onSave={handleSave} pending={createMutation.isPending} disabled={incomplete} saveLabel="Create" />
        </FormCard>
      )}

      <SearchField
        placeholder="Search by name, country or region…"
        aria-label="Search whiskies"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="md:max-w-md"
      />

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card" aria-busy><SkeletonRows rows={8} cols={5} /></div>
      ) : !whiskies || whiskies.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="No whiskies found" description={searchTerm ? "Try a different search." : undefined} />
      ) : (
        <TableScroll>
          <Table>
            <TableHeader>
              <tr>
                <th>Distillery</th>
                <th>Variety</th>
                <th>Region</th>
                <th>Gathering</th>
                <th className="text-right!">Actions</th>
              </tr>
            </TableHeader>
            <TableBody>
              {whiskies.map((whisky) => (
                <TableRow key={whisky.id}>
                  {editingId === whisky.id ? (
                    <EditRow colSpan={5}>
                      {whiskyFields}
                      <FormActions onCancel={handleCancel} onSave={handleSave} pending={updateMutation.isPending} />
                    </EditRow>
                  ) : (
                    <>
                      <td className="font-medium text-foreground">{whisky.distillery}</td>
                      <td className="text-foreground">{whisky.variety}</td>
                      <td className="text-muted-foreground">{whisky.region}</td>
                      <td className="tabular-nums text-muted-foreground">#{whisky.gathering}</td>
                      <td>
                        <RowActions
                          name={`${whisky.distillery} ${whisky.variety}`}
                          confirming={deleteConfirmId === whisky.id}
                          deleting={deleteMutation.isPending}
                          onEdit={() => handleEdit(whisky)}
                          onDeleteRequest={() => setDeleteConfirmId(whisky.id)}
                          onDeleteConfirm={() => handleDelete(whisky.id)}
                          onDeleteCancel={() => setDeleteConfirmId(null)}
                        />
                      </td>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      )}
    </div>
  );
}
