import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";
import { Check } from "lucide-react";

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
  const campaignName = useWizardStore((s) => s.campaignName);
  const wide = currentStep === 3;
  return (
    <div
      className={cn(
        "mx-auto px-4 py-6 sm:px-6 lg:px-8",
        wide ? "max-w-[1600px]" : "max-w-6xl",
      )}
    >
      <nav aria-label="Wizard progress" className="mb-6">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isLast = index === STEPS.length - 1;
            return (
              <li key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => isCompleted && setStep(step.id)}
                  disabled={!isCompleted}
                  className="flex flex-col items-center gap-1.5 disabled:cursor-default"
                  data-ocid={`wizard.step.${step.id}.indicator`}
                >
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-smooth",
                      isCompleted &&
                        "border-emerald-brand bg-emerald-brand text-white",
                      isActive &&
                        "border-primary bg-primary/10 text-primary ring-4 ring-primary/15",
                      !isCompleted &&
                        !isActive &&
                        "border-border bg-card text-muted-foreground",
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
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
