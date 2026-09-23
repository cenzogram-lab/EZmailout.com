import { StampyChatbot } from "@/components/chat/StampyChatbot";
import { Layout } from "@/components/layout/Layout";
import { WizardLayout } from "@/components/layout/WizardLayout";
import { Step1ProductCatalog } from "@/components/wizard/Step1ProductCatalog";
import { Step2AudienceIntake } from "@/components/wizard/Step2AudienceIntake";
import { Step3DesignCanvas } from "@/components/wizard/Step3DesignCanvas";
import { Step4ReviewLaunch } from "@/components/wizard/Step4ReviewLaunch";
import { AdminPage } from "@/pages/AdminPage";
import { CampaignDetailPage } from "@/pages/CampaignDetailPage";
import { CampaignsPage } from "@/pages/CampaignsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ReferralLandingPage } from "@/pages/ReferralLandingPage";
import { StoreFront } from "@/pages/StoreFront";
import { TemplatesPage } from "@/pages/Templates";
import { TrackRedirectPage } from "@/pages/TrackRedirectPage";
import { reachableWizardStep, useWizardStore } from "@/store/wizard";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useSearch,
} from "@tanstack/react-router";
import { useEffect } from "react";

/** `?step=N` on `/wizard`, when N is a real step. */
function parseWizardSearch(search: Record<string, unknown>): { step?: number } {
  const step = Number(search.step);
  return Number.isInteger(step) && step >= 1 && step <= 4 ? { step } : {};
}

function WizardPage() {
  const currentStep = useWizardStore((s) => s.currentStep);
  const setCurrentStep = useWizardStore((s) => s.setCurrentStep);
  const { step } = useSearch({ strict: false }) as { step?: number };

  // Deep links (Stampy's chips, shared URLs) open the requested step when the
  // steps before it allow; the wizard store stays the source of truth.
  useEffect(() => {
    if (step !== undefined) setCurrentStep(reachableWizardStep(step));
  }, [step, setCurrentStep]);

  return (
    <WizardLayout currentStep={currentStep}>
      {currentStep === 1 && <Step1ProductCatalog />}
      {currentStep === 2 && <Step2AudienceIntake />}
      {currentStep === 3 && <Step3DesignCanvas />}
      {currentStep === 4 && <Step4ReviewLaunch />}
    </WizardLayout>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Layout>
        <Outlet />
      </Layout>
      <StampyChatbot />
    </>
  ),
});

const routes = [
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: StoreFront,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/wizard",
    component: WizardPage,
    validateSearch: parseWizardSearch,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/templates",
    component: TemplatesPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/campaigns",
    component: CampaignsPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/campaigns/$campaignId",
    component: CampaignDetailPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/dashboard",
    component: DashboardPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/admin",
    component: AdminPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/track/$code",
    component: TrackRedirectPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/t/$code",
    component: TrackRedirectPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/ref/$code",
    component: ReferralLandingPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "*",
    component: NotFoundPage,
  }),
];

const router = createRouter({ routeTree: rootRoute.addChildren(routes) });

export default function App() {
  return <RouterProvider router={router} />;
}
