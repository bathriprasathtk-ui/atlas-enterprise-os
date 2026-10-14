import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/*
 * Deployment misconfiguration guard.
 *
 * Supabase reads its URL/key straight from the environment, so a
 * build or host provisioned without them would otherwise throw
 * inside `createServerClient` and surface a raw 500 plus the
 * upstream library's internal message on every protected page and
 * API route. Answer 503 instead: the request is fine, the server
 * is not yet configured. Only variable *names* are printed.
 */
const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

/** Ceiling for JSON request bodies on /api/* (bytes). */
const MAX_API_BODY_BYTES = 1_000_000;

function isConfigured() {
  return Boolean(
    process.env[SUPABASE_URL_ENV] &&
      process.env[SUPABASE_KEY_ENV]
  );
}

function configurationMissing(isApi: boolean) {
  const names = `${SUPABASE_URL_ENV}, ${SUPABASE_KEY_ENV}`;

  if (isApi) {
    return NextResponse.json(
      {
        error: `Server is not configured: set ${names}.`,
        code: "supabase_not_configured",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const body = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Atlas Enterprise OS — configuration required</title>
  </head>
  <body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#06101b;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
    <main style="max-width:38rem">
      <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#22d3ee;margin:0 0 12px">Atlas Enterprise OS</p>
      <h1 style="font-size:1.5rem;margin:0 0 12px">This deployment is not configured yet</h1>
      <p style="line-height:1.6;color:#94a3b8;margin:0 0 16px">The application is running, but Supabase credentials are missing, so sign-in and workspace data are unavailable.</p>
      <p style="line-height:1.6;color:#94a3b8;margin:0 0 16px">Set these environment variables (names only — never commit their values), then restart:</p>
      <pre style="background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;overflow:auto;font-size:13px;color:#e2e8f0">${names}</pre>
      <p style="line-height:1.6;color:#64748b;font-size:13px;margin-top:16px">See <code>apps/web/.env.example</code> and <code>docs/DEPLOYMENT.md</code>. Health status: <a style="color:#22d3ee" href="/api/health">/api/health</a>.</p>
    </main>
  </body>
</html>`;

  return new NextResponse(body, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi =
    pathname === "/api" || pathname.startsWith("/api/");

  /*
   * Liveness must never depend on configuration: the container
   * health check reads /api/health, and that endpoint already
   * reports `configured: false` honestly on its own.
   */
  if (pathname === "/api/health") {
    return NextResponse.next({ request });
  }

  /*
   * Cheap, stateless request-size guard for API traffic. Every
   * API body in this app is small JSON (file bytes are pulled
   * server-side from Storage, never uploaded through these
   * routes), so a generous 1 MB ceiling rejects runaway payloads
   * before any handler parses them. Note: this reads the declared
   * Content-Length, so a chunked body without the header is not
   * covered — that residual case is documented in DEPLOYMENT.md.
   */
  const declaredBytes = Number(
    request.headers.get("content-length") ?? "0"
  );

  if (
    isApi &&
    Number.isFinite(declaredBytes) &&
    declaredBytes > MAX_API_BODY_BYTES
  ) {
    return NextResponse.json(
      {
        error: `Request body exceeds ${MAX_API_BODY_BYTES} bytes.`,
        code: "payload_too_large",
      },
      { status: 413, headers: { "Cache-Control": "no-store" } }
    );
  }

  /* Never construct a client without configuration. */
  if (!isConfigured()) {
    return configurationMissing(isApi);
  }

  /*
   * API handlers authenticate themselves through
   * `getRouteAuth()` and answer 401 on their own; middleware only
   * owns page navigation, so pass API traffic straight through.
   */
  if (isApi) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isWorkspace =
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/");

  const isLogin = pathname === "/login";

  if (isWorkspace && !user) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (isLogin && user) {
    return NextResponse.redirect(
      new URL("/workspace/dashboard", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/login",
    "/api/:path*",
  ],
};
