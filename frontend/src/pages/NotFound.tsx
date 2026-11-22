import { Link } from "react-router";
import { Icon } from "../components/Icon";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">This page does not exist</h1>
      <p className="mt-3 text-muted">The link may be old. Pages were renamed in this version of the app.</p>
      <Link to="/" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-solid px-5 font-semibold text-white">
        <Icon name="overview" size={18} /> Back to the overview
      </Link>
    </div>
  );
}
