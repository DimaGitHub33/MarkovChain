import type { ReactNode, SVGProps } from "react";

const PATHS: Record<string, ReactNode> = {
  // navigation
  overview: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>),
  how: (<><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="15" y="15" width="6" height="6" rx="1.5" /><path d="M9 6h6a3 3 0 0 1 3 3v6" /></>),
  patterns: (<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>),
  predict: (<path d="M5 4h3.5l2 5-2.5 1.6a11 11 0 0 0 5.4 5.4L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />),
  performance: (<><path d="M3 3v18h18" /><path d="m7 15 4-5 4 3 5-6" /></>),
  // interface
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: (<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10Z" />),
  undo: (<><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>),
  trash: (<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>),
  x: (<path d="M18 6 6 18M6 6l12 12" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  "chevron-left": (<path d="m15 18-6-6 6-6" />),
  "chevron-right": (<path d="m9 18 6-6-6-6" />),
  "chevron-down": (<path d="m6 9 6 6 6-6" />),
  "arrow-right": (<path d="M5 12h14m-6-6 6 6-6 6" />),
  link: (<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>),
  check: (<path d="M20 6 9 17l-5-5" />),
  alert: (<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></>),
  menu: (<path d="M4 6h16M4 12h16M4 18h16" />),
  download: (<path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />),
  sparkles: (<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />),
  zap: (<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>),
  table: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 10v10" /></>),
  // actions
  login: (<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5M15 12H3" /></>),
  check_balance: (<><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" /><path d="M21 9h-6a3 3 0 0 0 0 6h6V9Z" /></>),
  check_exchange_rates: (<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />),
  card_payment: (<><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></>),
  transfer_to_own_account: (<path d="M4 12a8 8 0 0 1 14-5.3L20 9m0-5v5h-5M20 12a8 8 0 0 1-14 5.3L4 15m0 5v-5h5" />),
  transfer_to_other_user: (<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />),
  fx_transfer_attempt: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
  fx_transfer_failed: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" /></>),
  password_change_attempt: (<><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2M17 6l3 3M15 8l2 2" /></>),
  password_change_failed: (<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" /></>),
  open_help_page: (<><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>),
};

export type IconName = keyof typeof PATHS;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName | string;
  size?: number;
  label?: string;
}

/** Stroke icons drawn for this app. Decorative unless a label is given. */
export function Icon({ name, size = 18, label, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...props}
    >
      {PATHS[name] ?? PATHS.info}
    </svg>
  );
}
