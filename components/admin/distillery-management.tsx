import { useState, useEffect } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchField } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { Plus, Building2 } from "lucide-react";
import { type Distillery } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { EditRow, Field, FormActions, FormCard, FormGrid, RowActions } from "./admin-ui";

interface DistilleryManagementProps {
  initialSearch?: string;
}

export function DistilleryManagement({ initialSearch }: DistilleryManagementProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");

  // Update search when initialSearch changes
  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Distillery>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: distilleries, isLoading, refetch } = api.distillery.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    limit: 1000,
  });

  const createMutation = api.distillery.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setEditForm({});
    },
  });

  const updateMutation = api.distillery.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = api.distillery.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirmId(null);
    },
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      name: "",
      country: "",
      region: "",
      coordinates: undefined,
      description: "",
      website: "",
      founded: undefined,
    });
  };

  const handleEdit = (distillery: Distillery) => {
    setEditingId(distillery.id);
    setEditForm({
      name: distillery.name || "",
      country: distillery.country || "",
      region: distillery.region || "",
      coordinates: distillery.coordinates || undefined,
      description: distillery.description || "",
      website: distillery.website || "",
      founded: distillery.founded || undefined,
    });
  };

  const handleSave = () => {
    if (isCreating) {
      createMutation.mutate({
        name: editForm.name || "",
        country: editForm.country || "",
        region: editForm.region || "",
        coordinates: editForm.coordinates ?? undefined,
        description: editForm.description ?? undefined,
        website: editForm.website ?? undefined,
        founded: editForm.founded ?? undefined,
      });
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...editForm,
        coordinates: editForm.coordinates ?? undefined,
        description: editForm.description ?? undefined,
        website: editForm.website ?? undefined,
        founded: editForm.founded ?? undefined,
      });
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

  // The create and edit forms are the same fields
  const distilleryFields = (
    <>
      <FormGrid>
        <Field label="Name *" htmlFor="distillery-name">
          <Input id="distillery-name" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
        </Field>
        <Field label="Country *" htmlFor="distillery-country">
          <Input id="distillery-country" value={editForm.country || ""} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
        </Field>
        <Field label="Region *" htmlFor="distillery-region">
          <Input id="distillery-region" value={editForm.region || ""} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} />
        </Field>
        <Field label="Founded" htmlFor="distillery-founded">
          <Input
            id="distillery-founded"
            type="number"
            value={editForm.founded || ""}
            onChange={(e) => setEditForm({ ...editForm, founded: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </Field>
        <Field label="Longitude" htmlFor="distillery-lng">
          <Input
            id="distillery-lng"
            type="number"
            step="any"
            value={editForm.coordinates?.[0] || ""}
            onChange={(e) => setEditForm({
              ...editForm,
              coordinates: e.target.value ? [parseFloat(e.target.value), editForm.coordinates?.[1] || 0] : undefined
            })}
          />
        </Field>
        <Field label="Latitude" htmlFor="distillery-lat">
          <Input
            id="distillery-lat"
            type="number"
            step="any"
            value={editForm.coordinates?.[1] || ""}
            onChange={(e) => setEditForm({
              ...editForm,
              coordinates: e.target.value ? [editForm.coordinates?.[0] || 0, parseFloat(e.target.value)] : undefined
            })}
          />
        </Field>
      </FormGrid>
      <Field label="Website" htmlFor="distillery-website" className="mt-4">
        <Input id="distillery-website" type="url" value={editForm.website || ""} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="https://…" />
      </Field>
      <Field label="Description" htmlFor="distillery-description" className="mt-4">
        <Textarea id="distillery-description" value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
      </Field>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        as="h2"
        title="Distilleries"
        description={`Distilleries are shared across all whiskies from the same house${distilleries ? ` (${distilleries.length})` : ""}.`}
        aside={
          <Button onClick={handleCreate} disabled={isCreating}>
            <Plus size={18} />
            Add distillery
          </Button>
        }
      />

      <SearchField
        placeholder="Search distilleries…"
        aria-label="Search distilleries"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="md:max-w-md"
      />

      {isCreating && (
        <FormCard title="New distillery">
          {distilleryFields}
          <FormActions
            onCancel={handleCancel}
            onSave={handleSave}
            pending={createMutation.isPending}
            disabled={!editForm.name || !editForm.country || !editForm.region}
            saveLabel="Create"
          />
        </FormCard>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card" aria-busy><SkeletonRows rows={8} cols={5} /></div>
      ) : !distilleries || distilleries.length === 0 ? (
        <EmptyState icon={<Building2 />} title="No distilleries found" description={searchTerm ? "Try a different search." : undefined} />
      ) : (
        <TableScroll>
          <Table>
            <TableHeader>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Region</th>
                <th>Coordinates</th>
                <th className="text-right!">Actions</th>
              </tr>
            </TableHeader>
            <TableBody>
              {distilleries.map((distillery) => (
                <TableRow key={distillery.id}>
                  {editingId === distillery.id ? (
                    <EditRow colSpan={5}>
                      {distilleryFields}
                      <FormActions onCancel={handleCancel} onSave={handleSave} pending={updateMutation.isPending} />
                    </EditRow>
                  ) : (
                    <>
                      <td className="font-medium text-foreground">{distillery.name}</td>
                      <td className="text-foreground">{distillery.country}</td>
                      <td className="text-muted-foreground">{distillery.region || <span className="text-warning">Missing</span>}</td>
                      <td className="tabular-nums text-muted-foreground">
                        {distillery.coordinates
                          ? `${distillery.coordinates[0].toFixed(4)}, ${distillery.coordinates[1].toFixed(4)}`
                          : <span className="text-warning">Missing</span>}
                      </td>
                      <td>
                        <RowActions
                          name={distillery.name}
                          confirming={deleteConfirmId === distillery.id}
                          deleting={deleteMutation.isPending}
                          onEdit={() => handleEdit(distillery)}
                          onDeleteRequest={() => setDeleteConfirmId(distillery.id)}
                          onDeleteConfirm={() => handleDelete(distillery.id)}
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
