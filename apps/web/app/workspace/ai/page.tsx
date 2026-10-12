"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Sparkles,
  Send,
  FileText,
  History,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  deleteConversation,
  listConversations,
  type AiConversation,
} from "@/lib/aiConversations";
import { timeAgo } from "@/lib/format";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  error?: boolean;
};

const suggestions = [
  "Summarize my knowledge base",
  "What are the key points in my most recent document?",
  "Find information about project status",
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AiConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Load conversation history (own rows only, via RLS). */
  useEffect(() => {
    let cancelled = false;

    listConversations(20)
      .then((rows) => {
        if (!cancelled) {
          setHistory(rows);
        }
      })
      .catch(() => {
        /* History is non-critical; the chat still works. */
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Keep the newest message in view. */
  useEffect(() => {
    const element = scrollRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, sending]);

  async function ask(question: string) {
    const trimmed = question.trim();

    if (!trimmed || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        sources?: string[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        setMessages((current) => [
          ...current,
          {
            id: newId(),
            role: "assistant",
            content:
              payload.error ??
              "Atlas AI could not process that request. Please try again.",
            error: true,
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "assistant",
          content:
            payload.answer ?? "No answer was returned.",
          sources: payload.sources ?? [],
        },
      ]);

      /* Refresh history in the background. */
      void listConversations(20)
        .then(setHistory)
        .catch(() => undefined);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "assistant",
          content:
            "A network error occurred while contacting Atlas AI. Check your connection and try again.",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  function applySuggestion(text: string) {
    void ask(text);
  }

  async function handleDeleteHistory(id: string) {
    try {
      await deleteConversation(id);
      setHistory((current) =>
        current.filter((row) => row.id !== id)
      );
    } catch {
      /* Keep the row; the user can retry. */
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08]">
            <Bot size={21} className="text-violet-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Atlas AI
              </h1>

              <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                ✦ AI
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Answers grounded in your uploaded documents
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main chat panel */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-500/[0.05] blur-[100px]" />

          <div className="relative">
            {/* Messages */}
            <div
              ref={scrollRef}
              className="min-h-[320px] max-h-[52vh] space-y-6 overflow-y-auto pr-1"
            >
              {messages.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] shadow-[0_0_40px_rgba(139,92,246,0.08)]">
                    <Sparkles
                      size={28}
                      className="text-violet-400"
                    />
                  </div>

                  <h2 className="mt-6 text-xl font-semibold text-white">
                    How can Atlas help?
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Ask questions about your documents. Atlas
                    retrieves the most relevant passages from
                    your knowledge base and cites the documents
                    it used.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex gap-3"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        message.role === "user"
                          ? "bg-white/[0.06]"
                          : "bg-violet-400/[0.1]"
                      }`}
                    >
                      {message.role === "user" ? (
                        <span className="text-[11px] font-semibold text-slate-300">
                          You
                        </span>
                      ) : (
                        <Bot
                          size={17}
                          className="text-violet-400"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium ${
                          message.role === "user"
                            ? "text-slate-400"
                            : "text-violet-300"
                        }`}
                      >
                        {message.role === "user"
                          ? "You"
                          : "Atlas AI"}
                      </p>

                      <div
                        className={`mt-2 rounded-2xl p-4 ${
                          message.error
                            ? "border border-amber-400/20 bg-amber-400/[0.05]"
                            : message.role === "assistant"
                              ? "border border-violet-400/10 bg-violet-400/[0.035]"
                              : ""
                        }`}
                      >
                        {message.error ? (
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              size={15}
                              className="mt-0.5 shrink-0 text-amber-400"
                            />

                            <p className="text-sm leading-6 text-amber-200/80">
                              {message.content}
                            </p>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {message.content}
                          </p>
                        )}

                        {message.sources &&
                        message.sources.length > 0 ? (
                          <div className="mt-3 border-t border-white/[0.06] pt-3">
                            <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              <FileText size={11} />
                              Sources
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {message.sources.map((source) => (
                                <span
                                  key={source}
                                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-400"
                                >
                                  {source}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {sending ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-400/[0.1]">
                    <Bot
                      size={17}
                      className="text-violet-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2
                      size={14}
                      className="animate-spin text-violet-400"
                    />
                    Searching your knowledge base…
                  </div>
                </div>
              ) : null}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="mt-5"
            >
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      void ask(input);
                    }
                  }}
                  placeholder="Ask Atlas anything..."
                  rows={3}
                  disabled={sending}
                  aria-label="Ask Atlas a question"
                  className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black/[0.12] px-4 py-4 pb-14 text-sm leading-6 text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-400/25 focus:bg-black/[0.18] focus:ring-1 focus:ring-violet-400/10 disabled:opacity-60"
                />

                <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] text-slate-600">
                  <span>
                    Enter to send · Shift+Enter for a new line
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400 text-[#10091c] transition-all hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} strokeWidth={2} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Sidebar: history + suggestions */}
        <aside className="space-y-6">
          {/* History */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <History size={14} className="text-slate-500" />

              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                History
              </h2>
            </div>

            {historyLoading ? (
              <div className="flex items-center gap-2 py-4 text-[11px] text-slate-600">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </div>
            ) : history.length === 0 ? (
              <p className="py-4 text-[11px] leading-5 text-slate-600">
                Your conversations with Atlas will appear
                here.
              </p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {history.map((row) => (
                  <div
                    key={row.id}
                    className="group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([
                          {
                            id: row.id,
                            role: "user",
                            content: row.prompt,
                          },
                          {
                            id: `${row.id}-a`,
                            role: "assistant",
                            content: row.response,
                            sources:
                              row.sources?.map(
                                (source) => source.title
                              ) ?? [],
                          },
                        ]);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[11px] text-slate-400 group-hover:text-white">
                        {row.prompt}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {timeAgo(row.created_at)}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteHistory(row.id)
                      }
                      aria-label="Delete conversation"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Suggestions */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Try asking
            </h2>

            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={sending}
                  onClick={() => applySuggestion(suggestion)}
                  className="w-full rounded-xl border border-white/[0.06] bg-black/[0.08] p-3 text-left text-[11px] leading-5 text-slate-400 transition-all hover:border-violet-400/20 hover:text-white disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
