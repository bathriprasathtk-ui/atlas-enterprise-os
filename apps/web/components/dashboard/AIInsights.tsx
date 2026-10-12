"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import {
  ArrowRight,
  CalendarClock,
  BrainCircuit,
  FileText,
  ListTodo,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getTasks } from "@/lib/tasks";
import { getDocuments } from "@/lib/documents";

type Insight = {
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Insights are DERIVED from real workspace data (tasks +
 * documents owned by the signed-in user). Nothing here is
 * fabricated — when there is nothing to say, the empty
 * state is shown instead.
 */
function buildInsights(
  tasks: Awaited<ReturnType<typeof getTasks>>,
  documents: Awaited<ReturnType<typeof getDocuments>>
): Insight[] {
  const insights: Insight[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const soon = new Date(today);
  soon.setDate(soon.getDate() + 3);

  const overdue = tasks.filter((task) => {
    if (!task.due_date || task.status === "done") {
      return false;
    }

    const due = new Date(`${task.due_date}T00:00:00`);

    return !Number.isNaN(due.getTime()) && due < today;
  });

  const dueSoon = tasks.filter((task) => {
    if (!task.due_date || task.status === "done") {
      return false;
    }

    const due = new Date(`${task.due_date}T00:00:00`);

    return !Number.isNaN(due.getTime()) && due >= today && due <= soon;
  });

  const openTasks = tasks.filter(
    (task) => task.status !== "done"
  );

  if (overdue.length > 0) {
    insights.push({
      title: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`,
      description:
        "These tasks are past their due date and still open.",
      icon: CalendarClock,
    });
  }

  if (dueSoon.length > 0) {
    insights.push({
      title: `${dueSoon.length} task${dueSoon.length === 1 ? "" : "s"} due within 3 days`,
      description: "Upcoming deadlines in the next 72 hours.",
      icon: CalendarClock,
    });
  }

  if (insights.length === 0 && openTasks.length > 0) {
    insights.push({
      title: `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`,
      description:
        "You have no overdue or near-term deadlines right now.",
      icon: ListTodo,
    });
  }

  if (documents.length === 0) {
    insights.push({
      title: "No documents indexed yet",
      description:
        "Upload documents so the assistant can ground answers in your knowledge base.",
      icon: FileText,
    });
  } else {
    insights.push({
      title: `${documents.length} document${documents.length === 1 ? "" : "s"} available for grounding`,
      description:
        "Ask the assistant anything about your uploaded knowledge base.",
      icon: FileText,
    });
  }

  return insights.slice(0, 3);
}

export default function AIInsights() {
  const [insights, setInsights] = useState<Insight[] | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([getTasks(), getDocuments()])
      .then(([tasks, documents]) => {
        if (!cancelled) {
          setInsights(buildInsights(tasks, documents));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInsights([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0B1020]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08]">
            <BrainCircuit
              size={20}
              className="text-violet-400"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Insights
              </h2>

              <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                From your data
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Derived from your tasks and documents
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        {insights === null ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Analyzing your workspace…
          </div>
        ) : insights.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-600">
            Nothing to highlight yet. Add tasks or documents
            and insights will appear here.
          </div>
        ) : (
          insights.map((insight) => {
            const Icon = insight.icon;

            return (
              <div
                key={insight.title}
                className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.03]"
              >
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                    <Icon
                      size={17}
                      className="text-cyan-400"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-slate-200">
                      {insight.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <Link
        href="/workspace/ai"
        className="group mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3 text-sm text-slate-400 transition-all hover:border-cyan-400/20 hover:bg-white/[0.03] hover:text-white"
      >
        <span>Ask the assistant</span>

        <ArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-1"
        />
      </Link>
    </section>
  );
}
