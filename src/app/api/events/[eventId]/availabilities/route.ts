import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";
import { getGuestIdFromCookie } from "@/lib/identity";
//Still need to retrieve availabilities of everyone in the event. Add real time and add supabase users.
const SlotsSchema = z.object({
  slots: z.array(z.object({
    slot_start: z.iso.datetime(), // ISO
    slot_end: z.iso.datetime(),   // ISO
  })).min(1).max(500),                 // keep it sane
  replaceAll: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const store = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(n?: string) {
          const list = n ? store.getAll(n) : store.getAll();
          return list.map(({ name, value }) => ({ name, value }));
        },
        setAll(pairs) {
          for (const { name, value, options } of pairs) store.set({ name, value, ...(options ?? {}) });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const guestId = user ? null : await getGuestIdFromCookie();
  if (!user && !guestId) return NextResponse.json({ error: "No identity" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }
  );

  // Resolve participant
  let q = admin
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)

  q = user ? q.eq("user_id", user.id) : q.eq("guest_id", guestId!); 
  const { data: participant } = await q.maybeSingle()

  if (!participant) return NextResponse.json({ error: "Confirm name first" }, { status: 403 });

  // Validate slots
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = SlotsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slots", details: parsed.error.flatten() }, { status: 400 });
  }
  const { slots, replaceAll } = parsed.data;

  // Optional: sanity check slot_end > slot_start (DB should also enforce)
  if (slots.some(s => Date.parse(s.slot_end) <= Date.parse(s.slot_start))) {
    return NextResponse.json({ error: "slot_end must be after slot_start" }, { status: 400 });
  }

  const rows = slots.map(s => ({
    event_id: eventId,
    participant_id: participant.id,
    slot_start: s.slot_start,
    slot_end: s.slot_end,
  }));

  // Replace strategy (simple & predictable): delete → insert
  if (replaceAll) {
    await admin.from("availabilities")
      .delete()
      .eq("event_id", eventId)
      .eq("participant_id", participant.id);
  }

  const { error: insErr } = await admin.from("availabilities").insert(rows);
  if (insErr) return NextResponse.json({ error: "Failed to save availabilities", details: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
