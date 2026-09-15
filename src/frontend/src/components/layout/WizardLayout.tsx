import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Select Product" },
  { id: 2, label: "Target Audience" },
  { id: 3, label: "Design" },
  { id: 4, label: "Review & Launch" },
];

export function WizardLayout({
  currentStep,
  children,
}: {
  currentStep: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Wizard progress" className="mb-10">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isLast = index === STEPS.length - 1;

            return (
              <li key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-smooth",
                      isCompleted &&
                        "border-primary bg-primary text-primary-foreground",
                      isActive &&
                        "border-primary bg-primary/10 text-primary ring-2 ring-primary/30",
                      !isCompleted &&
                        !isActive &&
                        "border-muted bg-card text-muted-foreground",
                    )}
                    data-ocid={`wizard.step.${step.id}.indicator`}
                  >
                    {isCompleted ? <Check className="size-5" /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:block",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {!isLast && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 rounded-full transition-smooth sm:mx-4",
                      isCompleted ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
