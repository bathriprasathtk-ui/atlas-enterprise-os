"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useState } from "react";

const events = [
  {
    title: "Atlas Team Sync",
    time: "10:00 AM",
    type: "Meeting",
  },
  {
    title: "Project Review",
    time: "1:30 PM",
    type: "Review",
  },
  {
    title: "AI Architecture Planning",
    time: "4:00 PM",
    type: "Planning",
  },
];

export default function CalendarPage() {
  const [month] = useState("August 2026");

  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">
            Workspace
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Calendar
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage meetings, deadlines, and workspace events.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-[#06101b] transition hover:bg-cyan-300"
        >
          <Plus size={16} />
          New Event
        </button>
      </div>

      {/* Calendar */}
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
                <CalendarDays
                  size={18}
                  className="text-cyan-400"
                />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white">
                  {month}
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Monthly view
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="mt-6 grid grid-cols-7 border-b border-white/[0.06] pb-3">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium uppercase tracking-wider text-slate-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="mt-2 grid grid-cols-7">
            {days.map((day) => {
              const isToday = day === 24;
              const hasEvent = [24, 26, 28].includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  className={`relative flex min-h-[72px] flex-col items-center border-b border-r border-white/[0.04] p-2 text-xs transition hover:bg-white/[0.025] ${
                    isToday
                      ? "bg-cyan-400/[0.04]"
                      : ""
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      isToday
                        ? "bg-cyan-400 font-semibold text-[#06101b]"
                        : "text-slate-400"
                    }`}
                  >
                    {day}
                  </span>

                  {hasEvent && (
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Upcoming Events
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Your next scheduled activities
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {events.map((event) => (
              <div
                key={event.title}
                className="rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition hover:border-cyan-400/10 hover:bg-white/[0.025]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300">
                      {event.title}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      {event.type}
                    </p>

                    <p className="mt-2 text-[11px] text-cyan-400">
                      {event.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}