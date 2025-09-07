import { createClient } from "@supabase/supabase-js";
import EventClient from "./EventClient";

export default async function EventPage({ params }: { params: { id: string } }) {
  
  const { id } = await params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // only SELECT allowed by RLS
  );

  const { data: event, error } = await admin
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) {
    // handle 404
  }

  return <EventClient event={event} />; 
}