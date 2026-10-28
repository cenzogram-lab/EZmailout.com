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
  OPEN_STAMPY_EVENT,
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

const COMPOSER_PLACEHOLDER = "Ask Stampy anything about your mailing…";

/**
 * Stampy, the floating postal copilot. Mounted once at the app root, so the
 * conversation survives navigation. Hidden on the QR/tracking redirect routes,
 * which recipients (not customers) land on.
 */
export function StampyChatbot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { identity } = useInternetIdentity();
  if (pathname.startsWith("/t/") || pathname.startsWith("/track/")) {
    return null;
  }
  // One conversation per signed-in person: signing out (or in as someone
  // else) starts a fresh one, so nobody reads the previous person's chat.
  return (
    <StampyChatbotPanel key={identity?.getPrincipal().toString() ?? "guest"} />
  );
}

function StampyChatbotPanel() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useInternetIdentity();
  const config = usePublicConfig();
  const ask = useAskStampy();
  const tipsHidden = useStampyTips((s) => s.hidden);
  const showTips = useStampyTips((s) => s.setHidden);

  const [open, setOpen] = useState(false);
  // Replies that land while the panel is closed (the asker minimised it
  // mid-answer) show as a count on the launcher until it is opened again.
  const [unread, setUnread] = useState(0);
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);
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

  const push = (m: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);
    if (m.role === "assistant" && !openRef.current) setUnread((n) => n + 1);
  };

  // Keep the newest message in view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the message list or thinking state changes
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, open, view]);

  useEffect(() => {
    if (open && view === "chat") inputRef.current?.focus();
  }, [open, view]);

  // The header's peeking Stampy (and anything else) opens the panel by event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_STAMPY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_STAMPY_EVENT, onOpen);
  }, []);

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
      if (useWizardStore.getState().launchInFlight) {
        push({
          role: "assistant",
          text: "Your campaign is launching right now. Let it finish on the review step, then I'll take you anywhere you like.",
          chips: [],
        });
        return;
      }
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
    ? { label: "AI answers on", dot: "bg-emerald-500" }
    : !isAuthenticated
      ? { label: "Quick answers · sign in for AI", dot: "bg-amber-400" }
      : { label: "Quick answers · AI not configured", dot: "bg-amber-400" };

  return (
    <>
      {open ? (
        // Phones: the panel is a sheet over the page, so the page behind it
        // (not the header, tab bar or launcher) is dimmed. Visual only: taps
        // still reach the page, as before.
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 top-[env(safe-area-inset-top,0px)] z-[39] bg-black/25 dark:bg-black/50 sm:hidden"
        />
      ) : null}
      {open ? (
        <section
          id="stampy-chat-panel"
          aria-label="Stampy — Postal Copilot"
          // Never under the sticky header. On phones it is a bottom sheet:
          // edge to edge from the header band (over a scrim, below) down to
          // the screen's bottom edge, with the floating dock and the
          // launcher over its foot (z-[39], under their z-40). Its bottom
          // padding is the dock's footprint plus the raised Create button's
          // rise, so the composer ends just above them and no page shows
          // between the sheet and the dock; the launcher (Close) is seated
          // at the composer's right end. From sm it floats above the
          // launcher, at most 560 px tall, its top at least 0.75rem below
          // the header. On short screens (landscape phones) that would leave
          // no room for messages, so there it fills the height down to the
          // tab bar, over the launcher and the header; its own minimize
          // button stays in view.
          className="fixed inset-x-0 bottom-0 top-[calc(var(--header-h)+4px+env(safe-area-inset-top,0px))] z-[39] flex flex-col overflow-hidden rounded-t-3xl border border-hairline bg-popover pb-[calc(var(--bottom-nav-h)+1.5rem)] text-popover-foreground shadow-raised sm:bottom-[calc(6rem+var(--bottom-nav-h))] sm:left-auto sm:right-5 sm:top-[max(calc(var(--header-h)+4px+env(safe-area-inset-top,0px)+0.75rem),calc(100dvh-6rem-var(--bottom-nav-h)-560px))] sm:z-40 sm:w-[min(380px,calc(100vw-2rem))] sm:rounded-b-3xl sm:pb-0 [@media(max-height:500px)]:bottom-[calc(0.75rem+var(--bottom-nav-h))] [@media(max-height:500px)]:top-[calc(0.5rem+env(safe-area-inset-top,0px))] [@media(max-height:500px)]:z-[60] [@media(max-height:500px)]:rounded-b-3xl [@media(max-height:500px)]:pb-0"
          data-ocid="stampy.chat.panel"
        >
          <header className="relative isolate flex items-center gap-3 border-b border-hairline px-4 py-3">
            <div aria-hidden className="ambient-glow-backdrop" />
            {thinking ? (
              <StampyChatAvatarThinking
                className="size-11 shrink-0"
                data-ocid="stampy.chat.avatar.thinking"
              />
            ) : (
              <StampyChatAvatarIdle
                className="stampy-launcher mascot-3d size-11 shrink-0"
                data-ocid="stampy.chat.avatar.idle"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-black leading-tight tracking-tight">
                Stampy — Postal Copilot
              </p>
              <p
                className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground"
                data-ocid="stampy.chat.status"
              >
                {/* text-xs lines are 1rem tall: a 0.25rem offset centres the
                    0.5rem dot on the first line when the label wraps. */}
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    status.dot,
                  )}
                />
                {status.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-3d-neutral flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground sm:size-9 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
              aria-label="Minimize Stampy"
              title="Minimize"
              data-ocid="stampy.chat.minimize"
            >
              <Minus className="size-4" />
            </button>
          </header>

          <nav
            aria-label="Stampy menu"
            className="flex flex-wrap items-center gap-1.5 border-b border-hairline bg-well px-3 py-2"
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
                        className="rounded-full border border-primary/30 bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-smooth hover:border-primary/50 hover:bg-primary/5"
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
                <p className="border-t border-hairline px-4 py-1.5 text-[11px] text-muted-foreground">
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
              {/* On phones the right end is the launcher's seat (56 px + an
                  8 px gap from its right-4 edge), so it never covers Send.
                  The launcher hides while the on-screen keyboard is up, and
                  under the short-screen sheet, so the seat goes too. */}
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 border-t border-hairline p-3 pr-20 sm:pr-3 [@media(max-height:500px)]:pr-3 [html[data-soft-keyboard]_&]:pr-3"
              >
                {/* On a narrow phone the placeholder ends in "…" instead of
                    stopping mid-word. Chromium drops text-overflow on a
                    focused field, and the panel focuses it on open, so the
                    visible placeholder is the span over the field; the
                    native one stays (transparent) for assistive tech. */}
                <div className="relative min-w-0 flex-1">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={COMPOSER_PLACEHOLDER}
                    maxLength={1000}
                    className="peer h-11 rounded-full text-ellipsis placeholder:text-transparent"
                    aria-label="Message Stampy"
                    data-ocid="stampy.chat.input"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-px hidden items-center px-3 text-base text-muted-foreground peer-placeholder-shown:flex md:text-sm"
                  >
                    <span className="truncate">{COMPOSER_PLACEHOLDER}</span>
                  </span>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || thinking}
                  aria-label="Send"
                  className="size-11 shrink-0 rounded-full"
                  data-ocid="stampy.chat.send"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      ) : null}

      {/* Avatar pill above the tab bar: a circle on phones, "Ask Stampy" from
          sm up. A red count replaces the green online dot while replies wait.
          While the phone sheet is open it rises 10 px to sit centred in the
          composer row's seat (the row's centre is 1.5rem + 34 px above the
          dock), clear of the raised Create button. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "btn-3d-neutral hide-with-keyboard group fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full p-1 [--tw-shadow:var(--btn-neutral-shadow),0_12px_28px_-10px_rgb(79_70_229/0.5)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 sm:right-5 sm:pr-4",
          open
            ? "bottom-[calc(1.875rem+var(--bottom-nav-h))] sm:bottom-[calc(1.25rem+var(--bottom-nav-h))]"
            : "bottom-[calc(1.25rem+var(--bottom-nav-h))]",
        )}
        aria-label={
          open
            ? "Minimize Stampy"
            : unread > 0
              ? `Stampy replied (${unread} new)`
              : "Need help? Ask Stampy!"
        }
        aria-expanded={open}
        aria-controls="stampy-chat-panel"
        data-ocid="stampy.chat.launcher"
      >
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary">
          <StampyChatAvatarIdle className="stampy-launcher mascot-3d stampy-bob size-12" />
          {unread > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-popover bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground shadow-sm"
              data-ocid="stampy.chat.unread"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : (
            <span
              className="absolute right-0 top-0 flex size-3.5"
              aria-hidden="true"
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-popover bg-emerald-500" />
            </span>
          )}
        </span>
        <span className="hidden text-sm font-bold tracking-tight text-foreground sm:inline">
          {open ? "Close" : "Ask Stampy"}
        </span>
        {open ? null : (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full border border-white/10 bg-[#1b1f2b] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-raised transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
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
        "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80",
        active
          ? "border-white/20 bg-primary font-bold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_4px_12px_-6px_rgb(79_70_229/0.6)]"
          : "border-transparent text-muted-foreground hover:border-hairline hover:bg-card hover:text-foreground",
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
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-white/15 bg-primary px-3 py-2 text-sm text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_18px_-10px_rgb(79_70_229/0.55)]">
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2" data-ocid="stampy.chat.reply">
      <StampyChatAvatarIdle className="stampy-launcher mascot-3d mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 max-w-[85%] space-y-2">
        {message.note ? (
          <p className="text-[11px] text-muted-foreground">
            {message.note} Here's a quick answer:
          </p>
        ) : null}
        <p className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-hairline bg-muted px-3 py-2 text-sm text-foreground">
          {message.text}
        </p>
        {message.chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.chips.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChip(key)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-card px-2.5 py-1 text-xs font-semibold text-primary shadow-sm transition-smooth hover:border-primary hover:bg-primary hover:text-primary-foreground"
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

/** How often queued tickets are tried again while any are waiting. */
const OUTBOX_RETRY_MS = 120_000;

/**
 * One flush at a time for the whole page: the chat panel remounts when the
 * signed-in identity changes, and a per-instance flag let the old panel's
 * flush and the new one's send the same queued tickets twice.
 */
let outboxFlushing = false;

/**
 * Re-sends tickets queued while the canister was unreachable: when the
 * backend becomes reachable, when the browser comes back online, and every
 * two minutes while any are waiting (not only on the next page load).
 */
function useSupportOutboxFlush() {
  const { ready } = useBackendActor();
  const submit = useSubmitSupportTicket();
  const submitRef = useRef(submit.mutateAsync);
  submitRef.current = submit.mutateAsync;
  useEffect(() => {
    if (!ready) return;
    const flush = async () => {
      if (outboxFlushing) return;
      const queued = readOutbox();
      if (queued.length === 0) return;
      outboxFlushing = true;
      try {
        for (const ticket of queued) {
          try {
            const result = await submitRef.current(ticket);
            // A rate limit or a busy inbox clears later ("try again …"):
            // keep the ticket. Anything else was refused on its merits and
            // would be refused again, so it leaves the outbox.
            if (!result.ok && /try again/i.test(result.error ?? "")) break;
          } catch {
            break; // Still unreachable: keep the rest for next time.
          }
          // Each handled ticket leaves at once (tickets queued meanwhile
          // stay), so nothing already sent is sent again.
          const key = JSON.stringify(ticket);
          const left = readOutbox();
          const at = left.findIndex((t) => JSON.stringify(t) === key);
          if (at >= 0) left.splice(at, 1);
          writeOutbox(left);
        }
      } finally {
        outboxFlushing = false;
      }
    };
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void flush(), OUTBOX_RETRY_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [ready]);
}
