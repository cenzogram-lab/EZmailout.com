import { MascotStage, StampyChatAvatarTip } from "@/components/stampy";
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
      className="relative isolate overflow-hidden rounded-3xl"
      data-ocid="auth.sign_in_prompt.card"
    >
      {/* Brand backlight from the top edge, behind Stampy. */}
      <div aria-hidden className="ambient-glow-backdrop" />
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <MascotStage
          mascot={StampyChatAvatarTip}
          size="sm"
          className="mb-3"
          mascotClassName="size-24"
        />
        <p className="font-display text-xl font-black tracking-tight text-foreground text-balance">
          Sign in to pick up where you left off
        </p>
        <p className="max-w-sm text-sm font-medium leading-relaxed text-muted-foreground">
          {message}
        </p>
        <Button
          size="lg"
          onClick={login}
          disabled={isLoggingIn || isInitializing}
          className="mt-1 gap-2 px-5"
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
