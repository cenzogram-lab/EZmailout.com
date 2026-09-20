import type { AudiencePresetShared, VerifiedAddress } from "@/backend";
import { AddressTable } from "@/components/audience/AddressTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useDeletePreset,
  usePresetAddresses,
  useSavePreset,
  useUpdatePreset,
} from "@/hooks/use-backend";
import { formatNumber } from "@/lib/format";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface PresetEditorProps {
  preset: AudiencePresetShared;
  onBack: () => void;
  /** Called after the preset was deleted so the parent can clear selection. */
  onDeleted: () => void;
  onRerun: (addresses: VerifiedAddress[], presetId: string) => void;
}

interface NewRecipientForm {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_FORM: NewRecipientForm = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
};

function validateForm(form: NewRecipientForm): string | null {
  if (!form.name.trim()) return "Recipient name is required.";
  if (!form.address_line1.trim()) return "Street address is required.";
  if (!form.city.trim()) return "City is required.";
  if (!/^[A-Z]{2}$/.test(form.state.trim().toUpperCase()))
    return "State must be a 2-letter code.";
  if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim()))
    return "ZIP must be 5 digits (optionally ZIP+4).";
  return null;
}

function toAddress(form: NewRecipientForm): VerifiedAddress {
  const [zip5, plus4] = form.zip.trim().split("-");
  const line2 = form.address_line2.trim();
  return {
    name: form.name.trim(),
    address_line1: form.address_line1.trim(),
    address_line2: line2 ? line2 : undefined,
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    zip_code: zip5,
    zip_plus4: plus4 ? plus4 : undefined,
  };
}

/** Edits a saved preset's name and recipients; can update, fork, delete or re-run it. */
export function PresetEditor({
  preset,
  onBack,
  onDeleted,
  onRerun,
}: PresetEditorProps) {
  const addresses = usePresetAddresses(preset.id);
  const updatePreset = useUpdatePreset();
  const savePreset = useSavePreset();
  const deletePreset = useDeletePreset();

  const [name, setName] = useState(preset.name);
  const [list, setList] = useState<VerifiedAddress[]>([]);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState<NewRecipientForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(preset.name);
    setDirty(false);
  }, [preset.name]);

  useEffect(() => {
    if (addresses.data) {
      setList(addresses.data);
      setDirty(false);
    }
  }, [addresses.data]);

  function setField(key: keyof NewRecipientForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === "state" ? value.toUpperCase().slice(0, 2) : value,
    }));
  }

  function handleAdd() {
    const error = validateForm(form);
    if (error) {
      setFormError(error);
      return;
    }
    setList((prev) => [...prev, toAddress(form)]);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDirty(true);
  }

  function handleDeleteRow(index: number) {
    setList((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function handleUpdate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give the preset a name.");
      return;
    }
    if (list.length === 0) {
      toast.error("Keep at least one recipient.");
      return;
    }
    try {
      const res = await updatePreset.mutateAsync({
        presetId: preset.id,
        name: trimmed,
        addresses: list,
      });
      if (res.ok) {
        toast.success(`Preset "${trimmed}" updated.`);
        setDirty(false);
      } else {
        toast.error(res.error ?? "Could not update the preset.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the preset.",
      );
    }
  }

  async function handleSaveAs() {
    const trimmed = saveAsName.trim();
    if (!trimmed) {
      toast.error("Give the new preset a name.");
      return;
    }
    if (list.length === 0) {
      toast.error("Keep at least one recipient.");
      return;
    }
    try {
      const res = await savePreset.mutateAsync({
        name: trimmed,
        addresses: list,
        sourceCampaignId: null,
      });
      if (res.ok) {
        toast.success(`Saved as new preset "${trimmed}".`);
        setSaveAsOpen(false);
      } else {
        toast.error(res.error ?? "Could not save the preset.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the preset.",
      );
    }
  }

  async function handleDelete() {
    try {
      const res = await deletePreset.mutateAsync(preset.id);
      if (res.ok) {
        toast.success(`Preset "${preset.name}" deleted.`);
        setConfirmDelete(false);
        onDeleted();
      } else {
        toast.error(res.error ?? "Could not delete the preset.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete the preset.",
      );
    }
  }

  const busy =
    updatePreset.isPending || savePreset.isPending || deletePreset.isPending;

  return (
    <div className="space-y-5" data-ocid="audience.preset_editor.panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="gap-2"
          data-ocid="audience.preset_editor.back.button"
        >
          <ArrowLeft className="size-4" /> All presets
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {formatNumber(list.length)} recipients
          </Badge>
          {dirty && (
            <Badge
              variant="outline"
              className="border-accent/40 bg-accent/10 text-accent"
            >
              Unsaved changes
            </Badge>
          )}
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preset details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset name</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              maxLength={80}
              data-ocid="audience.preset_editor.name.input"
            />
          </div>

          {addresses.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading recipients…
            </div>
          ) : (
            <AddressTable
              rows={list}
              onDeleteRow={handleDeleteRow}
              ocidPrefix="audience.preset_editor"
              emptyMessage="This preset has no recipients. Add one below."
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a recipient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Jane Rivera"
                data-ocid="audience.preset_editor.add.name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-line1">Address line 1</Label>
              <Input
                id="new-line1"
                value={form.address_line1}
                onChange={(e) => setField("address_line1", e.target.value)}
                placeholder="120 Harbor View Dr"
                data-ocid="audience.preset_editor.add.line1.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-line2">Address line 2</Label>
              <Input
                id="new-line2"
                value={form.address_line2}
                onChange={(e) => setField("address_line2", e.target.value)}
                placeholder="Apt 4B (optional)"
                data-ocid="audience.preset_editor.add.line2.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-city">City</Label>
              <Input
                id="new-city"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Austin"
                data-ocid="audience.preset_editor.add.city.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-state">State</Label>
              <Input
                id="new-state"
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                placeholder="TX"
                maxLength={2}
                className="uppercase"
                data-ocid="audience.preset_editor.add.state.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-zip">ZIP</Label>
              <Input
                id="new-zip"
                value={form.zip}
                onChange={(e) => setField("zip", e.target.value)}
                placeholder="78701"
                inputMode="numeric"
                maxLength={10}
                data-ocid="audience.preset_editor.add.zip.input"
              />
            </div>
          </div>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            className="gap-2"
            data-ocid="audience.preset_editor.add.button"
          >
            <Plus className="size-4" /> Add recipient
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleUpdate()}
            disabled={busy || list.length === 0}
            className="gap-2"
            data-ocid="audience.preset_editor.update.button"
          >
            {updatePreset.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Update preset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSaveAsName(`${name.trim() || preset.name} copy`);
              setSaveAsOpen(true);
            }}
            disabled={busy || list.length === 0}
            className="gap-2"
            data-ocid="audience.preset_editor.save_as.button"
          >
            <BookmarkPlus className="size-4" /> Save as new preset
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="gap-2 text-destructive hover:text-destructive"
            data-ocid="audience.preset_editor.delete.button"
          >
            <Trash2 className="size-4" /> Delete preset
          </Button>
        </div>
        <Button
          type="button"
          onClick={() => onRerun(list, preset.id)}
          disabled={busy || list.length === 0}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          data-ocid="audience.preset_editor.rerun.button"
        >
          Re-run this audience <ArrowRight className="size-4" />
        </Button>
      </div>

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent data-ocid="audience.preset_editor.save_as.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Save as new preset
            </DialogTitle>
            <DialogDescription>
              Creates a separate preset with the {formatNumber(list.length)}{" "}
              recipients currently listed. The original stays unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="save-as-name">New preset name</Label>
            <Input
              id="save-as-name"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              maxLength={80}
              data-ocid="audience.preset_editor.save_as.name.input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveAsOpen(false)}
              data-ocid="audience.preset_editor.save_as.cancel.button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveAs()}
              disabled={savePreset.isPending}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              data-ocid="audience.preset_editor.save_as.confirm.button"
            >
              {savePreset.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BookmarkPlus className="size-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent data-ocid="audience.preset_editor.delete.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete this preset?
            </DialogTitle>
            <DialogDescription>
              "{preset.name}" and its {formatNumber(preset.recipientCount)}{" "}
              recipients will be removed permanently. Campaigns already sent are
              not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              data-ocid="audience.preset_editor.delete.cancel.button"
            >
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deletePreset.isPending}
              className="gap-2"
              data-ocid="audience.preset_editor.delete.confirm.button"
            >
              {deletePreset.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
