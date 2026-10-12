"use client";

import { useEffect, useState } from "react";

import FadeIn from "@/components/animations/FadeIn";
import { Sparkles } from "lucide-react";

import {
  getCurrentUser,
  type CurrentUser,
} from "@/lib/auth";

export default function DashboardHeader() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FadeIn>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles
              size={15}
              strokeWidth={1.8}
              className="text-cyan-400"
            />

            <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-400">
              Organization Overview
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Welcome back
            {currentUser?.displayName
              ? `, ${currentUser.displayName}`
              : ""}
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Here&apos;s what&apos;s happening across your organization today.
          </p>
        </div>


      </div>
    </FadeIn>
  );
}
