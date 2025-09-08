// src/lib/slots.ts
export type SlotPayload = { slot_start: string; slot_end: string };

/** Fast + simple: interpret [day, hour] as a UTC instant. */
export function cellsToUtcIsoSlots(
  selected: Set<string>,   // e.g. "2-14"
  dates: Date[],           // one Date per column (day)
  hours: number[],         // e.g. [9,10,11,...]
  durationMinutes = 60
): SlotPayload[] {
  const out: SlotPayload[] = [];
  for (const id of selected) {
    const [dStr, hStr] = id.split("-");
    const di = Number(dStr), hi = Number(hStr);
    const baseDay = dates[di];
    const hour = hours[hi];
    if (!baseDay || typeof hour !== "number") continue;

    const y = baseDay.getUTCFullYear();
    const m = baseDay.getUTCMonth();
    const d = baseDay.getUTCDate();

    const startMs = Date.UTC(y, m, d, hour, 0, 0);
    const endMs   = startMs + durationMinutes * 60_000;
    out.push({
      slot_start: new Date(startMs).toISOString(),
      slot_end:   new Date(endMs).toISOString(),
    });
  }
  return out;
}

/** TZ-aware: treat [day, hour] as WALL TIME in `tz`, return UTC ISO. */
export function cellsToIsoSlotsInZone(
  selected: Set<string>,
  dates: Date[],
  hours: number[],
  tz: string,              // IANA TZ from your event (e.g., "America/Los_Angeles")
  durationMinutes = 60
): SlotPayload[] {
  const out: SlotPayload[] = [];
  for (const id of selected) {
    const [dStr, hStr] = id.split("-");
    const di = Number(dStr), hi = Number(hStr);
    const baseDay = dates[di];
    const hour = hours[hi];
    if (!baseDay || typeof hour !== "number") continue;

    // Extract Y/M/D in the target TZ
    const y = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(baseDay));
    const m = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit" }).format(baseDay)) - 1;
    const d = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "2-digit" }).format(baseDay));

    // Nudge to the UTC instant that shows as the desired wall hour in `tz` (handles DST gaps/folds).
    let start = Date.UTC(y, m, d, hour, 0, 0);
    for (let i = 0; i < 3; i++) {
      const gotHour = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" })
          .format(new Date(start))
      );
      if (gotHour === hour) break;
      start += (hour - gotHour) * 60 * 60 * 1000;
    }

    const end = start + durationMinutes * 60_000;
    out.push({ slot_start: new Date(start).toISOString(), slot_end: new Date(end).toISOString() });
  }
  return out;
}
