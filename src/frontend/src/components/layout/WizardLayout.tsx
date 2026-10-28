import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { Check } from "lucide-react";
import { useEffect } from "react";

const STEPS = [
  { id: 1, label: "Product" },
  { id: 2, label: "Audience" },
  { id: 3, label: "Design" },
  { id: 4, label: "Review & Pay" },
];

/**
 * The indigo backlight behind a step's heading (and Step 4's success
 * stage): an ellipse that fades out exactly at the box's edges, so no seam
 * shows against the page. `top` hangs it from the top edge instead, for a
 * card whose own border hides that edge. Put it first inside a
 * `relative isolate` box.
 */
export function WizardGlow({
  className,
  anchor = "center",
}: {
  className?: string;
  anchor?: "center" | "top";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 -top-8 bottom-0 -z-10",
        anchor === "top"
          ? "bg-[radial-gradient(50%_100%_at_50%_0%,var(--glow-brand),transparent)]"
          : "bg-[radial-gradient(closest-side,var(--glow-brand),transparent)]",
        className,
      )}
    />
  );
}

export function WizardLayout({
  currentStep,
  children,
}: {
  currentStep: number;
  children: React.ReactNode;
}) {
  const setStep = useWizardStore((s) => s.setStep);
  const launchInFlight = useWizardStore((s) => s.launchInFlight);
  const campaignName = useWizardStore((s) => s.campaignName);
  const wide = currentStep === 3;
  // Every step starts at the top: otherwise the previous step's scroll
  // position carries over and the new heading, this stepper and Stampy's tip
  // open off-screen. Keyed on the step, so Continue, Back, the stepper,
  // Stampy's chips and ?step= deep links are all covered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on step change by design
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);
  return (
    <div
      className={cn(
        "mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
        wide ? "max-w-[1600px]" : "max-w-6xl",
      )}
    >
      {/* The stepper is a capsule segmented track: done steps carry an
          emerald check, the current one is the raised pill. */}
      <nav aria-label="Wizard progress" className="mb-6 space-y-2.5">
        <ol className="segmented flex w-full gap-1 p-1.5">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex min-w-0 flex-1",
                  // The current step's pill widens on phones to fit its name.
                  isActive && "min-[380px]:flex-[2.2] sm:flex-1",
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    isCompleted && !launchInFlight && setStep(step.id)
                  }
                  disabled={!isCompleted || launchInFlight}
                  data-state={isActive ? "active" : undefined}
                  className={cn(
                    "segmented-item h-11 w-full min-w-0 gap-2 px-1.5 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 disabled:cursor-default sm:h-12 sm:px-3 sm:text-sm",
                    isCompleted && "text-foreground",
                    !isCompleted && !isActive && "hover:text-muted-foreground",
                  )}
                  data-ocid={`wizard.step.${step.id}.indicator`}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-smooth",
                      isCompleted &&
                        "bg-emerald-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_4px_10px_-4px_rgb(0_128_88/0.6)]",
                      isActive &&
                        "btn-3d-primary border-0 text-primary-foreground",
                      !isCompleted &&
                        !isActive &&
                        "border border-hairline-strong bg-card text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="size-3.5" /> : step.id}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      // Phones show only the current step's name: four
                      // labels do not fit a third of a 320 px screen.
                      isActive ? "hidden min-[380px]:block" : "hidden sm:block",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {campaignName && (
          <p className="truncate px-2 text-center text-xs text-muted-foreground">
            Campaign:{" "}
            <span className="font-semibold text-foreground">
              {campaignName}
            </span>
          </p>
        )}
      </nav>
      {/* Steps 1, 2 and 4 lay their own cards on the page; the studio keeps
          one surface around its rail, editor and proof. */}
      <div
        className={cn(
          wide &&
            "rounded-3xl border border-hairline bg-card p-4 shadow-surface sm:p-6 lg:p-8",
        )}
      >
        {children}
      </div>
    </div>
  );
}
