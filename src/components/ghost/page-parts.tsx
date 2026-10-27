import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10", className)} aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CollectionHeader({
  eyebrow,
  title,
  meta,
  art,
  actions,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  art: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="header-glow -mx-4 mb-6 px-4 pb-6 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        {art}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-2 break-words text-3xl font-extrabold text-foreground sm:text-5xl">{title}</h1>
          {meta && <div className="mt-3 text-sm text-muted-foreground">{meta}</div>}
        </div>
      </div>
      {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-primary [&_svg]:size-6">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {children && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
      ))}
    </div>
  );
}
