export default async function getMyParticipant(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/participants/me`, {
    credentials: "same-origin",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch participant");
  return data as { participant: { id: string; display_name: string } | null };
}
