"use client";

/* =========================================================
   KNOWLEDGE ARTICLES — list + create
   Organization-wide wiki articles (migration 0007) with
   immutable version history in the editor.
========================================================= */

import { BookOpen, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import KnowledgeHeader from "@/components/knowledge/KnowledgeHeader";
import {
  ARTICLE_CATEGORIES,
  createArticle,
  listArticles,
  type ArticleCategory,
  type ArticleSummary,
} from "@/lib/articles";

function formatDate(value: string): string {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<
    ArticleCategory | ""
  >("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const rows = await listArticles();

        if (!cancelled) {
          setArticles(rows);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Articles could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(load);

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (creating) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const id = await createArticle({
        title: newTitle,
        category: newCategory || null,
      });

      router.push(`/workspace/knowledge/articles/${id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The article could not be created."
      );
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <KnowledgeHeader />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-300"
        >
          {error}
        </p>
      ) : null}

      {/* Create */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-white">
          New article
        </h2>

        <p className="mt-1 text-xs text-slate-600">
          Articles are visible to everyone in your organization.
          Every save records a new version.
        </p>

        <form
          onSubmit={(event) => void handleCreate(event)}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-[240px] flex-1">
            <span className="mb-1.5 block text-xs text-slate-500">
              Title
            </span>

            <input
              type="text"
              required
              maxLength={200}
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Engineering onboarding guide"
              className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs text-slate-500">
              Category
            </span>

            <select
              value={newCategory}
              onChange={(event) =>
                setNewCategory(
                  event.target.value as ArticleCategory | ""
                )
              }
              className="h-10 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-slate-300 outline-none transition-colors focus:border-cyan-400/30"
            >
              <option value="">None</option>

              {ARTICLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-cyan-400/10 px-4 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}

            Create
          </button>
        </form>
      </section>

      {/* List */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <h2 className="text-sm font-semibold text-white">
          Articles
        </h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading articles…
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BookOpen size={18} className="text-slate-600" />

            <p className="text-xs text-slate-600">
              No articles yet. Create the first one above.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/workspace/knowledge/articles/${article.id}`}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                  <BookOpen size={15} className="text-slate-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-300 group-hover:text-white">
                    {article.title}
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {article.category ?? "Uncategorized"} · v
                    {article.current_version} · updated{" "}
                    {formatDate(article.updated_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
