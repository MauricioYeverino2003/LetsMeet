import { NextResponse } from "next/server";
import { getGuestIdFromCookie } from "@/lib/identity";

export async function GET() {
  const guestId = await getGuestIdFromCookie();

  if (!guestId) {
    return NextResponse.json({ error: "No guest_id cookie" }, { status: 401 });
  }

  return NextResponse.json({ guest_id: guestId });
}