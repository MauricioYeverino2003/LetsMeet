
// Gets grid default offsets based on Start date, End date and timezone.
export function getGridDefaults(startsAtISO: string, endsAtISO: string, timezone: string) {
  const now = new Date();

  // Helper to extract Y/M/D in a timezone
  const getYMD = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    return {
      year: Number(parts.find(p => p.type === "year")?.value),
      month: Number(parts.find(p => p.type === "month")?.value),
      day: Number(parts.find(p => p.type === "day")?.value),
    };
  };

  // Midnight UTC of a day in that tz
  const toMidnightUTC = (d: Date) => {
    const { year, month, day } = getYMD(d);
    return new Date(Date.UTC(year, month - 1, day));
  };

  // Helper to get hour 0–23 in tz
  const getHour = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    return Number(parts.find(p => p.type === "hour")?.value);
  };

  const start = new Date(startsAtISO);
  const end = new Date(endsAtISO);

  const baseMidnight = toMidnightUTC(now);
  const startMidnight = toMidnightUTC(start);
  const endMidnight = toMidnightUTC(end);

  const startDay = Math.floor((startMidnight.getTime() - baseMidnight.getTime()) / 86_400_000);
  const endDay = Math.floor((endMidnight.getTime() - baseMidnight.getTime()) / 86_400_000);

  const startHour = getHour(start);
  const endHour = getHour(end);

  return { startDay, endDay, startHour, endHour };
}
