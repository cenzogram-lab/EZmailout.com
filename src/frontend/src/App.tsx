import { Layout } from "@/components/layout/Layout";
import { WizardLayout } from "@/components/layout/WizardLayout";
import { Step1ProductCatalog } from "@/components/wizard/Step1ProductCatalog";
import { Step2AudienceIntake } from "@/components/wizard/Step2AudienceIntake";
import { Step3DesignCanvas } from "@/components/wizard/Step3DesignCanvas";
import { Step4ReviewLaunch } from "@/components/wizard/Step4ReviewLaunch";
import { AdminPage } from "@/pages/AdminPage";
import { CampaignDetailPage } from "@/pages/CampaignDetailPage";
import { CampaignsPage } from "@/pages/CampaignsPage";
import { useWizardStore } from "@/store/wizard";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { StoreFront } from "./pages/StoreFront";
import { TemplatesPage } from "./pages/Templates";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-20">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-muted-foreground">
          This page is under construction.
        </p>
      </div>
    </div>
  );
}

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

const RootLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: StoreFront,
});

const wizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wizard",
  component: WizardPage,
});

const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates",
  component: TemplatesPage,
});

const campaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns",
  component: CampaignsPage,
});

const campaignDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$campaignId",
  component: CampaignDetailPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => <PlaceholderPage title="404 — Page Not Found" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  wizardRoute,
  templatesRoute,
  campaignsRoute,
  campaignDetailRoute,
  adminRoute,
  notFoundRoute,
]);

const router = createRouter({ routeTree });

export default function App() {
  return <RouterProvider router={router} />;
}
