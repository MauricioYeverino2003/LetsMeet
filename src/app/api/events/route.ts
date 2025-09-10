// Verify Id exists, either guest or supabase user.
// verify captcha
// Validate payload (Zod) + 2-week rule
// On succesful creation return id.

// app/api/events/route.ts
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";import { createClient } from "@supabase/supabase-js";
import { getGuestIdFromCookie } from "@/lib/identity";
import { z } from "zod";

const CreateEventSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional().default(""),
  timezone: z.string().refine(isValidTimeZone, "Invalid IANA timezone"),
  starts_at: z.iso.datetime(), // ISO string
  ends_at: z.iso.datetime(),   // ISO string
  captchaToken: z.string().min(1).optional(), // optional if you’ll only require for guests
  // (optional) display name to seed event_participants
  display_name: z.string().min(1).max(30).optional(),
});


// HELPERS
function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function withinTwoWeeks(startISO: string, endISO: string) {
  const now = Date.now();
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  if (end <= start) return false;
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  return start - now <= twoWeeksMs && end - now <= twoWeeksMs;
}

// Need helper to verify captcha

export async function POST(req: NextRequest) {
  // 1) get Supabase user (if logged in)
  const cookieStore = await cookies();
  const store = await cookies(); // Next 15: await it
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read ALL cookies (optionally filter by name)
        getAll(name?: string) {
          // Next’s RequestCookies.getAll optionally accepts a name
          const list = name ? store.getAll(name) : store.getAll();
          return list.map(({ name, value }) => ({ name, value }));
        },
        // Set ALL cookies Supabase asks for (atomic batch)
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            store.set({ name, value, ...(options ?? {}) });
          }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // 2) fall back to guest cookie
  const guestId = user ? null : getGuestIdFromCookie();
  if (!user && !guestId) {
    return NextResponse.json({ error: "No identity" }, { status: 401 });
  }

  // 3) PARSE AND VALIDATE PAYLOAD (SHAPE + 2-WEEK RULE)

  const body = await req.json();
  //const body = await req.json().catch(() => null); IDK WHY CATCH NULL
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { title, description, timezone, starts_at, ends_at, captchaToken, display_name } = parsed.data;

  if (!withinTwoWeeks(starts_at, ends_at)) {
    return NextResponse.json(
      { error: "Event must start/end within 14 days and end after start" },
      { status: 400 }
    );
  }

  // MAKE CAPTCHA VERIFIER FOR GUESTS.

  // Write using SERVICE ROLE (bypasses RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only secret
    { auth: { persistSession: false } }
  );

  const { data: eventRow, error: eventErr } = await admin
    .from("events")
    .insert({
      title,
      description,
      timezone,
      starts_at,
      ends_at,
      // If you kept creator fields out of your schema, omit them.
    })
    .select("id")
    .single();

  if (eventErr || !eventRow) {
    return NextResponse.json({ error: "Failed to create event", details: eventErr?.message }, { status: 500 });
  }

  const eventId = eventRow.id as string;

  return NextResponse.json({ eventId }, { status: 201 });
}
