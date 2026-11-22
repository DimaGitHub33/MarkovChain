import { createContext, useContext, useMemo, type ReactNode } from "react";
import { api, useResource } from "../lib/api";
import type { Action, Catalog, ModelSummary } from "../lib/types";
import { ErrorState, LoadingBlock } from "./ui";

interface CatalogContextValue {
  catalog: Catalog;
  summary: ModelSummary;
  byId: Map<string, Action>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

const loadAll = () => Promise.all([api.catalog(), api.summary()]);

/** Loads the action catalog and model summary once; every page can rely on them. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { data, error, retry } = useResource(loadAll);
  const value = useMemo(() => {
    if (!data) return null;
    const [catalog, summary] = data;
    return { catalog, summary, byId: new Map(catalog.actions.map((action) => [action.id, action])) };
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-10">
        <ErrorState message={error.message} onRetry={retry} />
      </div>
    );
  }
  if (!value) return <LoadingBlock className="mx-auto max-w-5xl p-10" label="Loading the model…" />;
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog must be used inside CatalogProvider");
  return value;
}

export function useActionLabel() {
  const { byId } = useCatalog();
  return (id: string) => byId.get(id)?.label ?? id;
}
