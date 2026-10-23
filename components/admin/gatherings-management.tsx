import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { Plus, Calendar } from "lucide-react";
import { EditRow, Field, FormActions, FormCard, FormGrid, RowActions } from "./admin-ui";

export function GatheringsManagement() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<{ number: number; dateString: string; hostId: string; theme: string }>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: gatherings, isLoading, refetch } = api.gathering.getAll.useQuery();
  const { data: members } = api.member.getAll.useQuery();

  const createMutation = api.gathering.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setEditForm({});
    },
  });

  const updateMutation = api.gathering.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = api.gathering.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirmId(null);
    },
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      number: undefined,
      dateString: new Date().toISOString().split('T')[0],
      hostId: "",
      theme: "",
    });
  };

  const handleEdit = (gathering: any) => {
    setEditingId(gathering.id);
    setEditForm({
      number: gathering.number,
      dateString: gathering.date ? new Date(gathering.date).toISOString().split('T')[0] : "",
      hostId: gathering.hostId || "",
      theme: gathering.theme || "",
    });
  };

  const handleSave = () => {
    if (isCreating) {
      if (!editForm.number || !editForm.dateString || !editForm.hostId) return;
      createMutation.mutate({
        number: editForm.number,
        date: new Date(editForm.dateString),
        hostId: editForm.hostId,
        theme: editForm.theme || undefined,
      });
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        number: editForm.number,
        date: editForm.dateString ? new Date(editForm.dateString) : undefined,
        hostId: editForm.hostId,
        theme: editForm.theme || undefined,
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

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card" aria-busy><SkeletonRows rows={6} cols={5} /></div>;
  }

  // Split gatherings into past and future
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate < today;
  }) || [];

  const futureGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate >= today;
  }) || [];

  // The create and edit forms are the same fields
  const gatheringFields = (
    <FormGrid>
      <Field label="Number *" htmlFor="gathering-number">
        <Input
          id="gathering-number"
          type="number"
          value={editForm.number || ""}
          onChange={(e) => setEditForm({ ...editForm, number: parseInt(e.target.value) || undefined })}
        />
      </Field>
      <Field label="Date *" htmlFor="gathering-date">
        <Input id="gathering-date" type="date" value={editForm.dateString || ""} onChange={(e) => setEditForm({ ...editForm, dateString: e.target.value })} />
      </Field>
      <Field label="Host *" htmlFor="gathering-host">
        <Select id="gathering-host" value={editForm.hostId || ""} onChange={(e) => setEditForm({ ...editForm, hostId: e.target.value })}>
          <option value="">Select a member…</option>
          {members?.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Theme" htmlFor="gathering-theme">
        <Input id="gathering-theme" value={editForm.theme || ""} onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })} />
      </Field>
    </FormGrid>
  );

  const renderGatheringsTable = (gatheringsList: typeof gatherings, empty: string) => {
    if (!gatheringsList || gatheringsList.length === 0) {
      return <EmptyState icon={<Calendar />} title={empty} className="py-8" />;
    }

    return (
      <TableScroll>
        <Table>
          <TableHeader>
            <tr>
              <th>Number</th>
              <th>Date</th>
              <th>Host</th>
              <th>Theme</th>
              <th className="text-right!">Actions</th>
            </tr>
          </TableHeader>
          <TableBody>
            {gatheringsList.map((gathering) => (
              <TableRow key={gathering.id}>
                {editingId === gathering.id ? (
                  <EditRow colSpan={5}>
                    {gatheringFields}
                    <FormActions onCancel={handleCancel} onSave={handleSave} pending={updateMutation.isPending} />
                  </EditRow>
                ) : (
                  <>
                    <td className="font-medium tabular-nums text-foreground">#{gathering.number}</td>
                    <td className="tabular-nums text-foreground">
                      {gathering.date ? new Date(gathering.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-foreground">{gathering.host?.name || "—"}</td>
                    <td className="text-muted-foreground">{gathering.theme || "—"}</td>
                    <td>
                      <RowActions
                        name={`gathering ${gathering.number}`}
                        confirming={deleteConfirmId === gathering.id}
                        deleting={deleteMutation.isPending}
                        onEdit={() => handleEdit(gathering)}
                        onDeleteRequest={() => setDeleteConfirmId(gathering.id)}
                        onDeleteConfirm={() => handleDelete(gathering.id)}
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
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        as="h2"
        title="Gatherings"
        description={`Each gathering can have multiple whiskies${gatherings ? ` (${gatherings.length})` : ""}.`}
        aside={
          <Button onClick={handleCreate} disabled={isCreating}>
            <Plus size={18} />
            Add gathering
          </Button>
        }
      />

      {isCreating && (
        <FormCard title="New gathering">
          {gatheringFields}
          <FormActions
            onCancel={handleCancel}
            onSave={handleSave}
            pending={createMutation.isPending}
            disabled={!editForm.number || !editForm.dateString || !editForm.hostId}
            saveLabel="Create"
          />
        </FormCard>
      )}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Upcoming</h3>
        {renderGatheringsTable(futureGatherings, "No upcoming gatherings scheduled")}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Past</h3>
        {renderGatheringsTable(pastGatherings, "No past gatherings")}
      </section>
    </div>
  );
}
