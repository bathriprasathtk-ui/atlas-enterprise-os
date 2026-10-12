"use client";

import { useEffect, useState } from "react";

import {
  FolderKanban,
  FileText,
  ListTodo,
  MessageSquare,
  Loader2,
} from "lucide-react";

import StatsCard from "./StatsCard";
import FadeIn from "@/components/animations/FadeIn";

import { getProjects } from "@/lib/projects";
import { getTasks } from "@/lib/tasks";
import { getDocuments } from "@/lib/documents";
import { listConversations } from "@/lib/aiConversations";

type Stats = {
  activeProjects: number;
  openTasks: number;
  documents: number;
  aiRequests: number;
};

export default function StatsGrid() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [projects, tasks, documents, conversations] =
          await Promise.all([
            getProjects(),
            getTasks(),
            getDocuments(),
            listConversations(100),
          ]);

        if (cancelled) {
          return;
        }

        setStats({
          activeProjects: projects.filter(
            (project) => project.status !== "Completed"
          ).length,
          openTasks: tasks.filter(
            (task) => task.status !== "done"
          ).length,
          documents: documents.length,
          aiRequests: conversations.length,
        });
      } catch {
        if (!cancelled) {
          setError("unavailable");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 text-xs text-slate-500"
      >
        Your workspace statistics could not be loaded right now.
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-8 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Loading workspace statistics…
      </div>
    );
  }

  const cards: {
    title: string;
    value: number;
    hint: string;
    icon: typeof FolderKanban;
  }[] = [
    {
      title: "Active Projects",
      value: stats.activeProjects,
      hint: "Projects not yet completed",
      icon: FolderKanban,
    },
    {
      title: "Open Tasks",
      value: stats.openTasks,
      hint: "To do + in progress",
      icon: ListTodo,
    },
    {
      title: "Knowledge Docs",
      value: stats.documents,
      hint: "Documents in your library",
      icon: FileText,
    },
    {
      title: "AI Conversations",
      value: stats.aiRequests,
      hint: "Saved assistant exchanges",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <FadeIn
          key={card.title}
          delay={0.1 * (index + 1)}
          className="h-full"
        >
          <StatsCard
            title={card.title}
            value={String(card.value)}
            hint={card.hint}
            icon={card.icon}
          />
        </FadeIn>
      ))}
    </div>
  );
}
