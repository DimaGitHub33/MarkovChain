import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Icon } from "./Icon";
import { useTheme } from "./ThemeProvider";
import { cx } from "./ui";

export const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: "overview", title: "Predicting Customer Care Calls" },
  { to: "/how-it-works", label: "How It Works", icon: "how", title: "How the Model Works" },
  { to: "/patterns", label: "Behavior Patterns", icon: "patterns", title: "How Callers and Non-callers Behave" },
  { to: "/predict", label: "Predict", icon: "predict", title: "Will This Customer Call?" },
  { to: "/performance", label: "Performance", icon: "performance", title: "How Well Does It Work?" },
];

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-3 rounded-xl" aria-label="Customer Care Call Prediction, home">
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-orange-400 text-white shadow-lg shadow-indigo-500/25">
        <Icon name="predict" size={20} />
      </span>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-bold tracking-tight">Call Predictor</span>
        <span className="block text-xs text-subtle">Markov chain model</span>
      </span>
    </NavLink>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
              )
            }
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}

export function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
    const item = NAV_ITEMS.find((nav) => nav.to === location.pathname);
    document.title = item ? `${item.label} · Customer Care Call Prediction` : "Customer Care Call Prediction";
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2"><Brand /></div>
        <nav aria-label="Main" className="mt-8 flex-1"><NavItems /></nav>
        <ThemeToggle />
        <p className="mt-4 px-3 text-xs leading-relaxed text-subtle">Synthetic data · class-conditional Markov chains</p>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2"
        >
          <Icon name={menuOpen ? "x" : "menu"} size={22} />
        </button>
      </header>
      {menuOpen && (
        <div id="mobile-menu" className="animate-pop-in fixed inset-x-3 top-[4.6rem] z-30 card p-3 lg:hidden">
          <nav aria-label="Main"><NavItems onNavigate={() => setMenuOpen(false)} /></nav>
          <div className="mt-2 border-t border-line pt-2"><ThemeToggle /></div>
        </div>
      )}

      <main id="main" className="glow min-h-screen lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
