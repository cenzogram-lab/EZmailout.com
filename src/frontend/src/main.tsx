import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { identityCreateOptions } from "./lib/identityOrigin";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider createOptions={identityOptions}>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
