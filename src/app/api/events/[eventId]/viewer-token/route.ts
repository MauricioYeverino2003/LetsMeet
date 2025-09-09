// app/api/events/[eventId]/viewer-token/route.ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);

  const token = await new SignJWT({ role: "anon", event_id: eventId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("your-app")
    .setAudience("supabase")
    .setExpirationTime("15m")
    .sign(secret);

  return NextResponse.json({ token });
}
