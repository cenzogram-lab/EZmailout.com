import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGetAdminKeys, useSaveAdminKeys } from "@/hooks/use-backend";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

function MaskedKeyInput({
  label,
  value,
  onChange,
  configured,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  configured: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Badge
          variant={configured ? "default" : "secondary"}
          className={configured ? "bg-green-500/20 text-green-400" : ""}
        >
          {configured ? "Configured" : "Not Set"}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label}`}
          className="flex-1"
          data-ocid={`admin.${label.toLowerCase().replace(/\s+/g, "_")}.input`}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShow(!show)}
          data-ocid={`admin.${label.toLowerCase().replace(/\s+/g, "_")}.toggle`}
          aria-label={show ? "Hide key" : "Show key"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { data: existingKeys, isLoading: keysLoading } = useGetAdminKeys();
  const saveKeys = useSaveAdminKeys();

  const [stripeKey, setStripeKey] = useState("");
  const [lobKey, setLobKey] = useState("");
  const [resendKey, setResendKey] = useState("");

  useEffect(() => {
    if (existingKeys) {
      setStripeKey(existingKeys.stripeKey ?? "");
      setLobKey(existingKeys.lobKey ?? "");
      setResendKey(existingKeys.resendKey ?? "");
    }
  }, [existingKeys]);

  async function handleSave() {
    await saveKeys.mutateAsync({
      stripeKey: stripeKey || undefined,
      lobKey: lobKey || undefined,
      resendKey: resendKey || undefined,
    });
  }

  const isConfigured = (key?: string) => !!key && key.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Admin Control Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage secure API credentials for backend integrations.
          </p>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <KeyRound className="size-4 text-primary" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {keysLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading existing keys…
            </div>
          ) : (
            <>
              <MaskedKeyInput
                label="Stripe API Key"
                value={stripeKey}
                onChange={setStripeKey}
                configured={isConfigured(existingKeys?.stripeKey)}
              />
              <Separator />
              <MaskedKeyInput
                label="Lob API Key"
                value={lobKey}
                onChange={setLobKey}
                configured={isConfigured(existingKeys?.lobKey)}
              />
              <Separator />
              <MaskedKeyInput
                label="Resend API Key"
                value={resendKey}
                onChange={setResendKey}
                configured={isConfigured(existingKeys?.resendKey)}
              />
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            {saveKeys.isSuccess && (
              <span className="text-sm font-medium text-green-400">
                Keys saved successfully.
              </span>
            )}
            {saveKeys.isError && (
              <span className="text-sm text-destructive">
                Failed to save keys.
              </span>
            )}
            <div className="flex-1" />
            <Button
              onClick={handleSave}
              disabled={saveKeys.isPending || keysLoading}
              data-ocid="admin.save_keys_button"
              className="gap-2"
            >
              {saveKeys.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saveKeys.isPending ? "Saving…" : "Save Keys"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
