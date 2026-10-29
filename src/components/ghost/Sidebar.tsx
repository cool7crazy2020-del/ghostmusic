import { Link } from "@tanstack/react-router";
import { Ghost, Heart, History, Home, Library, ListMusic, Plus, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CreatePlaylistDialog } from "./CreatePlaylistDialog";
import { useLibrary } from "./library-context";

const NAV = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/liked", label: "Liked Songs", icon: Heart },
  { to: "/history", label: "History", icon: History },
] as const;

const navLink =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring";
const navActive = "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-primary";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg px-3 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow-sm">
        <Ghost className="size-5" strokeWidth={2.2} />
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
        GHOST<span className="text-primary"> Music</span>
      </span>
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { playlists, ready } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-6 py-5">
      <Logo />
      <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: "exact" in item ? item.exact : false }}
            className={navLink}
            activeProps={{ className: navActive, "aria-current": "page" }}
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col px-3">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your playlists
          </span>
          <Button variant="subtle" size="icon-sm" aria-label="Create playlist" onClick={() => setDialogOpen(true)}>
            <Plus />
          </Button>
        </div>
        <div className="ghost-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {ready && playlists.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No playlists yet.</p>
          )}
          {playlists.map((p) => (
            <Link
              key={p.id}
              to="/playlists/$playlistId"
              params={{ playlistId: p.id }}
              onClick={onNavigate}
              className={cn(navLink, "py-1.5")}
              activeProps={{ className: navActive, "aria-current": "page" }}
            >
              <ListMusic className="size-4 shrink-0" />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <CreatePlaylistDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex-col border-r border-sidebar-border bg-sidebar", className)} aria-label="Sidebar">
      <SidebarContent />
    </aside>
  );
}
