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
    <Card
      className="border-dashed bg-muted/30"
      data-ocid="auth.sign_in_prompt.card"
    >
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Fingerprint className="size-6" />
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        <Button
          onClick={login}
          disabled={isLoggingIn || isInitializing}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
