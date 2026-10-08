"use client";

import { FormEvent, useState } from "react";
import {
  Bot,
  Sparkles,
  Send,
  BrainCircuit,
  FileText,
  Search,
  Zap,
} from "lucide-react";

const suggestions = [
  {
    title: "Summarize my knowledge",
    description: "Get a quick overview of your workspace documents.",
    icon: FileText,
  },
  {
    title: "Find important information",
    description: "Search your organization's knowledge.",
    icon: Search,
  },
  {
    title: "Analyze workspace activity",
    description: "Understand recent trends and activity.",
    icon: BrainCircuit,
  },
];

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    setSubmitted(true);
  }

  function useSuggestion(text: string) {
    setMessage(text);
    setSubmitted(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 sm:space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08]">
            <Bot
              size={21}
              className="text-violet-400"
            />
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
              Your intelligent workspace assistant
            </p>
          </div>

        </div>
      </div>

      {/* Main AI panel */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-8">

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-500/[0.05] blur-[100px]" />

        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-cyan-500/[0.035] blur-[100px]" />

        <div className="relative">

          {/* Empty state */}
          {!submitted && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">

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
                Ask questions about your workspace,
                documents, projects, and organizational
                knowledge.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-2">

                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-500">
                  Workspace knowledge
                </span>

                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-500">
                  Documents
                </span>

                <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-500">
                  Projects
                </span>

              </div>

            </div>
          )}

          {/* Temporary submitted state */}
          {submitted && (
            <div className="min-h-[360px]">

              <div className="flex gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-400/[0.1]">
                  <Bot
                    size={17}
                    className="text-violet-400"
                  />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="text-xs font-medium text-violet-300">
                    You
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {message}
                  </p>

                </div>

              </div>

              <div className="mt-8 rounded-2xl border border-violet-400/10 bg-violet-400/[0.035] p-4">

                <div className="flex items-center gap-2">

                  <Sparkles
                    size={15}
                    className="text-violet-400"
                  />

                  <p className="text-xs font-medium text-violet-300">
                    Atlas AI
                  </p>

                </div>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  AI responses will be connected to your
                  workspace knowledge in the next stage.
                </p>

              </div>

            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="mt-5"
          >
            <div className="relative">

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Ask Atlas anything..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black/[0.12] px-4 py-4 pb-14 text-sm leading-6 text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-400/25 focus:bg-black/[0.18] focus:ring-1 focus:ring-violet-400/10"
              />

              <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] text-slate-600">
                <Zap size={12} />
                <span>Atlas AI</span>
              </div>

              <button
                type="submit"
                disabled={!message.trim()}
                aria-label="Send message"
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400 text-[#10091c] transition-all hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send
                  size={16}
                  strokeWidth={2}
                />
              </button>

            </div>
          </form>

        </div>
      </section>

      {/* Suggestions */}
      <section>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">
            Try asking Atlas
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Start with one of these workspace prompts
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">

          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;

            return (
              <button
                key={suggestion.title}
                type="button"
                onClick={() =>
                  useSuggestion(suggestion.title)
                }
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/20 hover:bg-white/[0.035]"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.035]">
                  <Icon
                    size={16}
                    className="text-slate-500 transition-colors group-hover:text-violet-400"
                  />
                </div>

                <p className="mt-4 text-xs font-medium text-slate-300 group-hover:text-white">
                  {suggestion.title}
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-600">
                  {suggestion.description}
                </p>

              </button>
            );
          })}

        </div>

      </section>

    </div>
  );
}