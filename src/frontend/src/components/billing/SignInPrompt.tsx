import { StampyChatAvatarTip } from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAccountSync } from "@/hooks/use-account";
import { Fingerprint, Loader2 } from "lucide-react";

export function SignInPrompt({
  message = "Sign in with Internet Identity to continue.",
}: {
  message?: string;
}) {
  const { login, isLoggingIn, isInitializing } = useAccountSync();
  return (
    <Card className="rounded-3xl" data-ocid="auth.sign_in_prompt.card">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <StampyChatAvatarTip className="mascot-shadow size-24" />
        <p className="font-display text-lg font-bold tracking-tight text-foreground">
          Sign in to pick up where you left off
        </p>
        <p className="max-w-sm text-sm font-medium text-muted-foreground">
          {message}
        </p>
        <Button
          onClick={login}
          disabled={isLoggingIn || isInitializing}
          className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          data-ocid="auth.sign_in_prompt.button"
        >
          {isLoggingIn ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Fingerprint className="size-4" />
          )}
          Sign in with Internet Identity
        </Button>
      </CardContent>
    </Card>
  );
}
