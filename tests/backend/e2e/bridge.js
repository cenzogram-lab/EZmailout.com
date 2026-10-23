// Test bridge for @caffeineai/core-infrastructure: the real frontend talks to
// a canister in PocketIC through its HTTP gateway as a fixed Ed25519 identity,
// and every actor call's arguments and result are recorded on window.__calls.
// localStorage "ezlive" = {"host","canisterId","seed"}.
import { HttpAgent } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import { useQuery } from "@tanstack/react-query";
const CFG = JSON.parse(localStorage.getItem("ezlive") || "{}");
const identity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(CFG.seed ?? 7));
window.__calls = window.__calls || [];
const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? `${x}n` : x instanceof Uint8Array ? { bytes: x.length } : x)));
function record(target) {
  return new Proxy(target, {
    get(t, name, recv) {
      const v = Reflect.get(t, name, recv);
      if (typeof v !== "function" || typeof name !== "string" || name.startsWith("_")) return v;
      return async (...args) => {
        const entry = { name, args: plain(args), at: Date.now() };
        window.__calls.push(entry);
        try { const r = await v.apply(t, args); entry.result = plain(r); return r; }
        catch (e) { entry.error = String(e?.message ?? e); throw e; }
      };
    },
  });
}
let agentP = null;
const agent = () => (agentP ??= HttpAgent.create({ host: CFG.host, identity, shouldFetchRootKey: true }));
export function InternetIdentityProvider({ children }) { return children; }
export function useInternetIdentity() {
  return { identity, login: () => {}, clear: () => {}, loginStatus: "success", isInitializing: false, isLoginIdle: false, isLoggingIn: false, isLoginSuccess: true, isLoginError: false, isAuthenticated: true };
}
export function useActor(createActor) {
  const q = useQuery({
    queryKey: ["actor", identity.getPrincipal().toText()],
    queryFn: async () => record(createActor(CFG.canisterId, async () => new Uint8Array(), async () => null, { agent: await agent() })),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return { actor: q.data ?? null, isFetching: q.isFetching };
}
export async function loadConfig() { return { backend_host: CFG.host, backend_canister_id: CFG.canisterId }; }
export async function createActorWithConfig(createActor) { return record(createActor(CFG.canisterId, async () => new Uint8Array(), async () => null, { agent: await agent() })); }
export const __principal = identity.getPrincipal().toText();
