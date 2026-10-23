import { Edit2, Loader2, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared pieces for the admin tables: a form card, labelled fields, save/cancel and row actions.

export function FormCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-primary/30 bg-card p-4 shadow-sm animate-rise-in md:p-6", className)}>
      <h3 className="mb-4 text-base font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

interface FormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  disabled?: boolean;
  saveLabel?: string;
}

export function FormActions({ onCancel, onSave, pending, disabled, saveLabel = "Save" }: FormActionsProps) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
        <X size={16} />
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={pending || disabled}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saveLabel}
      </Button>
    </div>
  );
}

interface RowActionsProps {
  /** What the delete confirmation asks about, e.g. "Delete Ardbeg?" */
  name: string;
  confirming: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

// Edit + delete with an inline two-step confirm that keeps the row's height stable
export function RowActions({ name, confirming, deleting, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }: RowActionsProps) {
  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        <span className="text-xs text-muted-foreground">Delete {name}?</span>
        <Button variant="destructive" size="sm" className="h-8 px-2.5" onClick={onDeleteConfirm} disabled={deleting}>
          {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
        </Button>
        <Button variant="ghost" size="icon-sm" className="h-8 w-8" aria-label="Keep it" onClick={onDeleteCancel} disabled={deleting}>
          <X size={16} />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon-sm" className="h-8 w-8" aria-label={`Edit ${name}`} onClick={onEdit}>
        <Edit2 size={16} />
      </Button>
      <Button variant="ghost" size="icon-sm" className="h-8 w-8 hover:text-destructive" aria-label={`Delete ${name}`} onClick={onDeleteRequest}>
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

// An inline edit form that spans the whole row
export function EditRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <td colSpan={colSpan} className="bg-muted/40 p-4!">
      {children}
    </td>
  );
}
