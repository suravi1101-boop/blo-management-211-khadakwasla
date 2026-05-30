import { useActor } from "@caffeineai/core-infrastructure";
import { type ReactNode, createContext, useContext } from "react";
import { createActor } from "../backend";

type BackendActor = ReturnType<typeof createActor>;

// Context is nullable — null means actor is not yet ready
// Queries gated with enabled: !!actor will wait until actor is available
const ActorContext = createContext<BackendActor | null>(null);

export function ActorProvider({ children }: { children: ReactNode }) {
  // useActor returns { actor, isFetching } — actor is null until canister ID is injected
  const { actor } = useActor(() => createActor());
  return (
    <ActorContext.Provider value={actor ?? null}>
      {children}
    </ActorContext.Provider>
  );
}

// Returns null while actor is loading — callers must guard with: if (!actor) return []
// The non-null assertion keeps TypeScript happy with existing callers that already guard
// Returns null while actor is loading — callers must guard: if (!actor) return []
export function useBackendActorCtx(): BackendActor | null {
  return useContext(ActorContext);
}

export function useBackendActor(): BackendActor | null {
  return useContext(ActorContext);
}

// Convenience hook returning both actor and readiness flag
export function useBackendActorReady(): {
  actor: BackendActor | null;
  isReady: boolean;
} {
  const actor = useContext(ActorContext);
  return { actor, isReady: actor !== null };
}
