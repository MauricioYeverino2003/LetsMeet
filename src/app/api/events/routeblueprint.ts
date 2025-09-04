// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getGuestIdFromCookie } from "@/lib/identity";

// ---------- ZOD SCHEMA ----------
const CreateEventSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional().default(""),
  timezone: z.string().refine(isValidTimeZone, "Invalid IANA timezone"),
  starts_at: z.string().datetime(), // ISO string
  ends_at: z.string().datetime(),   // ISO string
  captchaToken: z.string().min(1).optional(), // optional if you’ll only require for guests
  // (optional) display name to seed event_participants
  display_name: z.string().min(1).max(60).optional(),
});

// ---------- HELPERS ----------
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

async function verifyCaptcha(token: string) {
  // Example for reCAPTCHA v2/v3; swap endpoint/params if using Turnstile
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean; score?: number };
    // If using v3, you might also check score >= 0.5
    return Boolean(data.success);
  } catch {
    return false;
  }
}

// ---------- ROUTE ----------
export async function POST(req: NextRequest) {
  // 1) Identify user or guest (prefer user if both)
  const cookieStore = cookies();
  const supabaseUserClient = createServerComponentClient(
    { cookies: () => cookieStore },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  const guestId = user ? null : getGuestIdFromCookie();
  if (!user && !guestId) {
    return NextResponse.json({ error: "No identity" }, { status: 401 });
  }

  // 2) Parse & validate payload (shape + 2-week rule)
  const body = await req.json().catch(() => null);
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

  // 3) (Optional) Require CAPTCHA for guests only
  if (!user) {
    if (!captchaToken) {
      return NextResponse.json({ error: "Missing CAPTCHA token" }, { status: 400 });
    }
    const ok = await verifyCaptcha(captchaToken);
    if (!ok) {
      return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
    }
  }

  // 4) Write using SERVICE ROLE (bypasses RLS; your API is the gatekeeper)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only secret
    { auth: { persistSession: false } }
  );

  // Insert event and a participant row in a transaction-like flow
  // (Supabase JS doesn’t have multi-statement tx; keep it simple and handle errors)
  const { data: eventRows, error: eventErr } = await admin
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

  if (eventErr || !eventRows) {
    return NextResponse.json({ error: "Failed to create event", details: eventErr?.message }, { status: 500 });
  }

  const eventId = eventRows.id as string;

  // Seed event_participants (host/participant) so they can post availability/chat later
  const participantPayload: Record<string, unknown> = {
    event_id: eventId,
    display_name: display_name ?? "Anonymous", // or omit if you set later
  };
  if (user?.id) participantPayload.user_id = user.id;
  else participantPayload.guest_id = guestId;

  const { error: partErr } = await admin.from("event_participants").insert(participantPayload);
  if (partErr) {
    // Optional: best-effort cleanup (delete the event) or just report
    // await admin.from("events").delete().eq("id", eventId);
    return NextResponse.json(
      { error: "Failed to add participant", details: partErr.message, eventId },
      { status: 500 }
    );
  }

  // 5) Return created id
  return NextResponse.json({ eventId }, { status: 201 });
}