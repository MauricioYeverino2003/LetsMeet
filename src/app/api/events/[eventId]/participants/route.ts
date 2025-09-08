import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getGuestIdFromCookie } from "@/lib/identity";

const NameSchema = z.object({ display_name: z.string().min(1).max(60) });

// ON CONFIRM NAME
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const store = await cookies();

  // Auth (user or guest)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(n?: string) {
          const list = n ? store.getAll(n) : store.getAll();
          return list.map(({ name, value }) => ({ name, value }));
        },
        setAll(pairs) {
          for (const { name, value, options } of pairs) {
            store.set({ name, value, ...(options ?? {}) });
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const guestId = user ? null : await getGuestIdFromCookie();
  if (!user && !guestId) {
    return NextResponse.json({ error: "No identity" }, { status: 401 });
  }

  // Validate name
  let body: unknown; // Letting Zod validate and narrow.
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = NameSchema.safeParse(body);
  if (!parsed.success) {
    const details = z.treeifyError(parsed.error);
    return NextResponse.json({ error: "Invalid name", details }, { status: 400 });
  }
  const { display_name } = parsed.data;

  // Use admin to write (bypass RLS for guests & simplicity)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1) Does a participant already exist for THIS actor on THIS event?
  let q = admin
    .from("event_participants")
    .select("id, display_name")
    .eq("event_id", eventId)
    
    q = user ? q.eq("user_id", user.id) : q.eq("guest_id", guestId!);

const { data: existing, error: findErr } = await q.maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: "Lookup failed", details: findErr.message }, { status: 500 });
  }

  if (existing) {
    // Already confirmed → lock (do not change display_name)
    return NextResponse.json({
      participantId: existing.id,
      display_name: existing.display_name,
      locked: true,
    });
  }

  // 2) Create a new participant (first time)
  const { data: inserted, error: insErr } = await admin
    .from("event_participants")
    .insert({
      event_id: eventId,
      user_id: user?.id ?? null,
      guest_id: user ? null : guestId,
      display_name,
    })
    .select("id, display_name")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json({ error: "Failed to create participant", details: insErr?.message }, { status: 500 });
  }

  return NextResponse.json({
    participantId: inserted.id,
    display_name: inserted.display_name,
    locked: true,
  });
}
