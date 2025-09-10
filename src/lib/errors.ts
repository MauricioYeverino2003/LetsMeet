// src/lib/errors.ts
import { ZodError } from "zod";

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;

  // Supabase/PostgREST-ish shapes
  if (err && typeof err === "object") {
    const anyErr = err as { message?: string; error?: string; details?: string };
    if (typeof anyErr.message === "string") return anyErr.message;
    if (typeof anyErr.error === "string") return anyErr.error;
    if (typeof anyErr.details === "string") return anyErr.details;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return err.issues.map(i => i.message).join(", ");
  }

  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}
