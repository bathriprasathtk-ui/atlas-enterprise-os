"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getTasks, type Task } from "@/lib/tasks";

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function priorityDotClass(priority: Task["priority"]): string {
  if (priority === "high") {
    return "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]";
  }

  if (priority === "medium") {
    return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
  }

  return "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]";
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    null
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getTasks()
      .then((rows) => {
        if (!cancelled) {
          setTasks(rows);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Your schedule could not be loaded."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Tasks grouped by due date (YYYY-MM-DD). */
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of tasks) {
      if (!task.due_date) {
        continue;
      }

      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }

    return map;
  }, [tasks]);

  /* Month grid (6 rows x 7 days, including leading blanks). */
  const monthDays = useMemo(() => {
    const firstWeekday = new Date(
      viewYear,
      viewMonth,
      1
    ).getDay();
    const daysInMonth = new Date(
      viewYear,
      viewMonth + 1,
      0
    ).getDate();

    const cells: (number | null)[] = Array.from(
      { length: firstWeekday },
      () => null
    );

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayString = toDateString(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  /* Upcoming: today onward, from the whole task list. */
  const upcoming = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.due_date &&
          task.due_date >= todayString &&
          task.status !== "done"
      )
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
      .slice(0, 8);
  }, [tasks, todayString]);

  const selectedTasks = selectedDate
    ? (tasksByDate.get(selectedDate) ?? [])
    : [];

  function changeMonth(delta: number) {
    setSelectedDate(null);
    setViewMonth((current) => {
      const next = current + delta;

      if (next < 0) {
        setViewYear((year) => year - 1);
        return 11;
      }

      if (next > 11) {
        setViewYear((year) => year + 1);
        return 0;
      }

      return next;
    });
  }

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
            Task due dates across your workspace.
          </p>
        </div>

        <p className="text-xs text-slate-600">
          Deadlines come from your tasks — set one on the
          Tasks page.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300"
        >
          {error}
        </div>
      ) : null}

      {/* Calendar */}
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6 xl:col-span-2">
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
                  {monthLabel}
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Monthly view
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="mt-6 grid grid-cols-7 border-b border-white/[0.06] pb-3">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium uppercase tracking-wider text-slate-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Loading schedule…
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-7">
              {monthDays.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`blank-${index}`}
                      className="min-h-[72px] border-b border-r border-white/[0.04]"
                    />
                  );
                }

                const dateString = toDateString(
                  viewYear,
                  viewMonth,
                  day
                );
                const isToday = dateString === todayString;
                const isSelected =
                  dateString === selectedDate;
                const dayTasks = tasksByDate.get(dateString);

                return (
                  <button
                    key={dateString}
                    type="button"
                    onClick={() =>
                      setSelectedDate(
                        isSelected ? null : dateString
                      )
                    }
                    aria-label={`${dateString}${dayTasks ? `, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"} due` : ""}`}
                    className={`relative flex min-h-[72px] flex-col items-center border-b border-r border-white/[0.04] p-2 text-xs transition hover:bg-white/[0.025] ${
                      isSelected
                        ? "bg-cyan-400/[0.07]"
                        : isToday
                          ? "bg-cyan-400/[0.04]"
                          : ""
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        isToday
                          ? "bg-cyan-400 font-semibold text-[#06101b]"
                          : isSelected
                            ? "border border-cyan-400/40 text-white"
                            : "text-slate-400"
                      }`}
                    >
                      {day}
                    </span>

                    {dayTasks && dayTasks.length > 0 ? (
                      <span className="mt-2 flex flex-wrap items-center justify-center gap-1">
                        {dayTasks.slice(0, 3).map((task) => (
                          <span
                            key={task.id}
                            className={`h-1.5 w-1.5 rounded-full ${priorityDotClass(task.priority)}`}
                          />
                        ))}

                        {dayTasks.length > 3 ? (
                          <span className="text-[9px] text-slate-600">
                            +{dayTasks.length - 3}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected day detail */}
          {selectedDate ? (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {new Date(
                  `${selectedDate}T00:00:00`
                ).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>

              <div className="mt-3 space-y-2">
                {selectedTasks.length === 0 ? (
                  <p className="text-xs text-slate-600">
                    No tasks due on this day.
                  </p>
                ) : (
                  selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${priorityDotClass(task.priority)}`}
                      />

                      <p className="min-w-0 flex-1 truncate text-xs text-slate-300">
                        {task.title}
                      </p>

                      <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] capitalize text-slate-400">
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Upcoming */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Upcoming Deadlines
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Open tasks with a due date
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-[11px] text-slate-600">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </div>
            ) : upcoming.length === 0 ? (
              <p className="py-6 text-center text-[11px] leading-5 text-slate-600">
                No upcoming deadlines. Tasks with due dates
                will appear here.
              </p>
            ) : (
              upcoming.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition hover:border-cyan-400/10 hover:bg-white/[0.025]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDotClass(task.priority)}`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-300">
                        {task.title}
                      </p>

                      <p className="mt-1 text-[10px] capitalize text-slate-600">
                        {task.priority} priority ·{" "}
                        {task.status.replace("_", " ")}
                      </p>

                      <p className="mt-2 text-[11px] text-cyan-400">
                        {new Date(
                          `${task.due_date}T00:00:00`
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
