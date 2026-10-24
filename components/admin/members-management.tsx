import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, Shield, UserCheck, Users, Plus } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EditRow, Field, FormActions, FormCard, FormGrid, RowActions } from "./admin-ui";

export function MembersManagement() {
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [memberForm, setMemberForm] = useState<{ name: string; userId: string }>({ name: "", userId: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: users, isLoading, refetch: refetchUsers } = api.user.getAll.useQuery();
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = api.member.getAll.useQuery();
  const { data: gatherings } = api.gathering.getAll.useQuery();

  const updateStatusMutation = api.user.updateStatus.useMutation({
    onSuccess: () => {
      refetchUsers();
      setUpdatingUserId(null);
    },
    onError: () => {
      setUpdatingUserId(null);
    },
  });

  const createMemberMutation = api.member.create.useMutation({
    onSuccess: () => {
      refetchMembers();
      setIsCreatingMember(false);
      setMemberForm({ name: "", userId: "" });
    },
  });

  const updateMemberMutation = api.member.update.useMutation({
    onSuccess: () => {
      refetchMembers();
      setEditingMemberId(null);
      setMemberForm({ name: "", userId: "" });
    },
  });

  const deleteMemberMutation = api.member.delete.useMutation({
    onSuccess: () => {
      refetchMembers();
      setDeleteConfirmId(null);
    },
  });

  const handleToggleMember = (userId: string, currentMember: boolean) => {
    setUpdatingUserId(userId);
    updateStatusMutation.mutate({
      userId,
      member: !currentMember,
    });
  };

  const handleToggleAdmin = (userId: string, currentAdmin: boolean) => {
    setUpdatingUserId(userId);
    updateStatusMutation.mutate({
      userId,
      admin: !currentAdmin,
    });
  };

  const handleCreateMember = () => {
    setIsCreatingMember(true);
    setMemberForm({ name: "", userId: "" });
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      userId: member.userId || "",
    });
  };

  const handleSaveMember = () => {
    if (isCreatingMember) {
      createMemberMutation.mutate({
        name: memberForm.name,
        userId: memberForm.userId || undefined,
      });
    } else if (editingMemberId) {
      updateMemberMutation.mutate({
        id: editingMemberId,
        name: memberForm.name,
        userId: memberForm.userId || null,
      });
    }
  };

  const handleCancelMember = () => {
    setIsCreatingMember(false);
    setEditingMemberId(null);
    setMemberForm({ name: "", userId: "" });
  };

  const handleDeleteMember = (id: string) => {
    deleteMemberMutation.mutate({ id });
  };

  if (isLoading || membersLoading) {
    return <div className="rounded-xl border border-border bg-card" aria-busy><SkeletonRows rows={6} cols={5} /></div>;
  }

  // Calculate last hosts and next hosting
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate < today;
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }) || [];

  const futureGatherings = gatherings?.filter((g) => {
    if (!g.date) return false;
    const gatheringDate = new Date(g.date);
    gatheringDate.setHours(0, 0, 0, 0);
    return gatheringDate >= today;
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }) || [];

  // Get last hosts (most recent past gatherings)
  const lastHosts = pastGatherings.slice(0, 5).map((g) => ({
    member: g.host,
    gathering: g,
  }));

  // Get next hosting (upcoming future gatherings)
  const nextHosting = futureGatherings.slice(0, 5).map((g) => ({
    member: g.host,
    gathering: g,
  }));

  // The create and edit forms are the same fields
  const memberFields = (
    <FormGrid>
      <Field label="Name *" htmlFor="member-name">
        <Input id="member-name" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
      </Field>
      <Field label="Linked user (optional)" htmlFor="member-user">
        <Select id="member-user" value={memberForm.userId} onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}>
          <option value="">No user linked</option>
          {users?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.email}
            </option>
          ))}
        </Select>
      </Field>
    </FormGrid>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        as="h2"
        title="Members"
        description="Manage members and link them to signed-in users. Members can host gatherings."
        aside={
          <Button onClick={handleCreateMember} disabled={isCreatingMember}>
            <Plus size={18} />
            Add member
          </Button>
        }
      />

      {/* Last Hosts and Next Hosting */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <HostList title="Last hosts" items={lastHosts} empty="No past gatherings found." />
        <HostList title="Next hosting" items={nextHosting} empty="No upcoming gatherings scheduled." />
      </div>

      {isCreatingMember && (
        <FormCard title="New member">
          {memberFields}
          <FormActions onCancel={handleCancelMember} onSave={handleSaveMember} pending={createMemberMutation.isPending} disabled={!memberForm.name} saveLabel="Create" />
        </FormCard>
      )}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Members</h3>
        {!members || members.length === 0 ? (
          <EmptyState icon={<Users />} title="No members yet" action={<Button variant="outline" onClick={handleCreateMember}>Add the first member</Button>} />
        ) : (
          <TableScroll>
            <Table>
              <TableHeader>
                <tr>
                  <th>Name</th>
                  <th>Linked user</th>
                  <th className="text-center!">Times hosted</th>
                  <th>Last hosted</th>
                  <th className="text-right!">Actions</th>
                </tr>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    {editingMemberId === member.id ? (
                      <EditRow colSpan={5}>
                        {memberFields}
                        <FormActions onCancel={handleCancelMember} onSave={handleSaveMember} pending={updateMemberMutation.isPending} />
                      </EditRow>
                    ) : (
                      <>
                        <td className="font-medium text-foreground">{member.name}</td>
                        <td>
                          {member.user ? (
                            <span className="inline-flex items-center gap-2 text-foreground">
                              {member.user.image && (
                                <img src={member.user.image} alt="" className="h-6 w-6 rounded-full ring-1 ring-border" />
                              )}
                              {member.user.name || member.user.email}
                            </span>
                          ) : (
                            <span className="text-subtle">Not linked</span>
                          )}
                        </td>
                        <td className="text-center tabular-nums text-foreground">{member.timesHosted}</td>
                        <td className="text-muted-foreground">
                          {member.lastHosted ? formatDate(member.lastHosted) : "Never"}
                        </td>
                        <td>
                          <RowActions
                            name={member.name}
                            confirming={deleteConfirmId === member.id}
                            deleting={deleteMemberMutation.isPending}
                            onEdit={() => handleEditMember(member)}
                            onDeleteRequest={() => setDeleteConfirmId(member.id)}
                            onDeleteConfirm={() => handleDeleteMember(member.id)}
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
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Users</h3>
        {!users || users.length === 0 ? (
          <EmptyState icon={<Users />} title="No users have signed in yet" />
        ) : (
          <TableScroll>
            <Table>
              <TableHeader>
                <tr>
                  <th>User</th>
                  <th className="text-center!">Member</th>
                  <th className="text-center!">Admin</th>
                  <th>Joined</th>
                  <th>Last login</th>
                </tr>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const updating = updatingUserId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt="" className="h-9 w-9 rounded-full ring-1 ring-border" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              <Users size={16} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{user.name || "No name"}</div>
                            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <RoleToggle
                          on={user.member}
                          onLabel="Member"
                          offLabel="Not a member"
                          onIcon={<CheckCircle2 />}
                          offIcon={<XCircle />}
                          tone="success"
                          pending={updating}
                          onClick={() => handleToggleMember(user.id, user.member)}
                        />
                      </td>
                      <td className="text-center">
                        <RoleToggle
                          on={user.admin}
                          onLabel="Admin"
                          offLabel="Not an admin"
                          onIcon={<Shield />}
                          offIcon={<UserCheck />}
                          tone="primary"
                          pending={updating}
                          onClick={() => handleToggleAdmin(user.id, user.admin)}
                        />
                      </td>
                      <td className="text-muted-foreground">
                        {user.createdAt ? formatDate(user.createdAt) : "N/A"}
                      </td>
                      <td className="text-muted-foreground">
                        {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                      </td>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </section>
    </div>
  );
}

function HostList({ title, items, empty }: { title: string; items: { member: { name: string } | null; gathering: { id: string; number: number; date: Date | null } }[]; empty: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={item.gathering.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{item.member?.name || "Unknown"}</div>
                <div className="text-xs text-muted-foreground">
                  Gathering {item.gathering.number} · {item.gathering.date ? formatDate(item.gathering.date) : "—"}
                </div>
              </div>
              <span className="text-xs tabular-nums text-subtle">#{index + 1}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface RoleToggleProps {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  tone: "success" | "primary";
  pending: boolean;
  onClick: () => void;
}

function RoleToggle({ on, onLabel, offLabel, onIcon, offIcon, tone, pending, onClick }: RoleToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={on}
      className={cn(
        "touch-exempt inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 [&_svg]:size-3.5",
        on
          ? tone === "success" ? "bg-success/15 text-success hover:bg-success/25" : "bg-primary/15 text-primary hover:bg-primary/25"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {pending ? <Loader2 className="animate-spin" /> : on ? onIcon : offIcon}
      {on ? onLabel : offLabel}
    </button>
  );
}
