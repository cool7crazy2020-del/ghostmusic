import { cn } from "@/lib/utils";

export function AvailabilityBadge({ playable, className }: { playable: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider",
        playable
          ? "border-primary/40 text-primary"
          : "border-border text-muted-foreground",
        className,
      )}
      title={playable ? "Audio available" : "Audio unavailable"}
    >
      {playable ? "Available" : "Unavailable"}
    </span>
  );
}
