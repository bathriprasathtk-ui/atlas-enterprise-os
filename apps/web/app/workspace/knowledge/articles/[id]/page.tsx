"use client";

/* =========================================================
   KNOWLEDGE ARTICLE EDITOR
   Edit any article in your organization; every title or
   content save appends a new immutable version (0007).
   Old versions can be restored — the restore itself is
   recorded as a new version.
========================================================= */

import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ARTICLE_CATEGORIES,
  deleteArticle,
  getArticle,
  restoreArticleVersion,
  updateArticle,
  type Article,
  type ArticleVersion,
} from "@/lib/articles";
import { getProfileNames } from "@/lib/orgs";

function formatDate(value: string): string {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default function ArticleEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const articleId = params.id;

  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getArticle(articleId);

        if (cancelled) {
          return;
        }

        setArticle(data.article);
        setVersions(data.versions);
        setTitle(data.article.title);
        setContent(data.article.content);
        setCategory(data.article.category);
        setError(null);

        const creatorIds = Array.from(
          new Set(
            data.versions.map((version) => version.created_by)
          )
        );

        setNames(await getProfileNames(creatorIds));
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The article could not be loaded."
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
  }, [articleId, reloadKey]);

  const dirty =
    article !== null &&
    (title !== article.title ||
      content !== article.content ||
      category !== article.category);

  async function handleSave() {
    if (saving || !article) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await updateArticle(articleId, {
        title,
        content,
        category,
      });

      const data = await getArticle(articleId);
      setArticle(data.article);
      setVersions(data.versions);
      setTitle(data.article.title);
      setContent(data.article.content);
      setCategory(data.article.category);
      setNotice(
        `Saved — now version ${data.article.current_version}.`
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The article could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(version: ArticleVersion) {
    if (saving) {
      return;
    }

    const confirmed = window.confirm(
      `Restore version ${version.version_number}? Its title and content will be saved as a new version.`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await restoreArticleVersion(articleId, version);
      setReloadKey((key) => key + 1);
      setNotice(
        `Version ${version.version_number} restored as a new version.`
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The version could not be restored."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting || !article) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${article.title}" and its full version history? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteArticle(articleId);
      router.push("/workspace/knowledge/articles");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The article could not be deleted."
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Loading article…
      </div>
    );
  }

  if (!article) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p
          role="alert"
          className="text-sm text-red-300"
        >
          {error ?? "Article not found."}
        </p>

        <Link
          href="/workspace/knowledge/articles"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft size={13} />
          Back to articles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/workspace/knowledge/articles"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          <ArrowLeft size={13} />
          Articles
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-600">
            Version {article.current_version}
            {dirty ? " · unsaved changes" : ""}
          </span>

          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}

            Save
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-medium text-red-300/80 transition-colors hover:border-red-400/40 hover:bg-red-400/[0.08] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-300"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3 text-xs leading-5 text-cyan-200"
        >
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Editor */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <label className="sr-only" htmlFor="article-title">
            Article title
          </label>

          <input
            id="article-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Article title"
            className="w-full rounded-lg border border-transparent bg-transparent pb-3 text-xl font-semibold text-white outline-none transition-colors placeholder:text-slate-600 focus:border-white/[0.09] focus:bg-white/[0.02]"
          />

          <div className="mb-3 flex items-center gap-3">
            <label className="text-[11px] text-slate-600">
              Category
            </label>

              <select
                value={category ?? ""}
                onChange={(event) =>
                  setCategory(event.target.value || null)
                }
                className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-slate-300 outline-none transition-colors focus:border-cyan-400/30"
              >
                <option value="">None</option>

                {ARTICLE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
          </div>

          <label className="sr-only" htmlFor="article-content">
            Article content
          </label>

          <textarea
            id="article-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write the article…"
            rows={22}
            className="w-full resize-y rounded-xl border border-white/[0.07] bg-black/[0.12] px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/[0.18]"
          />
        </section>

        {/* Version history */}
        <aside className="h-fit rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-white">
            Version history
          </h2>

          <p className="mt-1 text-[11px] leading-4 text-slate-600">
            Every save is recorded. Restoring an old version
            appends a new one.
          </p>

          <div className="mt-4 space-y-2">
            {versions.map((version) => {
              const current =
                version.version_number ===
                article.current_version;

              return (
                <div
                  key={version.id}
                  className="rounded-xl border border-white/[0.05] bg-black/[0.08] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-300">
                      v{version.version_number}

                      {current ? (
                        <span className="ml-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-cyan-400">
                          Current
                        </span>
                      ) : null}
                    </p>

                    {!current ? (
                      <button
                        type="button"
                        disabled={saving || dirty}
                        title={
                          dirty
                            ? "Save your changes first"
                            : `Restore version ${version.version_number}`
                        }
                        onClick={() => void handleRestore(version)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-500 transition-colors hover:border-cyan-400/30 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-1 text-[11px] text-slate-600">
                    {names[version.created_by] ?? "Member"} ·{" "}
                    {formatDate(version.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
