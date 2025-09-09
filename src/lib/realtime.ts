// src/lib/realtime.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
function getBrowserSupabase() {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

export function subscribeToEvent(eventId: string, onAnyChange: () => void) {
  const supabase = getBrowserSupabase();

  const channel = supabase
    .channel(`event-${eventId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "availabilities", filter: `event_id=eq.${eventId}` },
      () => onAnyChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_participants", filter: `event_id=eq.${eventId}` },
      () => onAnyChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}