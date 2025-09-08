import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getGuestIdFromCookie } from "@/lib/identity";

// ON EVENT MOUNT
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const store = await cookies();

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
          for (const { name, value, options } of pairs) store.set({ name, value, ...(options ?? {}) });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const guestId = user ? null : await getGuestIdFromCookie();
  if (!user && !guestId) return NextResponse.json({ participant: null });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }
  );

  let q = admin
    .from("event_participants")
    .select("id, display_name")
    .eq("event_id", eventId)
    
    q = user ? q.eq("user_id", user.id) : q.eq("guest_id", guestId!);

  const { data: existing } = await q.maybeSingle();

  return NextResponse.json({
    participant: existing ? { id: existing.id, display_name: existing.display_name } : null
  });
}
