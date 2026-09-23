import { StampyRole, type StampyTurn } from "@/backend";
import {
  StampyChatAvatarIdle,
  StampyChatAvatarThinking,
} from "@/components/stampy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAskStampy,
  useBackendActor,
  usePublicConfig,
  useSubmitSupportTicket,
} from "@/hooks/use-backend";
import {
  NAV_CHIPS,
  type NavKey,
  STAMPY_GREETING,
  STARTER_QUESTIONS,
  parseReply,
  quickAnswer,
} from "@/lib/stampyChat";
import { cn } from "@/lib/utils";
import { useStampyTips } from "@/store/stampyTips";
import { reachableWizardStep, useWizardStore } from "@/store/wizard";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  LifeBuoy,
  Lightbulb,
  Minus,
  RotateCcw,
  Send,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { SupportTicketForm } from "./SupportTicketForm";
import { readOutbox, writeOutbox } from "./supportOutbox";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  chips: NavKey[];
  /** Why a quick answer was used instead of the AI relay. */
  note?: string;
}

const GREETING: ChatMessage = {
  id: 0,
  role: "assistant",
  text: STAMPY_GREETING,
  chips: [],
};

/** Turns the relay sees: the greeting is local chrome, not conversation. */
const MAX_TURNS = 8;

/**
 * Stampy, the floating postal copilot. Mounted once at the app root, so the
 * conversation survives navigation. Hidden on the QR/tracking redirect routes,
 * which recipients (not customers) land on.
 */
export function StampyChatbot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/t/") || pathname.startsWith("/track/")) {
    return null;
  }
  return <StampyChatbotPanel />;
}

function StampyChatbotPanel() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useInternetIdentity();
  const config = usePublicConfig();
  const ask = useAskStampy();
  const tipsHidden = useStampyTips((s) => s.hidden);
  const showTips = useStampyTips((s) => s.setHidden);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "support">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useSupportOutboxFlush();

  const aiConfigured = config.data?.openAiConfigured === true;
  const live = isAuthenticated && aiConfigured;
  const thinking = ask.isPending;

  const push = (m: Omit<ChatMessage, "id">) =>
    setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

  // Keep the newest message in view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the message list or thinking state changes
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, open, view]);

  useEffect(() => {
    if (open && view === "chat") inputRef.current?.focus();
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    const userMessage: ChatMessage = {
      id: nextId.current++,
      role: "user",
      text: q,
      chips: [],
    };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");

    if (!live) {
      push({ ...quickAnswer(q), role: "assistant" });
      return;
    }
    const turns: StampyTurn[] = history
      .filter((m) => m.id !== GREETING.id)
      .slice(-MAX_TURNS)
      .map((m) => ({
        role: m.role === "user" ? StampyRole.User : StampyRole.Assistant,
        content: m.text,
      }));
    try {
      const result = await ask.mutateAsync(turns);
      if (result.ok && result.reply) {
        const parsed = parseReply(result.reply);
        push({
          text: parsed.text || quickAnswer(q).text,
          chips: parsed.chips,
          role: "assistant",
        });
        return;
      }
      push({
        ...quickAnswer(q),
        role: "assistant",
        note: result.error ?? "AI answers are unavailable right now.",
      });
    } catch {
      push({
        ...quickAnswer(q),
        role: "assistant",
        note: "AI answers are unavailable right now.",
      });
    }
  }

  function openChip(key: NavKey) {
    const chip = NAV_CHIPS[key];
    if (chip.to === null) {
      setView("support");
      return;
    }
    if (chip.step !== undefined) {
      const reachable = reachableWizardStep(chip.step);
      useWizardStore.getState().setCurrentStep(reachable);
      if (reachable !== chip.step) {
        push({
          role: "assistant",
          text: "Pick your mail piece first — Step 1 unlocks the rest of the wizard, then I'll take you on from there.",
          chips: [],
        });
      }
      navigate({ to: "/wizard", search: { step: chip.step } });
    } else {
      navigate({ to: chip.to, hash: chip.hash });
    }
    // On phones the panel covers the page; get out of the way.
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  const status = live
    ? { label: "Caffeine AI Active", dot: "bg-emerald-500" }
    : !isAuthenticated
      ? { label: "Quick answers · sign in for AI", dot: "bg-amber-400" }
      : { label: "Quick answers · AI not configured", dot: "bg-amber-400" };

  return (
    <>
      {open ? (
        <section
          id="stampy-chat-panel"
          aria-label="Stampy — Postal Copilot"
          className="fixed bottom-24 right-4 z-40 flex h-[min(560px,calc(100dvh-7.5rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-card shadow-2xl sm:right-5"
          data-ocid="stampy.chat.panel"
        >
          <header className="flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-3">
            {thinking ? (
              <StampyChatAvatarThinking
                className="size-11 shrink-0"
                data-ocid="stampy.chat.avatar.thinking"
              />
            ) : (
              <StampyChatAvatarIdle
                className="stampy-launcher size-11 shrink-0"
                data-ocid="stampy.chat.avatar.idle"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold leading-tight">
                Stampy — Postal Copilot
              </p>
              <p
                className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"
                data-ocid="stampy.chat.status"
              >
                <span className={cn("size-2 rounded-full", status.dot)} />
                {status.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-full text-[#575859] transition-smooth hover:bg-muted hover:text-foreground"
              aria-label="Minimize Stampy"
              title="Minimize"
              data-ocid="stampy.chat.minimize"
            >
              <Minus className="size-4" />
            </button>
          </header>

          <nav
            aria-label="Stampy menu"
            className="flex flex-wrap items-center gap-1.5 border-b border-[#e5e7eb] bg-[#f6f7f9] px-3 py-2"
          >
            <MenuButton
              onClick={() => setView("support")}
              active={view === "support"}
              ocid="stampy.chat.menu.support"
            >
              <LifeBuoy className="size-3.5" /> Contact Support
            </MenuButton>
            <MenuButton
              onClick={() => {
                setMessages([GREETING]);
                setView("chat");
              }}
              ocid="stampy.chat.menu.clear"
            >
              <RotateCcw className="size-3.5" /> New chat
            </MenuButton>
            {tipsHidden ? (
              <MenuButton
                onClick={() => showTips(false)}
                ocid="stampy.chat.menu.show_tips"
              >
                <Lightbulb className="size-3.5" /> Show wizard tips
              </MenuButton>
            ) : null}
          </nav>

          {view === "support" ? (
            <div className="min-h-0 flex-1">
              <SupportTicketForm onBack={() => setView("chat")} />
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
                aria-live="polite"
                data-ocid="stampy.chat.messages"
              >
                {messages.map((m) => (
                  <Message key={m.id} message={m} onChip={openChip} />
                ))}
                {messages.length === 1 ? (
                  <div
                    className="flex flex-wrap gap-1.5 pl-9"
                    data-ocid="stampy.chat.starters"
                  >
                    {STARTER_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void send(q)}
                        className="rounded-full border border-primary/25 bg-card px-3 py-1 text-xs text-primary transition-smooth hover:bg-primary/5"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ) : null}
                {thinking ? (
                  <div
                    className="flex items-center gap-2 pl-1 text-xs text-muted-foreground"
                    data-ocid="stampy.chat.thinking"
                  >
                    <StampyChatAvatarThinking className="size-7" />
                    Stampy is thinking…
                  </div>
                ) : null}
              </div>
              {!isAuthenticated ? (
                <p className="border-t border-[#e5e7eb] px-4 py-1.5 text-[11px] text-muted-foreground">
                  Quick answers work signed out.{" "}
                  <button
                    type="button"
                    onClick={() => void login()}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </button>{" "}
                  for full AI answers.
                </p>
              ) : null}
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 border-t border-[#e5e7eb] p-3"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Stampy anything about your mailing…"
                  maxLength={1000}
                  className="rounded-full"
                  aria-label="Message Stampy"
                  data-ocid="stampy.chat.input"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || thinking}
                  aria-label="Send"
                  className="shrink-0 rounded-full"
                  data-ocid="stampy.chat.send"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group fixed bottom-5 right-4 z-40 flex size-14 items-center justify-center rounded-full border-2 border-[#6366f1] bg-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:right-5"
        aria-label={open ? "Minimize Stampy" : "Need help? Ask Stampy!"}
        aria-expanded={open}
        aria-controls="stampy-chat-panel"
        data-ocid="stampy.chat.launcher"
      >
        <StampyChatAvatarIdle className="stampy-launcher size-12" />
        <span
          className="absolute right-0 top-0 flex size-3.5"
          aria-hidden="true"
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-3.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        {open ? null : (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full bg-[#0e2b4f] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            data-ocid="stampy.chat.tooltip"
          >
            Need help? Ask Stampy!
          </span>
        )}
      </button>
    </>
  );
}

function MenuButton({
  children,
  onClick,
  active = false,
  ocid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-smooth",
        active
          ? "bg-primary text-primary-foreground"
          : "text-[#575859] hover:bg-card hover:text-foreground",
      )}
      data-ocid={ocid}
    >
      {children}
    </button>
  );
}

function Message({
  message,
  onChip,
}: {
  message: ChatMessage;
  onChip: (key: NavKey) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2" data-ocid="stampy.chat.reply">
      <StampyChatAvatarIdle className="stampy-launcher mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 max-w-[85%] space-y-2">
        {message.note ? (
          <p className="text-[11px] text-muted-foreground">
            {message.note} Here's a quick answer:
          </p>
        ) : null}
        <p className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-muted px-3 py-2 text-sm text-foreground">
          {message.text}
        </p>
        {message.chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.chips.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChip(key)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-card px-2.5 py-1 text-xs font-medium text-primary transition-smooth hover:bg-primary hover:text-primary-foreground"
                data-ocid={`stampy.chat.chip.${key}`}
              >
                {NAV_CHIPS[key].label}
                <ArrowUpRight className="size-3" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Re-sends tickets queued while the canister was unreachable. */
function useSupportOutboxFlush() {
  const { ready } = useBackendActor();
  const submit = useSubmitSupportTicket();
  const flushing = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: flush once each time the backend becomes reachable
  useEffect(() => {
    if (!ready || flushing.current) return;
    const queued = readOutbox();
    if (queued.length === 0) return;
    flushing.current = true;
    (async () => {
      const remaining = [...queued];
      while (remaining.length > 0) {
        try {
          const result = await submit.mutateAsync(remaining[0]);
          // A rate limit or a full inbox clears later ("try again later"):
          // keep the ticket. Anything else was refused on its merits and
          // would be refused again, so it leaves the outbox.
          if (!result.ok && result.error?.includes("try again later")) break;
          remaining.shift();
        } catch {
          break; // Still unreachable: keep the rest for next time.
        }
      }
      writeOutbox(remaining);
      flushing.current = false;
    })();
  }, [ready]);
}
