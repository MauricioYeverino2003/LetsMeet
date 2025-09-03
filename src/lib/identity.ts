// lib/identity.ts
import "server-only";               // ensures this can't be imported by client code
import { cookies } from "next/headers";

export async function getGuestIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("guest_id")?.value ?? null;
}
