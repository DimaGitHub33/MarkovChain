import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { CatalogProvider } from "./components/CatalogProvider";
import { Layout } from "./components/Layout";
import { ThemeProvider } from "./components/ThemeProvider";
import { LoadingBlock } from "./components/ui";
import { OverviewPage } from "./pages/Overview";
import { NotFoundPage } from "./pages/NotFound";

// Heavier pages load on demand, so the first screen appears quickly.
const HowItWorksPage = lazy(() => import("./pages/HowItWorks"));
const PatternsPage = lazy(() => import("./pages/Patterns"));
const PredictPage = lazy(() => import("./pages/Predict"));
const PerformancePage = lazy(() => import("./pages/Performance"));

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <CatalogProvider>
          <Suspense fallback={<LoadingBlock className="p-10" />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<OverviewPage />} />
                <Route path="how-it-works" element={<HowItWorksPage />} />
                <Route path="patterns" element={<PatternsPage />} />
                <Route path="predict" element={<PredictPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </CatalogProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
