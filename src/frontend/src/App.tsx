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
import { useWizardStore } from "@/store/wizard";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

function WizardPage() {
  const currentStep = useWizardStore((s) => s.currentStep);
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
    <Layout>
      <Outlet />
    </Layout>
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
