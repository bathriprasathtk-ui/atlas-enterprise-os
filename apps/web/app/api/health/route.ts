/* =========================================================
   GET /api/health

   Unauthenticated liveness probe for containers, load
   balancers and monitoring. Reports only non-sensitive
   configuration state (booleans), never values.
========================================================= */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      configured: {
        supabase: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ),
        gemini: Boolean(process.env.GEMINI_API_KEY),
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
