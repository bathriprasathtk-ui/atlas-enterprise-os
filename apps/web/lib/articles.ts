/* =========================================================
   KNOWLEDGE ARTICLES (client data layer)

   PRD §9.3 / SRS §7.3 (REQ-KB-001/002): editable
   organization-wide articles with immutable version history
   (migration 0007). Versioning is enforced by a database
   trigger — saving an edit can never skip history, and
   restoring an old version simply appends a new one.

   Scoping mirrors the 0005 pattern: explicit
   organization_id filters on top of org-scoped RLS.
========================================================= */

import { logAuditClient } from "./audit.ts";
import { getCurrentOrgId, requireOrgId } from "./orgContext.ts";
import { supabase } from "./supabaseClient.ts";

export type Article = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

/** Lightweight row for the article list (no content). */
export type ArticleSummary = Omit<Article, "content">;

export type ArticleVersion = {
  id: string;
  version_number: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
};

/** Preset categories offered when creating an article. */
export const ARTICLE_CATEGORIES = [
  "General",
  "Policies",
  "Processes",
  "Guides",
  "Reference",
] as const;

export type ArticleCategory =
  (typeof ARTICLE_CATEGORIES)[number];

export const MAX_ARTICLE_TITLE_LENGTH = 200;
export const MAX_ARTICLE_CONTENT_LENGTH = 200_000;

/**
 * Pure validation shared by the UI and unit tests.
 * Returns an error message, or null when valid.
 */
export function validateArticleTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return "An article title is required.";
  }

  if (trimmed.length > MAX_ARTICLE_TITLE_LENGTH) {
    return `The title must be ${MAX_ARTICLE_TITLE_LENGTH} characters or fewer.`;
  }

  return null;
}

export function validateArticleContent(
  content: string
): string | null {
  if (content.length > MAX_ARTICLE_CONTENT_LENGTH) {
    return `Article content must be ${MAX_ARTICLE_CONTENT_LENGTH} characters or fewer.`;
  }

  return null;
}

/** Combined validation for the editor form. */
export function validateArticleInput(input: {
  title: string;
  content: string;
}): string | null {
  return (
    validateArticleTitle(input.title) ??
    validateArticleContent(input.content)
  );
}

/* =========================================================
   READS
========================================================= */

export async function listArticles(): Promise<ArticleSummary[]> {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from("knowledge_articles")
    .select(
      "id, title, category, current_version, created_by, created_at, updated_at"
    )
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ArticleSummary[];
}

/** Full article plus its complete version history. */
export async function getArticle(
  id: string
): Promise<{ article: Article; versions: ArticleVersion[] }> {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    throw new Error("You need to join an organization first.");
  }

  const [{ data, error }, { data: versionRows, error: versionError }] =
    await Promise.all([
      supabase
        .from("knowledge_articles")
        .select("*")
        .eq("id", id)
        .eq("organization_id", orgId)
        .maybeSingle(),
      supabase
        .from("knowledge_article_versions")
        .select(
          "id, version_number, title, content, created_by, created_at"
        )
        .eq("article_id", id)
        .eq("organization_id", orgId)
        .order("version_number", { ascending: false }),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  if (versionError) {
    throw new Error(versionError.message);
  }

  if (!data) {
    throw new Error("Article not found.");
  }

  return {
    article: data as Article,
    versions: (versionRows ?? []) as ArticleVersion[],
  };
}

/* =========================================================
   WRITES
========================================================= */

export async function createArticle(input: {
  title: string;
  content?: string;
  category?: string | null;
}): Promise<string> {
  const validation = validateArticleInput({
    title: input.title,
    content: input.content ?? "",
  });

  if (validation) {
    throw new Error(validation);
  }

  const orgId = await requireOrgId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create an article.");
  }

  const { data, error } = await supabase
    .from("knowledge_articles")
    .insert({
      organization_id: orgId,
      title: input.title.trim(),
      content: input.content ?? "",
      category: input.category || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "article.create",
    entity: "knowledge_article",
    entityId: data.id,
    metadata: { title: input.title.trim() },
  });

  return data.id as string;
}

/**
 * Saves the article. Any title/content change appends a new
 * version through the 0007 trigger.
 */
export async function updateArticle(
  id: string,
  patch: { title: string; content: string; category?: string | null }
): Promise<void> {
  const validation = validateArticleInput(patch);

  if (validation) {
    throw new Error(validation);
  }

  const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from("knowledge_articles")
    .update({
      title: patch.title.trim(),
      content: patch.content,
      ...(patch.category !== undefined
        ? { category: patch.category || null }
        : {}),
    })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("Article not found.");
  }

  await logAuditClient({
    action: "article.update",
    entity: "knowledge_article",
    entityId: id,
  });
}

/** Restores an earlier version's title and content. The
 *  restore itself is recorded as a new version. */
export async function restoreArticleVersion(
  articleId: string,
  version: Pick<ArticleVersion, "title" | "content">
): Promise<void> {
  await updateArticle(articleId, {
    title: version.title,
    content: version.content,
  });
}

export async function deleteArticle(id: string): Promise<void> {
  const orgId = await requireOrgId();

  const { data: deleted, error } = await supabase
    .from("knowledge_articles")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  /* A 0-row delete means RLS denied it (creator-or-admin). */
  if (!deleted || deleted.length === 0) {
    throw new Error(
      "Only the creator or an organization administrator can delete this article."
    );
  }

  await logAuditClient({
    action: "article.delete",
    entity: "knowledge_article",
    entityId: id,
  });
}
