/* =========================================================
   AI CONVERSATION HISTORY

   - saveConversation(): SERVER ONLY (ask route) — persists
     the exchange for the authenticated user.
   - listConversations()/deleteConversation(): client —
     own history only (RLS + explicit user scoping).
========================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient.ts";

export type AiConversation = {
  id: string;
  prompt: string;
  response: string;
  model: string;
  sources: { documentId: string; title: string }[] | null;
  response_time_ms: number | null;
  created_at: string;
};

/**
 * Persists one exchange. Never throws and never logs the
 * prompt/response content — history storage is best-effort.
 */
export async function saveConversation(
  serverSupabase: SupabaseClient,
  input: {
    prompt: string;
    response: string;
    model: string;
    sources?: { documentId: string; title: string }[];
    responseTimeMs: number;
  }
): Promise<void> {
  try {
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data: orgId } = await serverSupabase.rpc(
      "current_org_id"
    );

    if (!orgId) {
      return;
    }

    await serverSupabase.from("ai_conversations").insert({
      user_id: user.id,
      organization_id: orgId as string,
      prompt: input.prompt.slice(0, 8000),
      response: input.response.slice(0, 32000),
      model: input.model,
      sources: input.sources ?? null,
      response_time_ms: Math.round(input.responseTimeMs),
    });
  } catch {
    /* Best-effort: never break the answer path. */
  }
}

export async function listConversations(
  limit = 20
): Promise<AiConversation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .select(
      "id, prompt, response, model, sources, response_time_ms, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function deleteConversation(
  id: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
