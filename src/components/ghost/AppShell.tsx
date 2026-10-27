import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import { PlayerBar } from "./PlayerBar";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="ghost-canvas flex h-dvh flex-col overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-0 flex-1">
        <Sidebar className="hidden w-60 shrink-0 md:flex lg:w-64" />
        <main id="main" ref={mainRef} tabIndex={-1} className="ghost-scroll min-w-0 flex-1 overflow-y-auto focus:outline-none">
          <TopBar />
          {children}
        </main>
        <QueuePanel />
      </div>
      <PlayerBar />
    </div>
  );
}
