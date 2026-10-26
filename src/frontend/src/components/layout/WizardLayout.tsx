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
        "mx-auto px-4 py-6 sm:px-6 lg:px-8",
        wide ? "max-w-[1600px]" : "max-w-6xl",
      )}
    >
      <nav
        aria-label="Wizard progress"
        className="mb-6 rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-soft sm:px-8"
      >
        <ol className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isLast = index === STEPS.length - 1;
            return (
              <li key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() =>
                    isCompleted && !launchInFlight && setStep(step.id)
                  }
                  disabled={!isCompleted || launchInFlight}
                  className="flex flex-col items-center gap-1.5 disabled:cursor-default"
                  data-ocid={`wizard.step.${step.id}.indicator`}
                >
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-smooth",
                      isCompleted &&
                        "border-emerald-brand bg-emerald-brand text-white",
                      isActive &&
                        "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
                      !isCompleted &&
                        !isActive &&
                        "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="size-4" /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:block",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 rounded-full transition-smooth sm:mx-4",
                      isCompleted ? "bg-emerald-brand" : "bg-border",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {campaignName && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Campaign:{" "}
            <span className="font-medium text-foreground">{campaignName}</span>
          </p>
        )}
      </nav>
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
