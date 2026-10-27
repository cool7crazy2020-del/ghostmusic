/** Pure queue navigation helpers used by the player. */

export const RESTART_THRESHOLD_SEC = 3;

export function nextIndex(length: number, index: number): number | null {
  if (length === 0 || index < 0) return null;
  return index + 1 < length ? index + 1 : null;
}

/** "Previous" restarts the current track when more than 3s in, like most players. */
export function previousAction(
  index: number,
  currentTime: number,
): { kind: "restart" } | { kind: "go"; index: number } {
  if (currentTime > RESTART_THRESHOLD_SEC || index <= 0) return { kind: "restart" };
  return { kind: "go", index: index - 1 };
}

/** Removing an item before the current one shifts the current index left. */
export function indexAfterRemoval(currentIndex: number, removedIndex: number): number {
  if (removedIndex < currentIndex) return currentIndex - 1;
  return currentIndex;
}

export function formatTime(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "0:00";
  const s = Math.floor(totalSec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
