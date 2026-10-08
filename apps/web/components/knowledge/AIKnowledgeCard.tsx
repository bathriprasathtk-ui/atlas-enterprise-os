"use client";

import {
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  Bot,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

export default function AIKnowledgeCard() {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    setLoading(true);
    setAskedQuestion(trimmedQuestion);
    setAnswer("");
    setError("");

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      setAnswer(data.answer || "Atlas could not generate an answer.");
    } catch (error) {
      console.error("Atlas AI request failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to Atlas AI."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      handleAskAI();
    }
  };

  return (
    <section
      className="
        rounded-3xl
        border
        border-cyan-500/20
        bg-gradient-to-r
        from-cyan-500/10
        via-blue-500/10
        to-violet-500/10
        p-6
        sm:p-8
      "
    >
      {/* HEADER */}

      <div className="flex items-start gap-4">
        <div
          className="
            flex
            shrink-0
            items-center
            justify-center
            rounded-2xl
            bg-cyan-500/20
            p-4
          "
        >
          <Sparkles
            className="text-cyan-400"
            size={30}
            strokeWidth={1.8}
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Atlas AI Knowledge
          </h2>

          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Ask Atlas anything from your uploaded documents.
          </p>
        </div>
      </div>

      {/* INPUT */}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MessageSquare
            size={18}
            strokeWidth={1.7}
            className="
              pointer-events-none
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-slate-500
            "
          />

          <input
            type="text"
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask Atlas about your documents..."
            disabled={loading}
            className="
              h-14
              w-full
              rounded-xl
              border
              border-white/10
              bg-black/10
              pl-12
              pr-5
              text-sm
              text-white
              outline-none
              transition-all
              placeholder:text-slate-500
              hover:border-white/15
              focus:border-cyan-400/50
              focus:bg-white/5
              focus:ring-2
              focus:ring-cyan-400/10
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          />
        </div>

        {/* ASK AI BUTTON */}

        <button
          type="button"
          onClick={handleAskAI}
          disabled={!question.trim() || loading}
          className="
            flex
            h-14
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-cyan-500
            px-7
            font-semibold
            text-black
            transition-all
            duration-200
            hover:bg-cyan-400
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {loading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Thinking...
            </>
          ) : (
            <>
              <Send
                size={17}
                strokeWidth={2}
              />

              Ask AI
            </>
          )}
        </button>
      </div>

      {/* QUESTION */}

      {askedQuestion && (
        <div
          className="
            mt-5
            rounded-2xl
            border
            border-white/[0.07]
            bg-black/[0.12]
            p-4
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                mt-0.5
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-cyan-400/10
              "
            >
              <MessageSquare
                size={15}
                className="text-cyan-400"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-400">
                Your question
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-300">
                {askedQuestion}
              </p>
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div
              className="
                mt-4
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.02]
                p-4
              "
            >
              <Loader2
                size={18}
                className="animate-spin text-cyan-400"
              />

              <div>
                <p className="text-sm font-medium text-white">
                  Atlas AI is thinking...
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Processing your question.
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}

          {error && !loading && (
            <div
              className="
                mt-4
                flex
                items-start
                gap-3
                rounded-xl
                border
                border-red-400/10
                bg-red-400/[0.04]
                p-4
              "
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-400"
              />

              <div>
                <p className="text-sm font-medium text-red-300">
                  Atlas AI error
                </p>

                <p className="mt-1 text-xs leading-5 text-red-300/70">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* AI ANSWER */}

          {answer && !loading && !error && (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-cyan-400/10
                bg-cyan-400/[0.035]
                p-4
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-cyan-400/10
                  "
                >
                  <Bot
                    size={16}
                    className="text-cyan-400"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-400">
                    Atlas AI
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {answer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HINT */}

      {!askedQuestion && (
        <p className="mt-4 text-xs text-slate-600">
          Press Enter or click Ask AI to send your question.
        </p>
      )}
    </section>
  );
}