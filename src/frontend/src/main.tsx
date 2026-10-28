import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { identityCreateOptions } from "./lib/identityOrigin";
import { initInputModality } from "./lib/inputModality";
import { initTheme } from "./lib/theme";
import { restoreWizardDraft } from "./store/wizard";

// The saved light/dark choice goes on <html> before anything renders.
initTheme();
initInputModality();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Created once: the provider re-initialises its AuthClient whenever this
// object changes identity.
const identityOptions = identityCreateOptions(window.location.hostname);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// The saved wizard draft is restored before the first render (see
// `restoreWizardDraft`); the boot screen covers the few milliseconds it takes.
void restoreWizardDraft().then(() =>
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider
        createOptions={identityOptions}
        // Plain sign-in: EZmailout reads no II attributes, so users are not
        // asked to share their email.
        withAttributes={false}
      >
        <App />
      </InternetIdentityProvider>
    </QueryClientProvider>,
  ),
);
