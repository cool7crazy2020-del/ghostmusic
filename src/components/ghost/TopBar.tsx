import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

import { useLibrary } from "./library-context";
import { SidebarContent } from "./Sidebar";
import { SourceInfoDialog } from "./SourceInfoDialog";

export function TopBar() {
  const navigate = useNavigate();
  const { storageAvailable } = useLibrary();
  const location = useRouterState({ select: (s) => s.location });
  const onSearchPage = location.pathname === "/search";
  const urlQ = onSearchPage ? ((location.search as { q?: string }).q ?? "") : "";
  const [value, setValue] = useState(urlQ);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const update = (q: string) => {
    setValue(q);
    navigate({ to: "/search", search: { q: q || undefined }, replace: onSearchPage });
  };

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            variant="subtle"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <form
            role="search"
            className="relative flex-1 sm:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/search", search: { q: value || undefined } });
            }}
          >
            <label htmlFor="ghost-search" className="sr-only">
              Search the demo catalog
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              id="ghost-search"
              type="search"
              autoComplete="off"
              value={value}
              onChange={(e) => update(e.target.value)}
              placeholder="Search songs, artists, albums"
              className="h-10 w-full rounded-full border border-input bg-surface pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:border-primary/60 focus:shadow-glow-sm focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  update("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </form>
          <div className="ml-auto hidden sm:block">
            <SourceInfoDialog
              trigger={
                <button className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <span className="size-1.5 rounded-full bg-primary shadow-glow-sm" aria-hidden />
                  Demo catalog
                </button>
              }
            />
          </div>
        </div>
        {!storageAvailable && (
          <div role="status" className="border-t border-warning/30 bg-warning/10 px-4 py-1.5 text-center text-xs text-warning">
            Your browser is blocking storage for this embedded page — likes and playlists won't be saved after you leave.
          </div>
        )}
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
