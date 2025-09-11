export  const getUrl = (id: string) => {
  const path = `/event/${id}`;

  // Client-side (preferred): use the live origin (works on prod, preview, local)
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  // SSR fallback (in case this runs during render)
  // 1) Custom domain/base you control in env
  const envBase =
    process.env.NEXT_PUBLIC_SITE_URL || // e.g., https://myapp.com
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` // e.g., https://my-app.vercel.app
      : "");

  return new URL(path, envBase || "http://localhost:3000").toString();
};
