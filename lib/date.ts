/**
 * Local-timezone date helpers. The app filters meals by the user's *local* day,
 * but `eaten_at` is stored as UTC (timestamptz). Using `toISOString()` for the
 * date key breaks near midnight (UTC ≠ local), so we derive keys from local
 * components and convert local-day bounds to UTC for the query.
 */

/** YYYY-MM-DD from a date's LOCAL components (not UTC). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * UTC ISO bounds for a local calendar day. `new Date('YYYY-MM-DDT..')` (no
 * offset) is parsed as local time, so `.toISOString()` yields the matching UTC
 * instant — exactly what a timestamptz comparison needs.
 */
export function localDayRange(dateKey: string): { start: string; end: string } {
  return {
    start: new Date(`${dateKey}T00:00:00`).toISOString(),
    end: new Date(`${dateKey}T23:59:59.999`).toISOString(),
  };
}
