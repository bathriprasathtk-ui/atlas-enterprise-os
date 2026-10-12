/* =========================================================
   GET /api/integrations
   Honest integration status for the Integrations page.

   * Requires an authenticated session.
   * Reports only booleans about server configuration —
     never reveals key values.
   * Third-party connectors that do not exist in the code
     base are reported as "not_implemented" instead of a
     fake "Connected" state.
========================================================= */

import { NextResponse } from "next/server";

import { getRouteAuth } from "@/lib/routeAuth";

export type IntegrationStatus =
  | "configured"
  | "unconfigured"
  | "not_implemented";

export type IntegrationService = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  detail: string;
};

export async function GET() {
  const { user } = await getRouteAuth();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  const services: IntegrationService[] = [
    {
      id: "supabase",
      name: "Supabase",
      category: "Database & authentication",
      description:
        "PostgreSQL database, row-level security and user authentication.",
      status: hasSupabase ? "configured" : "unconfigured",
      detail: hasSupabase
        ? "Environment variables are set; sessions and queries are live."
        : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    },
    {
      id: "storage",
      name: "Supabase Storage",
      category: "File storage",
      description:
        "Private bucket for uploaded PDFs, fetched through short-lived signed URLs.",
      status: hasSupabase ? "configured" : "unconfigured",
      detail: hasSupabase
        ? "Uses the same Supabase project; bucket 'documents' must exist."
        : "Requires the Supabase environment variables to be set.",
    },
    {
      id: "gemini",
      name: "Google Gemini",
      category: "AI model",
      description:
        "Chat answers, document embeddings and semantic search ranking.",
      status: hasGemini ? "configured" : "unconfigured",
      detail: hasGemini
        ? "Server-side GEMINI_API_KEY is set; AI routes are available."
        : "Set GEMINI_API_KEY on the server. AI routes return 503 until then.",
    },
    {
      id: "github",
      name: "GitHub",
      category: "Development",
      description:
        "Connect repositories, commits, issues and pull requests.",
      status: "not_implemented",
      detail:
        "No GitHub connector ships with this build. Nothing is connected.",
    },
    {
      id: "slack",
      name: "Slack",
      category: "Messaging",
      description:
        "Bring team conversations and notifications into Atlas.",
      status: "not_implemented",
      detail:
        "No Slack connector ships with this build. Nothing is connected.",
    },
    {
      id: "google-workspace",
      name: "Google Workspace",
      category: "Productivity",
      description: "Connect Drive, Docs and other Google Workspace services.",
      status: "not_implemented",
      detail:
        "No Google Workspace connector ships with this build. Nothing is connected.",
    },
    {
      id: "microsoft-365",
      name: "Microsoft 365",
      category: "Productivity",
      description:
        "Connect Microsoft productivity and collaboration tools.",
      status: "not_implemented",
      detail:
        "No Microsoft 365 connector ships with this build. Nothing is connected.",
    },
  ];

  return NextResponse.json(
    { services },
    { headers: { "Cache-Control": "no-store" } }
  );
}
