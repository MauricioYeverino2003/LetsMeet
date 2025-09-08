export default async function confirmParticipant(eventId: string, display_name: string) {
  const res = await fetch(`/api/events/${eventId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ display_name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to confirm participant");
  return data as { participantId: string; display_name: string; locked: true };
}