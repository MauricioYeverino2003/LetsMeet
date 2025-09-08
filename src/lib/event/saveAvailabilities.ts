type SlotPayload = { slot_start: string; slot_end: string };
export default async function saveAvailabilities(eventId: string, slots: SlotPayload[], replaceAll = true) {
  const res = await fetch(`/api/events/${eventId}/availabilities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ slots, replaceAll }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to save availability");
  return data as { ok: true; count: number };
}